'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  CalendarClock,
  Building2,
  AlertTriangle,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/EmptyState'
import { ReservationStatusBadge } from '@/components/ui/status-badge'
import { RESERVATION_STATUS_OPTIONS, canManageReservation, RESERVATION_NEXT_ACTION, DROPDOWN_PAGE_SIZE, DEFAULT_TABLE_PAGE_SIZE } from '@/lib/domain-constants'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  reservationKeys,
  fetchReservations,
  type ReservationFilters,
} from '@/lib/queries/reservations'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import type { ReservationDto } from '@/types/api'
import { CreateReservationDialog } from './create-reservation-dialog'
import { ChangeReservationStatusDialog } from './change-status-dialog'

// ─── Page ───────────────────────────────────────────────

export default function ReservationsPage() {
  const queryClient = useQueryClient()
  // ─── State ─────────────────────────────────────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [statusDialogReservation, setStatusDialogReservation] = useState<ReservationDto | null>(null)
  const hasActiveFilters = Boolean(selectedBuildingId || statusFilter)

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
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  const { data: reservationsData, isLoading, isError, error } = useQuery({
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

  function clearFilters() {
    setSelectedBuildingId('')
    setStatusFilter('')
    setPage(1)
  }

  // ─── Columns ───────────────────────────────────────────
  const columns: Column<ReservationDto>[] = [
    {
      key: 'tenantName',
      header: 'Khách thuê',
      render: (r) => (
        <div>
          <p className='font-medium'>{r.tenantName ?? '—'}</p>
          <p className='text-xs text-muted-foreground'>
            {r.buildingName} — Phòng {r.roomNumber}
          </p>
        </div>
      ),
    },
    {
      key: 'depositAmount',
      header: 'Tiền cọc',
      render: (r) => <span className='font-medium'>{formatCurrency(r.depositAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (r) => {
        const nextAction = RESERVATION_NEXT_ACTION[r.status as keyof typeof RESERVATION_NEXT_ACTION]
        return (
          <div>
            <ReservationStatusBadge status={r.status} />
            {nextAction && (
              <p className='mt-0.5 text-xs text-muted-foreground'>{nextAction}</p>
            )}
          </div>
        )
      },
    },
    {
      key: 'expiresAt',
      header: 'Hết hạn',
      render: (r) => {
        const expiring = isExpiringSoon(r)
        const expired = isExpired(r)
        return (
          <span className={expired ? 'text-destructive font-medium' : expiring ? 'text-warning font-medium' : ''}>
            {formatDateTime(r.expiresAt)}
            {expired && ' (đã hết hạn)'}
            {expiring && ' (sắp hết)'}
          </span>
        )
      },
    },
    {
      key: 'refund',
      header: 'Hoàn tiền',
      render: (r) =>
        r.refundAmount != null ? (
          <span className='text-sm'>{formatCurrency(r.refundAmount)}</span>
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      render: (r) => <span className='text-sm text-muted-foreground'>{formatDate(r.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => {
        const canAct = canManageReservation(r.status) && !isExpired(r)
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
            Quản lý
          </Button>
        )
      },
      className: 'w-24',
    },
  ]

  // ─── No Buildings Prerequisite ─────────────────────────
  if (buildings && (buildings.data ?? []).length === 0) {
    return (
      <PageTransition>
      <PageContainer title='Đặt cọc' description='Quản lý quy trình đặt cọc phòng'>
        <EmptyState
          icon={<Building2 className='size-12' />}
          title='Chưa có tòa nhà'
          description='Thêm tòa nhà đầu tiên để bắt đầu quản lý đặt cọc.'
          actionLabel='Đến trang Tòa nhà'
          actionHref='/buildings'
        />
      </PageContainer>
      </PageTransition>
    )
  }

  // ─── Render ────────────────────────────────────────────
  return (
    <PageTransition>
    <PageContainer
      title='Đặt cọc'
      description='Quản lý quy trình đặt cọc phòng'
      actions={
        <div className='flex items-center gap-2'>
          {hasActiveFilters && (
            <Button variant='outline' onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
          )}
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className='size-4' />
            Đặt cọc mới
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <div className='mb-6 flex flex-wrap items-end gap-4'>
        <div className='w-56'>
          <Select
            value={selectedBuildingId}
            onChange={(e) => {
              setSelectedBuildingId(e.target.value)
              setPage(1)
            }}
          >
            <option value=''>Tất cả tòa nhà</option>
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
            {RESERVATION_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isError ? (
        <EmptyState
          icon={<AlertTriangle className='size-6 text-destructive' />}
          title='Không thể tải đặt cọc'
          description={error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn khi tải đặt cọc.'}
          actionLabel='Thử lại'
          onAction={() => queryClient.invalidateQueries({ queryKey: reservationKeys.all })}
        />
      ) : !isLoading && reservations.length === 0 && !hasActiveFilters ? (
        <EmptyState
          icon={<CalendarClock className='size-8' />}
          title='Chưa có đặt cọc nào'
          description='Tạo đặt cọc đầu tiên để bắt đầu quy trình tiếp nhận khách thuê.'
          actionLabel='Đặt cọc mới'
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={reservations}
          rowKey={(r) => r.id}
          loading={isLoading}
          emptyMessage={hasActiveFilters ? 'Không có đặt cọc phù hợp với bộ lọc.' : 'Chưa có đặt cọc nào.'}
          emptyIcon={<CalendarClock className='size-6' />}
        />
      )}

      {/* Pagination */}
      {!isError && pagination && pagination.totalPages > 1 && (
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
    </PageTransition>
  )
}
