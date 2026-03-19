'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { roomKeys, createRoom, updateRoom } from '@/lib/queries/rooms'
import { buildingKeys } from '@/lib/queries/buildings'
import type { RoomDto, CreateRoomRequest, UpdateRoomRequest } from '@/types/api'

// ─── Validation ─────────────────────────────────────────

function roomSchema(maxFloors: number) {
  return z.object({
    roomNumber: z.string().trim().min(1, 'Room number is required').max(20),
    floor: z.preprocess(
      (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
      z.number().int().min(1, 'Floor must be at least 1').max(maxFloors, `Max ${maxFloors} floors`),
    ),
    area: z.preprocess(
      (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
      z.number().min(1, 'Area must be positive'),
    ),
    price: z.preprocess(
      (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
      z.number().positive('Price must be positive'),
    ),
    maxOccupants: z.preprocess(
      (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
      z.number().int().min(1, 'At least 1 occupant').max(20),
    ),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
  })
}

type RoomFormInput = z.input<ReturnType<typeof roomSchema>>
type RoomFormData = z.output<ReturnType<typeof roomSchema>>

// ─── Props ──────────────────────────────────────────────

interface RoomFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  buildingId: string
  totalFloors: number
  room?: RoomDto
}

export function RoomFormDialog({
  open,
  onOpenChange,
  mode,
  buildingId,
  totalFloors,
  room,
}: RoomFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = mode === 'edit'
  const schema = roomSchema(totalFloors)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomFormInput, unknown, RoomFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      roomNumber: '',
      floor: 1,
      area: 20,
      price: 1000000,
      maxOccupants: 2,
      description: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (isEdit && room) {
        reset({
          roomNumber: room.roomNumber,
          floor: room.floor,
          area: room.area,
          price: room.price,
          maxOccupants: room.maxOccupants,
          description: room.description ?? '',
        })
      } else {
        reset({ roomNumber: '', floor: 1, area: 20, price: 0, maxOccupants: 2, description: '' })
      }
    }
  }, [open, isEdit, room, reset])

  const createMutation = useMutation({
    mutationFn: (data: CreateRoomRequest) => createRoom(buildingId, data),
    onSuccess: () => {
      toast.success('Room created')
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.byBuilding(buildingId) })
      queryClient.invalidateQueries({ queryKey: buildingKeys.detail(buildingId) })
      onOpenChange(false)
    },
    onError: (error: Error & { status?: number }) => {
      if ((error as { status?: number }).status === 409) {
        toast.error('Duplicate room number', 'A room with that number already exists in this building.')
      } else {
        toast.error('Failed to create room', error.message)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateRoomRequest) => updateRoom(room!.id, data),
    onSuccess: () => {
      toast.success('Room updated')
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.byBuilding(buildingId) })
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(room!.id) })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Failed to update room', error.message),
  })

  const onSubmit = (data: RoomFormData) => {
    const payload = {
      roomNumber: data.roomNumber,
      floor: data.floor,
      area: data.area,
      price: data.price,
      maxOccupants: data.maxOccupants,
      description: data.description || undefined,
    }
    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='md'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Room' : 'Add Room'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update room details. Status changes use a separate action.'
              : `Add a new room to this building (max ${totalFloors} floors).`}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='room-number'>Room Number *</Label>
                <Input
                  id='room-number'
                  placeholder='e.g. 101'
                  {...register('roomNumber')}
                  aria-invalid={!!errors.roomNumber}
                />
                {errors.roomNumber && <p className='text-xs text-destructive'>{errors.roomNumber.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='room-floor'>Floor *</Label>
                <Input
                  id='room-floor'
                  type='number'
                  min={1}
                  max={totalFloors}
                  {...register('floor', { valueAsNumber: true })}
                  aria-invalid={!!errors.floor}
                />
                {errors.floor && <p className='text-xs text-destructive'>{errors.floor.message}</p>}
              </div>
            </div>

            <div className='grid grid-cols-3 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='room-area'>Area (m²) *</Label>
                <Input
                  id='room-area'
                  type='number'
                  min={1}
                  step={0.5}
                  {...register('area', { valueAsNumber: true })}
                  aria-invalid={!!errors.area}
                />
                {errors.area && <p className='text-xs text-destructive'>{errors.area.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='room-price'>Price (VND) *</Label>
                <Input
                  id='room-price'
                  type='number'
                  min={1}
                  step={100000}
                  {...register('price', { valueAsNumber: true })}
                  aria-invalid={!!errors.price}
                />
                {errors.price && <p className='text-xs text-destructive'>{errors.price.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='room-max'>Max Occupants *</Label>
                <Input
                  id='room-max'
                  type='number'
                  min={1}
                  max={20}
                  {...register('maxOccupants', { valueAsNumber: true })}
                  aria-invalid={!!errors.maxOccupants}
                />
                {errors.maxOccupants && <p className='text-xs text-destructive'>{errors.maxOccupants.message}</p>}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='room-desc'>Description</Label>
              <Textarea
                id='room-desc'
                rows={3}
                placeholder='Optional room details…'
                {...register('description')}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
