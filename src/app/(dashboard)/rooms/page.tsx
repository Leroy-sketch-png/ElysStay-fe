'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DoorOpen, AlertTriangle } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { RoomStatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/EmptyState'
import { ROOM_STATUS_OPTIONS, DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import { formatCurrency } from '@/lib/utils'
import { roomKeys, fetchRooms, type RoomFilters } from '@/lib/queries/rooms'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import type { RoomDto } from '@/types/api'

export default function RoomsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [buildingFilter, setBuildingFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const hasActiveFilters = Boolean(buildingFilter || statusFilter)

  const filters: RoomFilters = {
    buildingId: buildingFilter || undefined,
    status: statusFilter || undefined,
    page,
    pageSize,
  }

  const { data, isLoading, error, isError } = useQuery({
    queryKey: roomKeys.list(filters),
    queryFn: () => fetchRooms(filters),
  })

  // Fetch buildings for the filter dropdown
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  const columns: Column<RoomDto>[] = [
    {
      key: 'roomNumber',
      header: 'Room',
      render: (row) => (
        <div>
          <p className='font-medium'>{row.roomNumber}</p>
          {row.buildingName && (
            <p className='text-xs text-muted-foreground'>{row.buildingName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'floor',
      header: 'Floor',
      render: (row) => row.floor,
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'area',
      header: 'Area',
      render: (row) => `${row.area} m²`,
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) => formatCurrency(row.price),
    },
    {
      key: 'maxOccupants',
      header: 'Max',
      render: (row) => `${row.maxOccupants} pax`,
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <RoomStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className='flex items-center justify-end'>
          <Button
            variant='ghost'
            size='sm'
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/rooms/${row.id}`)
            }}
          >
            View
          </Button>
        </div>
      ),
      headerClassName: 'w-[80px]',
    },
  ]

  return (
    <PageTransition>
    <PageContainer
      title='Rooms'
      description='All rooms across your buildings.'
      actions={hasActiveFilters ? (
        <Button
          variant='outline'
          onClick={() => {
            setBuildingFilter('')
            setStatusFilter('')
            setPage(1)
          }}
        >
          Clear Filters
        </Button>
      ) : undefined}
    >
      {/* Filters */}
      <div className='flex flex-wrap items-center gap-3 mb-4'>
        <Select
          value={buildingFilter}
          onChange={(e) => { setBuildingFilter(e.target.value); setPage(1) }}
          className='w-52'
        >
          <option value=''>All buildings</option>
          {(buildingsData?.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className='w-40'
        >
          {ROOM_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </div>

      {/* Error State */}
      {isError && (
        <EmptyState
          icon={<AlertTriangle className='size-8 text-destructive' />}
          title='Failed to load rooms'
          description={error?.message || 'An unexpected error occurred.'}
          actionLabel='Retry'
          onAction={() => queryClient.invalidateQueries({ queryKey: roomKeys.all })}
        />
      )}

      {/* Table */}
      {!isError && (
        <>
          {!isLoading && (buildingsData?.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<DoorOpen className='size-10' />}
              title='No buildings yet'
              description='Rooms belong to buildings. Create a building first so room inventory has a real home.'
              actionLabel='Go to Buildings'
              onAction={() => router.push('/buildings')}
            />
          ) : (
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/rooms/${row.id}`)}
            emptyMessage='No rooms found matching your filters.'
            emptyIcon={<DoorOpen className='size-10' />}
          />
          )}

          {(buildingsData?.data?.length ?? 0) > 0 && data?.pagination && data.pagination.totalPages > 1 && (
            <div className='mt-4'>
              <Pagination
                page={data.pagination.page}
                pageSize={data.pagination.pageSize}
                totalItems={data.pagination.totalItems}
                totalPages={data.pagination.totalPages}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
              />
            </div>
          )}
        </>
      )}
    </PageContainer>
    </PageTransition>
  )
}
