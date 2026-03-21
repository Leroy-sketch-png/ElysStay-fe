'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { mapApiErrorsToForm } from '@/lib/form-utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import { DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import { roomKeys, fetchRooms } from '@/lib/queries/rooms'
import { reservationKeys, createReservation } from '@/lib/queries/reservations'
import { tenantKeys, fetchTenants } from '@/lib/queries/tenants'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import { formatCurrency } from '@/lib/utils'

// ─── Schema ─────────────────────────────────────────────

function toLocalDateTimeInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function getDefaultExpiryValue(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return toLocalDateTimeInputValue(d)
}

function getMinExpiryValue(): string {
  return toLocalDateTimeInputValue(new Date())
}

const reservationSchema = z.object({
  buildingId: z.string().min(1, 'Vui lòng chọn tòa nhà'),
  roomId: z.string().min(1, 'Vui lòng chọn phòng'),
  tenantUserId: z.string().min(1, 'Vui lòng chọn khách thuê'),
  depositAmount: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined
      if (typeof value === 'number' && Number.isNaN(value)) return undefined
      return value
    },
    z.number({ error: 'Nhập số tiền hợp lệ' }).positive('Số tiền cọc phải lớn hơn 0').optional(),
  ),
  expiresAt: z.string().optional(),
  note: z.string().trim().max(1000, 'Ghi chú không vượt quá 1000 ký tự').optional(),
}).refine((data) => {
  if (!data.expiresAt) return true
  const expiresAt = new Date(data.expiresAt)
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > new Date()
}, {
  message: 'Ngày hết hạn phải ở tương lai',
  path: ['expiresAt'],
})

type ReservationFormData = z.input<typeof reservationSchema>
type ReservationFormOutput = z.output<typeof reservationSchema>

// ─── Props ──────────────────────────────────────────────

interface CreateReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateReservationDialog({
  open,
  onOpenChange,
}: CreateReservationDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ReservationFormData, unknown, ReservationFormOutput>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      buildingId: '',
      roomId: '',
      tenantUserId: '',
      expiresAt: getDefaultExpiryValue(),
      note: '',
    },
  })

  const watchedBuildingId = watch('buildingId')
  const watchedRoomId = watch('roomId')

  // ─── Data Queries ──────────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  const { data: roomsData } = useQuery({
    queryKey: roomKeys.list({ buildingId: watchedBuildingId, status: 'Available', pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchRooms({ buildingId: watchedBuildingId, status: 'Available', pageSize: DROPDOWN_PAGE_SIZE }),
    enabled: !!watchedBuildingId,
  })

  const { data: tenantsData } = useQuery({
    queryKey: tenantKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchTenants({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  const buildings = buildingsData?.data ?? []
  const rooms = roomsData?.data ?? []
  const tenants = (tenantsData?.data ?? []).filter((t) => t.status === 'Active')

  // Auto-populate deposit with 50% of room price
  const selectedRoom = rooms.find((r) => r.id === watchedRoomId)

  // Default expiry is set in form defaultValues to ensure React Hook Form tracks it

  // ─── Reset ─────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      reset({
        buildingId: '',
        roomId: '',
        tenantUserId: '',
        expiresAt: getDefaultExpiryValue(),
        note: '',
      })
    }
  }, [open, reset])

  // Clear room selection when building changes
  useEffect(() => {
    setValue('roomId', '')
  }, [watchedBuildingId, setValue])

  // ─── Mutation ──────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data: ReservationFormOutput) =>
      createReservation({
        roomId: data.roomId,
        tenantUserId: data.tenantUserId,
        depositAmount: data.depositAmount || undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
        note: data.note || undefined,
      }),
    onSuccess: () => {
      toast.success('Đã tạo đặt cọc')
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      if (!mapApiErrorsToForm(error, setError)) {
        toast.error('Không thể tạo đặt cọc', error.message)
      }
    },
  })

  const onSubmit = handleSubmit((data: ReservationFormOutput) => mutation.mutate(data))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='lg'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Đặt cọc mới</DialogTitle>
          <DialogDescription>
            Đặt cọc phòng cho khách thuê. Phòng sẽ được đánh dấu là Đã đặt.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={onSubmit}>
          <DialogBody className='space-y-4'>
            {/* Building */}
            <div className='space-y-1.5'>
              <Label htmlFor='buildingId'>Tòa nhà *</Label>
              <Select {...register('buildingId')}>
                <option value=''>Chọn tòa nhà…</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              {errors.buildingId && (
                <p className='text-xs text-destructive'>{errors.buildingId.message}</p>
              )}
            </div>

            {/* Room */}
            <div className='space-y-1.5'>
              <Label htmlFor='roomId'>Phòng trống *</Label>
              <Select {...register('roomId')} disabled={!watchedBuildingId}>
                <option value=''>
                  {watchedBuildingId ? 'Chọn phòng…' : 'Chọn tòa nhà trước'}
                </option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Phòng {r.roomNumber} — {formatCurrency(r.price)}/tháng
                  </option>
                ))}
              </Select>
              {errors.roomId && (
                <p className='text-xs text-destructive'>{errors.roomId.message}</p>
              )}
              {selectedRoom && (
                <p className='text-xs text-muted-foreground'>
                  Tiền cọc mặc định: {formatCurrency(selectedRoom.price * 0.5)} (50% giá phòng)
                </p>
              )}
            </div>

            {/* Tenant */}
            <div className='space-y-1.5'>
              <Label htmlFor='tenantUserId'>Khách thuê *</Label>
              <Select {...register('tenantUserId')}>
                <option value=''>Chọn khách thuê…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.email})
                  </option>
                ))}
              </Select>
              {errors.tenantUserId && (
                <p className='text-xs text-destructive'>{errors.tenantUserId.message}</p>
              )}
            </div>

            <div className='grid grid-cols-2 gap-4'>
              {/* Deposit Amount (optional) */}
              <div className='space-y-1.5'>
                <Label htmlFor='depositAmount'>Số tiền đặt cọc</Label>
                <Input
                  type='number'
                  step='1000'
                  min='1'
                  placeholder={selectedRoom ? String(selectedRoom.price * 0.5) : '0'}
                  {...register('depositAmount', {
                    setValueAs: (value) => value === '' ? undefined : Number(value),
                  })}
                />
                <p className='text-xs text-muted-foreground'>Để trống sẽ dùng mặc định (50% giá phòng)</p>
              </div>

              {/* Expiry (optional) */}
              <div className='space-y-1.5'>
                <Label htmlFor='expiresAt'>Hết hạn</Label>
                <Input
                  type='datetime-local'
                  min={getMinExpiryValue()}
                  {...register('expiresAt')}
                />
                <p className='text-xs text-muted-foreground'>Mặc định: 7 ngày</p>
              </div>
            </div>

            {/* Note */}
            <div className='space-y-1.5'>
              <Label htmlFor='note'>Ghi chú</Label>
              <Textarea
                rows={2}
                placeholder='Ghi chú về đặt cọc này (không bắt buộc)…'
                {...register('note')}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Hủy
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang tạo…' : 'Tạo đặt cọc'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
