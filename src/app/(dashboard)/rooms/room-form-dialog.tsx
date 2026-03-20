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
    roomNumber: z.string().trim().min(1, 'Số phòng là bắt buộc').max(20),
    floor: z.preprocess(
      (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
      z.number().int().min(1, 'Tầng phải từ 1').max(maxFloors, `Tối đa ${maxFloors} tầng`),
    ),
    area: z.preprocess(
      (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
      z.number().min(1, 'Diện tích phải lớn hơn 0').max(1000, 'Tối đa 1000 m²'),
    ),
    price: z.preprocess(
      (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
      z.number().nonnegative('Giá không được âm'),
    ),
    maxOccupants: z.preprocess(
      (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
      z.number().int().min(1, 'Ít nhất 1 người').max(20, 'Tối đa 20 người'),
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
      toast.success('Đã tạo phòng')
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.byBuilding(buildingId) })
      queryClient.invalidateQueries({ queryKey: buildingKeys.detail(buildingId) })
      onOpenChange(false)
    },
    onError: (error: Error & { status?: number }) => {
      if ((error as { status?: number }).status === 409) {
        toast.error('Trùng số phòng', 'Phòng với số này đã tồn tại trong tòa nhà.')
      } else {
        toast.error('Tạo phòng thất bại', error.message)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateRoomRequest) => updateRoom(room!.id, data),
    onSuccess: () => {
      toast.success('Đã cập nhật phòng')
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.byBuilding(buildingId) })
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(room!.id) })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Cập nhật phòng thất bại', error.message),
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
          <DialogTitle>{isEdit ? 'Sửa phòng' : 'Thêm phòng'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Cập nhật thông tin phòng. Đổi trạng thái dùng thao tác riêng.'
              : `Thêm phòng mới cho tòa nhà (tối đa ${totalFloors} tầng).`}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='room-number'>Số phòng *</Label>
                <Input
                  id='room-number'
                  placeholder='VD: 101'
                  {...register('roomNumber')}
                  aria-invalid={!!errors.roomNumber}
                />
                {errors.roomNumber && <p className='text-xs text-destructive'>{errors.roomNumber.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='room-floor'>Tầng *</Label>
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
                <Label htmlFor='room-area'>Diện tích (m²) *</Label>
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
                <Label htmlFor='room-price'>Giá (VND) *</Label>
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
                <Label htmlFor='room-max'>Sức chứa tối đa *</Label>
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
              <Label htmlFor='room-desc'>Mô tả</Label>
              <Textarea
                id='room-desc'
                rows={3}
                placeholder='Thông tin phòng (không bắt buộc)…'
                {...register('description')}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={isPending}>
              Hủy
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo phòng'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
