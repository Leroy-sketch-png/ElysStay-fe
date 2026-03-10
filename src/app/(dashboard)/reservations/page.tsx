'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  CalendarClock,
  Building2,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/EmptyState'
import { ReservationStatusBadge } from '@/components/ui/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  reservationKeys,
  fetchReservations,
  type ReservationFilters,
} from '@/lib/queries/reservations'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import type { ReservationDto, ReservationStatus } from '@/types/api'
import { CreateReservationDialog } from './create-reservation-dialog'
import { ChangeReservationStatusDialog } from './change-status-dialog'

// ─── Status filter options ──────────────────────────────

const STATUS_OPTIONS: { label: string; value: ReservationStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Confirmed', value: 'Confirmed' },
  { label: 'Converted', value: 'Converted' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'Expired', value: 'Expired' },
]

// ─── Page ───────────────────────────────────────────────

export default function ReservationsPage() {
  // ─── State ─────────────────────────────────────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [statusDialogReservation, setStatusDialogReservation] = useState<ReservationDto | null>(null)

  // ─── Filters ───────────────────────────────────────────
  const filters: ReservationFilters = useMemo(
    () => ({
      buildingId: selectedBuildingId || undefined,
      status: statusFilter || undefined,
      page,
      pageSize,
    }),
    [selectedBuildingId, statusFilter, page, pageSize],
  )

  // ─── Queries ───────────────────────────────────────────
  const { data: buildings } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: 100 }),
  })

  const { data: reservationsData, isLoading } = useQuery({
    queryKey: reservationKeys.list(filters),
    queryFn: () => fetchReservations(filters),
  })

  const reservations = reservationsData?.data ?? []
  const pagination = reservationsData?.pagination

  // ─── Helpers ───────────────────────────────────────────
  function isExpiringSoon(reservation: ReservationDto): boolean {
    if (reservation.status !== 'Pending') return false
    const expiresAt = new Date(reservation.expiresAt)
    const now = new Date()
    const daysLeft = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysLeft <= 2 && daysLeft > 0
  }

  function isExpired(reservation: ReservationDto): boolean {
    if (reservation.status !== 'Pending') return false
    return new Date(reservation.expiresAt) < new Date()
  }

  // ─── Columns ───────────────────────────────────────────
  const columns: Column<ReservationDto>[] = [
    {
      key: 'tenantName',
      header: 'Tenant',
      render: (r) => (
        <div>
          <p className='font-medium'>{r.tenantName ?? '—'}</p>
          <p className='text-xs text-muted-foreground'>
            {r.buildingName} — Room {r.roomNumber}
          </p>
        </div>
      ),
    },
    {
      key: 'depositAmount',
      header: 'Deposit',
      render: (r) => <span className='font-medium'>{formatCurrency(r.depositAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <ReservationStatusBadge status={r.status} />,
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (r) => {
        const expiring = isExpiringSoon(r)
        const expired = isExpired(r)
        return (
          <span className={expired ? 'text-destructive font-medium' : expiring ? 'text-amber-600 font-medium' : ''}>
            {formatDate(r.expiresAt)}
            {expired && ' (expired)'}
            {expiring && ' (soon)'}
          </span>
        )
      },
    },
    {
      key: 'refund',
      header: 'Refund',
      render: (r) =>
        r.refundAmount != null ? (
          <span className='text-sm'>{formatCurrency(r.refundAmount)}</span>
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (r) => <span className='text-sm text-muted-foreground'>{formatDate(r.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => {
        const canAct = r.status === 'Pending' || r.status === 'Confirmed'
        if (!canAct) return null
        return (
          <Button
            variant='outline'
            size='sm'
            onClick={(e) => {
              e.stopPropagation()
              setStatusDialogReservation(r)
            }}
          >
            Manage
          </Button>
        )
      },
      className: 'w-24',
    },
  ]

  // ─── Render ────────────────────────────────────────────
  return (
    <PageContainer
      title='Reservations'
      description='Manage room reservation pipeline'
      actions={
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className='mr-2 size-4' />
          New Reservation
        </Button>
      }
    >
      {/* Filters */}
      <div className='flex flex-wrap items-end gap-4'>
        <div className='w-56'>
          <Select
            value={selectedBuildingId}
            onChange={(e) => {
              setSelectedBuildingId(e.target.value)
              setPage(1)
            }}
          >
            <option value=''>All buildings</option>
            {buildings?.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div className='w-44'>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={reservations}
        rowKey={(r) => r.id}
        loading={isLoading}
        emptyMessage='No reservations found.'
        emptyIcon={<CalendarClock className='size-6' />}
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      )}

      {/* Dialogs */}
      <CreateReservationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {statusDialogReservation && (
        <ChangeReservationStatusDialog
          reservation={statusDialogReservation}
          open={!!statusDialogReservation}
          onOpenChange={(open) => {
            if (!open) setStatusDialogReservation(null)
          }}
        />
      )}
    </PageContainer>
  )
}
