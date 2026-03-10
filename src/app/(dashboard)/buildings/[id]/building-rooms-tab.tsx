'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, DoorOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { RoomStatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { formatCurrency } from '@/lib/utils'
import { roomKeys, fetchBuildingRooms, deleteRoom, changeRoomStatus } from '@/lib/queries/rooms'
import { buildingKeys } from '@/lib/queries/buildings'
import type { RoomDto } from '@/types/api'
import { RoomFormDialog } from '../../rooms/room-form-dialog'

interface BuildingRoomsTabProps {
  buildingId: string
  totalFloors: number
}

export function BuildingRoomsTab({ buildingId, totalFloors }: BuildingRoomsTabProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [floorFilter, setFloorFilter] = useState<string>('')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RoomDto | null>(null)

  const filters = {
    status: statusFilter || undefined,
    floor: floorFilter ? Number(floorFilter) : undefined,
    page,
    pageSize,
  }

  const { data, isLoading } = useQuery({
    queryKey: roomKeys.byBuilding(buildingId, filters),
    queryFn: () => fetchBuildingRooms(buildingId, filters),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => {
      toast.success('Room deleted')
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: buildingKeys.detail(buildingId) })
      setDeleteTarget(null)
    },
    onError: (error: Error & { status?: number }) => {
      if ((error as { status?: number }).status === 409) {
        toast.error('Cannot delete room', 'Room has an active contract.')
      } else {
        toast.error('Failed to delete room', error.message)
      }
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Available' | 'Maintenance' }) =>
      changeRoomStatus(id, { status }),
    onSuccess: () => {
      toast.success('Room status updated')
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: buildingKeys.detail(buildingId) })
    },
    onError: (error: Error) => {
      toast.error('Failed to change status', error.message)
    },
  })

  const columns: Column<RoomDto>[] = [
    {
      key: 'roomNumber',
      header: 'Room',
      render: (row) => <span className='font-medium'>{row.roomNumber}</span>,
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
        <div className='flex items-center justify-end gap-1'>
          {(row.status === 'Available' || row.status === 'Maintenance') && (
            <Button
              variant='ghost'
              size='sm'
              onClick={(e) => {
                e.stopPropagation()
                statusMutation.mutate({
                  id: row.id,
                  status: row.status === 'Available' ? 'Maintenance' : 'Available',
                })
              }}
              disabled={statusMutation.isPending}
            >
              {row.status === 'Available' ? 'Set Maintenance' : 'Set Available'}
            </Button>
          )}
          <Button
            variant='ghost'
            size='sm'
            className='text-destructive hover:text-destructive'
            onClick={(e) => {
              e.stopPropagation()
              setDeleteTarget(row)
            }}
          >
            Delete
          </Button>
        </div>
      ),
      headerClassName: 'w-[200px]',
    },
  ]

  return (
    <div className='space-y-4'>
      {/* Filters + Actions */}
      <div className='flex flex-wrap items-center gap-3'>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className='w-40'
        >
          <option value=''>All statuses</option>
          <option value='Available'>Available</option>
          <option value='Booked'>Booked</option>
          <option value='Occupied'>Occupied</option>
          <option value='Maintenance'>Maintenance</option>
        </Select>

        <Select
          value={floorFilter}
          onChange={(e) => { setFloorFilter(e.target.value); setPage(1) }}
          className='w-36'
        >
          <option value=''>All floors</option>
          {Array.from({ length: totalFloors }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              Floor {i + 1}
            </option>
          ))}
        </Select>

        <div className='flex-1' />

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='size-4' />
          Add Room
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/rooms/${row.id}`)}
        emptyMessage='No rooms in this building yet.'
        emptyIcon={<DoorOpen className='size-10' />}
      />

      {data?.pagination && data.pagination.totalPages > 1 && (
        <Pagination
          page={data.pagination.page}
          pageSize={data.pagination.pageSize}
          totalItems={data.pagination.totalItems}
          totalPages={data.pagination.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      )}

      {/* Create Room Dialog */}
      <RoomFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode='create'
        buildingId={buildingId}
        totalFloors={totalFloors}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='Delete Room'
        description={`Are you sure you want to delete room "${deleteTarget?.roomNumber}"?`}
        confirmLabel='Delete'
        variant='destructive'
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
