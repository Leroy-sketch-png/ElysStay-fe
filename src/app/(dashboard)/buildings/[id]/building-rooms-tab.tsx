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
import { ApiError } from '@/lib/api-client'
import { ROOM_STATUS_OPTIONS, canToggleRoomStatus, getNextManualRoomStatus } from '@/lib/domain-constants'
import { formatCurrency } from '@/lib/utils'
import { roomKeys, fetchBuildingRooms, deleteRoom, changeRoomStatus } from '@/lib/queries/rooms'
import { buildingKeys } from '@/lib/queries/buildings'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
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

  const { data, isLoading, isError } = useQuery({
    queryKey: roomKeys.byBuilding(buildingId, filters),
    queryFn: () => fetchBuildingRooms(buildingId, filters),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => {
      toast.success('Đã xóa phòng')
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: buildingKeys.detail(buildingId) })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      setDeleteTarget(null)
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('Không thể xóa phòng', 'Phòng có hợp đồng đang hoạt động.')
      } else {
        toast.error('Xóa phòng thất bại', error.message)
      }
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Available' | 'Maintenance' }) =>
      changeRoomStatus(id, { status }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái phòng')
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: buildingKeys.detail(buildingId) })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
    },
    onError: (error: Error) => {
      toast.error('Đổi trạng thái thất bại', error.message)
    },
  })

  const columns: Column<RoomDto>[] = [
    {
      key: 'roomNumber',
      header: 'Phòng',
      render: (row) => <span className='font-medium'>{row.roomNumber}</span>,
    },
    {
      key: 'floor',
      header: 'Tầng',
      render: (row) => row.floor,
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'area',
      header: 'Diện tích',
      render: (row) => `${row.area} m²`,
    },
    {
      key: 'price',
      header: 'Giá',
      render: (row) => formatCurrency(row.price),
    },
    {
      key: 'maxOccupants',
      header: 'Tối đa',
      render: (row) => `${row.maxOccupants} người`,
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <RoomStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className='flex items-center justify-end gap-1'>
          {canToggleRoomStatus(row.status) && (
            <Button
              variant='ghost'
              size='sm'
              onClick={(e) => {
                e.stopPropagation()
                statusMutation.mutate({
                  id: row.id,
                  status: getNextManualRoomStatus(row.status)!,
                })
              }}
              disabled={statusMutation.isPending}
            >
              {row.status === 'Available' ? 'Đặt bảo trì' : 'Đặt trống'}
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
            Xóa
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
          {ROOM_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>

        <Select
          value={floorFilter}
          onChange={(e) => { setFloorFilter(e.target.value); setPage(1) }}
          className='w-36'
        >
          <option value=''>Tất cả tầng</option>
          {Array.from({ length: totalFloors }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              Tầng {i + 1}
            </option>
          ))}
        </Select>

        <div className='flex-1' />

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='size-4' />
          Thêm phòng
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/rooms/${row.id}`)}
        emptyMessage={isError ? 'Đã xảy ra lỗi khi tải danh sách phòng.' : 'Chưa có phòng nào trong tòa nhà.'}
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
        title='Xóa phòng'
        description={`Bạn có chắc muốn xóa phòng "${deleteTarget?.roomNumber}"?`}
        confirmLabel='Xóa'
        variant='destructive'
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
