'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, DoorOpen, Building2, Pencil, Layers, Users2, Ruler,
  Banknote, Settings, ToggleLeft,
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
import { formatCurrency, formatDate } from '@/lib/utils'
import { roomKeys, fetchRoomById, changeRoomStatus, deleteRoom } from '@/lib/queries/rooms'
import { buildingKeys, fetchBuildingById } from '@/lib/queries/buildings'
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

  const statusMutation = useMutation({
    mutationFn: (status: 'Available' | 'Maintenance') => changeRoomStatus(id, { status }),
    onSuccess: () => {
      toast.success('Room status updated')
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
    },
    onError: (error: Error) => toast.error('Failed to change status', error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoom(id),
    onSuccess: () => {
      toast.success('Room deleted')
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      if (room?.buildingId) {
        queryClient.invalidateQueries({ queryKey: buildingKeys.detail(room.buildingId) })
      }
      router.push('/rooms')
    },
    onError: (error: Error & { status?: number }) => {
      if ((error as { status?: number }).status === 409) {
        toast.error('Cannot delete room', 'Room has an active contract or reservation.')
      } else {
        toast.error('Failed to delete room', error.message)
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
            <Skeleton className='h-24 rounded-xl' />
            <Skeleton className='h-24 rounded-xl' />
            <Skeleton className='h-24 rounded-xl' />
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
          <h2 className='text-lg font-semibold'>Room not found</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            This room may have been deleted or you don&apos;t have access.
          </p>
          <Button variant='outline' className='mt-4' onClick={() => router.push('/rooms')}>
            <ArrowLeft className='size-4' />
            Back to Rooms
          </Button>
        </div>
      </PageContainer>
    )
  }

  const canToggleStatus = room.status === 'Available' || room.status === 'Maintenance'
  const toggleTarget = room.status === 'Available' ? 'Maintenance' : 'Available'

  return (
    <PageContainer
      title={`Room ${room.roomNumber}`}
      description={room.buildingName ?? undefined}
      breadcrumbs={<Breadcrumbs items={[{ label: 'Rooms', href: '/rooms' }, { label: `Room ${room.roomNumber}` }]} />}
      actions={
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => router.push('/rooms')}>
            <ArrowLeft className='size-4' />
            Back
          </Button>
          {canToggleStatus && (
            <Button
              variant='outline'
              onClick={() => statusMutation.mutate(toggleTarget as 'Available' | 'Maintenance')}
              disabled={statusMutation.isPending}
            >
              <ToggleLeft className='size-4' />
              Set {toggleTarget}
            </Button>
          )}
          <Button variant='outline' onClick={() => setEditOpen(true)}>
            <Pencil className='size-4' />
            Edit
          </Button>
          <Button variant='destructive' onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
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
              <p className='text-xs text-muted-foreground'>Status</p>
              <RoomStatusBadge status={room.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20'>
              <Layers className='size-4 text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Floor</p>
              <p className='text-lg font-bold'>{room.floor}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='rounded-lg bg-purple-100 p-2 dark:bg-purple-900/20'>
              <Ruler className='size-4 text-purple-600 dark:text-purple-400' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Area</p>
              <p className='text-lg font-bold'>{room.area} m²</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='rounded-lg bg-green-100 p-2 dark:bg-green-900/20'>
              <Banknote className='size-4 text-green-600 dark:text-green-400' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Price</p>
              <p className='text-lg font-bold'>{formatCurrency(room.price)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='rounded-lg bg-amber-100 p-2 dark:bg-amber-900/20'>
              <Users2 className='size-4 text-amber-600 dark:text-amber-400' />
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Max Occupants</p>
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
            Details
          </TabsTrigger>
          <TabsTrigger value='services'>
            <Settings className='size-4 mr-1.5' />
            Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value='info'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Room Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <dt className='text-muted-foreground'>Room Number</dt>
                  <dd className='font-medium'>{room.roomNumber}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Building</dt>
                  <dd className='font-medium'>
                    <button
                      type='button'
                      className='text-primary hover:underline'
                      onClick={() => router.push(`/buildings/${room.buildingId}`)}
                    >
                      {room.buildingName ?? 'View Building'}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Floor</dt>
                  <dd className='font-medium'>{room.floor}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Area</dt>
                  <dd className='font-medium'>{room.area} m²</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Monthly Price</dt>
                  <dd className='font-medium'>{formatCurrency(room.price)}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Max Occupants</dt>
                  <dd className='font-medium'>{room.maxOccupants} people</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Created</dt>
                  <dd className='font-medium'>{formatDate(room.createdAt)}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Last Updated</dt>
                  <dd className='font-medium'>{formatDate(room.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
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
        title='Delete Room'
        description={`Permanently delete room "${room.roomNumber}"? This cannot be undone.`}
        confirmLabel='Delete Room'
        variant='destructive'
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </PageContainer>
  )
}
