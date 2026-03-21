'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, DoorOpen, Building2, Pencil, Layers, Users2, Ruler,
  Banknote, Settings, ToggleLeft, FileText, User,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RoomStatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { ApiError } from '@/lib/api-client'
import { getNextManualRoomStatus, canToggleRoomStatus } from '@/lib/domain-constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { roomKeys, fetchRoomById, changeRoomStatus, deleteRoom } from '@/lib/queries/rooms'
import { buildingKeys, fetchBuildingById } from '@/lib/queries/buildings'
import { contractKeys, fetchContracts } from '@/lib/queries/contracts'
import { userKeys } from '@/lib/queries/users'
import { RoomFormDialog } from '../room-form-dialog'
import { RoomServicesTab } from './room-services-tab'

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('info')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: room, isLoading, error } = useQuery({
    queryKey: roomKeys.detail(id),
    queryFn: () => fetchRoomById(id),
    enabled: !!id,
  })

  // Fetch building to get totalFloors for the edit dialog
  const { data: building } = useQuery({
    queryKey: buildingKeys.detail(room?.buildingId ?? ''),
    queryFn: () => fetchBuildingById(room!.buildingId),
    enabled: !!room?.buildingId,
  })

  // Fetch active contract for this room (current occupant)
  const { data: activeContracts } = useQuery({
    queryKey: contractKeys.list({ roomId: id, status: 'Active', pageSize: 1 }),
    queryFn: () => fetchContracts({ roomId: id, status: 'Active', pageSize: 1 }),
    enabled: !!id && room?.status === 'Occupied',
  })
  const activeContract = activeContracts?.data?.[0]

  const statusMutation = useMutation({
    mutationFn: (status: 'Available' | 'Maintenance') => changeRoomStatus(id, { status }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái phòng')
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
    },
    onError: (error: Error) => toast.error('Đổi trạng thái thất bại', error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoom(id),
    onSuccess: () => {
      toast.success('Đã xóa phòng')
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      if (room?.buildingId) {
        queryClient.invalidateQueries({ queryKey: buildingKeys.detail(room.buildingId) })
      }
      router.push('/rooms')
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('Không thể xóa phòng', 'Phòng có hợp đồng hoặc đặt cọc đang hoạt động.')
      } else {
        toast.error('Xóa phòng thất bại', error.message)
      }
      setDeleteOpen(false)
    },
  })

  if (isLoading) {
    return (
      <PageContainer>
        <div className='space-y-6'>
          <Skeleton className='h-8 w-64' />
          <div className='grid gap-4 sm:grid-cols-3'>
            <Skeleton className='h-24 rounded-lg' />
            <Skeleton className='h-24 rounded-lg' />
            <Skeleton className='h-24 rounded-lg' />
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error || !room) {
    return (
      <PageContainer>
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <DoorOpen className='size-12 text-muted-foreground mb-4' />
          <h2 className='text-lg font-semibold'>Không tìm thấy phòng</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Phòng này có thể đã bị xóa hoặc bạn không có quyền truy cập.
          </p>
          <Button variant='outline' className='mt-4' onClick={() => router.push('/rooms')}>
            <ArrowLeft className='size-4' />
            Quay lại Phòng
          </Button>
        </div>
      </PageContainer>
    )
  }

  const canToggleStatus = canToggleRoomStatus(room.status)
  const toggleTarget = getNextManualRoomStatus(room.status)

  return (
    <PageContainer
      title={`Phòng ${room.roomNumber}`}
      description={room.buildingName ?? undefined}
      breadcrumbs={<Breadcrumbs items={[{ label: 'Phòng', href: '/rooms' }, { label: `Phòng ${room.roomNumber}` }]} />}
      actions={
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => router.push('/rooms')}>
            <ArrowLeft className='size-4' />
            Quay lại
          </Button>
          {canToggleStatus && (
            <Button
              variant='outline'
              onClick={() => toggleTarget && statusMutation.mutate(toggleTarget)}
              disabled={statusMutation.isPending}
            >
              <ToggleLeft className='size-4' />
              Đặt {toggleTarget === 'Maintenance' ? 'Bảo trì' : 'Trống'}
            </Button>
          )}
          <Button variant='outline' onClick={() => setEditOpen(true)} disabled={!building}>
            <Pencil className='size-4' />
            Sửa
          </Button>
          {(room.status === 'Available' || room.status === 'Maintenance') && (
            <Button variant='destructive' onClick={() => setDeleteOpen(true)}>
              Xóa
            </Button>
          )}
        </div>
      }
    >
      {/* Info Cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6'>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='rounded-lg bg-primary/10 p-2'>
              <DoorOpen className='size-4 text-primary' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Trạng thái</p>
              <RoomStatusBadge status={room.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='rounded-lg bg-info/10 p-2'>
              <Layers className='size-4 text-info' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Tầng</p>
              <p className='text-lg font-bold'>{room.floor}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='rounded-lg bg-accent p-2'>
              <Ruler className='size-4 text-accent-foreground' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Diện tích</p>
              <p className='text-lg font-bold'>{room.area} m²</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='rounded-lg bg-success/10 p-2'>
              <Banknote className='size-4 text-success' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Giá</p>
              <p className='text-lg font-bold'>{formatCurrency(room.price)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='rounded-lg bg-warning/10 p-2'>
              <Users2 className='size-4 text-warning' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Sức chứa</p>
              <p className='text-lg font-bold'>{room.maxOccupants}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {room.description && (
        <Card className='mb-6'>
          <CardContent className='p-5'>
            <p className='text-sm text-muted-foreground'>{room.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value='info'>
            <DoorOpen className='size-4 mr-1.5' />
            Chi tiết
          </TabsTrigger>
          <TabsTrigger value='services'>
            <Settings className='size-4 mr-1.5' />
            Dịch vụ
          </TabsTrigger>
        </TabsList>

        <TabsContent value='info'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Thông tin phòng</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <dt className='text-muted-foreground'>Số phòng</dt>
                  <dd className='font-medium'>{room.roomNumber}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Tòa nhà</dt>
                  <dd className='font-medium'>
                    <button
                      type='button'
                      className='text-primary hover:underline'
                      onClick={() => router.push(`/buildings/${room.buildingId}`)}
                    >
                      {room.buildingName ?? 'Xem tòa nhà'}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Tầng</dt>
                  <dd className='font-medium'>{room.floor}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Diện tích</dt>
                  <dd className='font-medium'>{room.area} m²</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Giá thuê/tháng</dt>
                  <dd className='font-medium'>{formatCurrency(room.price)}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Sức chứa tối đa</dt>
                  <dd className='font-medium'>{room.maxOccupants} người</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Ngày tạo</dt>
                  <dd className='font-medium'>{formatDate(room.createdAt)}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Cập nhật lần cuối</dt>
                  <dd className='font-medium'>{formatDate(room.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Current Occupant */}
          {activeContract && (
            <Card className='mt-4'>
              <CardHeader>
                <CardTitle className='text-base'>Khách thuê hiện tại</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <dt className='text-muted-foreground'>Khách thuê</dt>
                    <dd className='font-medium'>
                      <button
                        type='button'
                        className='text-primary hover:underline inline-flex items-center gap-1'
                        onClick={() => router.push(`/tenants/${activeContract.tenantUserId}`)}
                      >
                        <User className='size-3.5' />
                        {activeContract.tenantName}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>Hợp đồng</dt>
                    <dd className='font-medium'>
                      <button
                        type='button'
                        className='text-primary hover:underline inline-flex items-center gap-1'
                        onClick={() => router.push(`/contracts/${activeContract.id}`)}
                      >
                        <FileText className='size-3.5' />
                        Xem hợp đồng
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>Tiền thuê/tháng</dt>
                    <dd className='font-medium'>{formatCurrency(activeContract.monthlyRent)}</dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>Thời hạn</dt>
                    <dd className='font-medium'>
                      {formatDate(activeContract.startDate)} — {formatDate(activeContract.endDate)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
          {room.status === 'Occupied' && !activeContract && !activeContracts && (
            <Card className='mt-4'>
              <CardContent className='p-4'>
                <p className='text-sm text-muted-foreground'>Đang tải thông tin khách thuê...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='services'>
          <RoomServicesTab roomId={id} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog — totalFloors from building context */}
      <RoomFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode='edit'
        buildingId={room.buildingId}
        totalFloors={building?.totalFloors ?? room.floor}
        room={room}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Xóa phòng'
        description={`Xóa vĩnh viễn phòng "${room.roomNumber}"? Không thể hoàn tác.`}
        confirmLabel='Xóa phòng'
        variant='destructive'
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </PageContainer>
  )
}
