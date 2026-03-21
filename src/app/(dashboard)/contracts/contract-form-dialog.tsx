'use client'

import { useEffect, useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { formatCurrency } from '@/lib/utils'
import { contractKeys, createContract } from '@/lib/queries/contracts'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import { DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import { roomKeys, fetchRooms } from '@/lib/queries/rooms'
import { tenantKeys, fetchTenants } from '@/lib/queries/tenants'
import { paymentKeys } from '@/lib/queries/payments'
import { invoiceKeys } from '@/lib/queries/invoices'
import { reservationKeys } from '@/lib/queries/reservations'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import type { CreateContractRequest, ReservationDto } from '@/types/api'

// ─── Validation ─────────────────────────────────────────

const contractSchema = z.object({
  buildingId: z.string().min(1, 'Chọn tòa nhà'),
  roomId: z.string().min(1, 'Chọn phòng'),
  tenantUserId: z.string().min(1, 'Chọn khách thuê'),
  startDate: z.string().min(1, 'Ngày bắt đầu là bắt buộc'),
  endDate: z.string().min(1, 'Ngày kết thúc là bắt buộc'),
  moveInDate: z.string().min(1, 'Ngày dọn vào là bắt buộc'),
  monthlyRent: z.number({ error: 'Giá thuê hàng tháng là bắt buộc' }).positive('Giá thuê phải lớn hơn 0'),
  depositAmount: z.number({ error: 'Tiền cọc là bắt buộc' }).min(0, 'Tiền cọc không được âm'),
  note: z.string().max(2000, 'Ghi chú không vượt quá 2000 ký tự').optional().or(z.literal('')),
}).refine((data) => data.endDate > data.startDate, {
  message: 'Ngày kết thúc phải sau ngày bắt đầu',
  path: ['endDate'],
}).refine((data) => !data.moveInDate || !data.startDate || data.moveInDate >= data.startDate, {
  message: 'Ngày dọn vào không được trước ngày bắt đầu',
  path: ['moveInDate'],
}).refine((data) => !data.moveInDate || !data.endDate || data.moveInDate <= data.endDate, {
  message: 'Ngày dọn vào không được sau ngày kết thúc',
  path: ['moveInDate'],
})

type ContractFormData = z.input<typeof contractSchema>
type ContractFormOutput = z.output<typeof contractSchema>

// ─── Props ──────────────────────────────────────────────

interface ContractFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill from a confirmed reservation (conversion flow) */
  fromReservation?: ReservationDto
}

export function ContractFormDialog({ open, onOpenChange, fromReservation }: ContractFormDialogProps) {
  const queryClient = useQueryClient()
  const [selectedBuildingId, setSelectedBuildingId] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ContractFormData, unknown, ContractFormOutput>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      buildingId: '',
      roomId: '',
      tenantUserId: '',
      startDate: '',
      endDate: '',
      moveInDate: '',
      monthlyRent: 0,
      depositAmount: 0,
      note: '',
    },
  })

  const watchedBuildingId = watch('buildingId')

  // Reset form on open — pre-fill if from reservation
  useEffect(() => {
    if (open) {
      if (fromReservation) {
        reset({
          buildingId: fromReservation.buildingId,
          roomId: fromReservation.roomId,
          tenantUserId: fromReservation.tenantUserId,
          startDate: '',
          endDate: '',
          moveInDate: '',
          monthlyRent: 0,
          depositAmount: fromReservation.depositAmount,
          note: fromReservation.note ?? '',
        })
        setSelectedBuildingId(fromReservation.buildingId)
      } else {
        reset()
        setSelectedBuildingId('')
      }
    }
  }, [open, reset])

  // When building changes, reset room selection
  useEffect(() => {
    if (watchedBuildingId !== selectedBuildingId) {
      setSelectedBuildingId(watchedBuildingId)
      setValue('roomId', '')
    }
  }, [watchedBuildingId, selectedBuildingId, setValue])

  // ─── Data: Buildings ──────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    enabled: open,
  })

  // ─── Data: Available Rooms ────────────────────────────
  // When converting from reservation, the room is Booked (not Available).
  // Fetch both Available and Booked rooms so the pre-filled room appears.
  const roomStatus = fromReservation ? undefined : 'Available'
  const { data: roomsData } = useQuery({
    queryKey: roomKeys.list({ buildingId: selectedBuildingId, status: roomStatus, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchRooms({ buildingId: selectedBuildingId, status: roomStatus, pageSize: DROPDOWN_PAGE_SIZE }),
    enabled: open && !!selectedBuildingId,
  })

  // ─── Data: Active Tenants ─────────────────────────────
  const { data: tenantsData } = useQuery({
    queryKey: tenantKeys.list({ pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchTenants({ pageSize: DROPDOWN_PAGE_SIZE }),
    enabled: open,
  })

  const activeTenants = useMemo(
    () => (tenantsData?.data ?? []).filter((t) => t.status === 'Active'),
    [tenantsData],
  )

  const availableRooms = roomsData?.data ?? []

  // Auto-fill rent when room is selected
  const watchedRoomId = watch('roomId')
  useEffect(() => {
    if (watchedRoomId && availableRooms.length > 0) {
      const room = availableRooms.find((r) => r.id === watchedRoomId)
      if (room) {
        setValue('monthlyRent', room.price)
      }
    }
  }, [watchedRoomId, availableRooms, setValue])

  // Auto-fill moveInDate from startDate (most Vietnamese leases: move-in = start)
  const watchedStartDate = watch('startDate')
  useEffect(() => {
    if (watchedStartDate) {
      const currentMoveIn = watch('moveInDate')
      if (!currentMoveIn) {
        setValue('moveInDate', watchedStartDate)
      }
    }
  }, [watchedStartDate, setValue, watch])

  // ─── Mutation ─────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: CreateContractRequest) => createContract(data),
    onSuccess: () => {
      toast.success(
        fromReservation ? 'Chuyển đổi thành hợp đồng thành công' : 'Tạo hợp đồng thành công',
        'Thanh toán tiền cọc đã được ghi nhận tự động.',
      )
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error & { status?: number }) => {
      if (mapApiErrorsToForm(error, setError)) return
      if ((error as { status?: number }).status === 409) {
        toast.error('Phòng đã có hợp đồng', 'Mỗi phòng chỉ được phép có một hợp đồng đang hoạt động.')
      } else {
        toast.error('Không thể tạo hợp đồng', error.message)
      }
    },
  })

  const onSubmit = (data: ContractFormOutput) => {
    createMutation.mutate({
      roomId: data.roomId,
      tenantUserId: data.tenantUserId,
      reservationId: fromReservation?.id,
      startDate: data.startDate,
      endDate: data.endDate,
      moveInDate: data.moveInDate,
      monthlyRent: data.monthlyRent,
      depositAmount: data.depositAmount,
      note: data.note || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='lg'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{fromReservation ? 'Chuyển đổi thành hợp đồng' : 'Hợp đồng thuê mới'}</DialogTitle>
          <DialogDescription>
            {fromReservation
              ? `Tạo hợp đồng từ đặt cọc của ${fromReservation.tenantName ?? 'khách thuê'}. Tiền cọc sẽ được chuyển tự động.`
              : 'Tạo hợp đồng để gán khách thuê vào phòng. Phòng sẽ chuyển sang trạng thái Đang ở và thanh toán tiền cọc sẽ được tự động ghi nhận.'}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-5'>
            {/* Reservation info banner */}
            {fromReservation && (
              <div className='rounded-lg border bg-primary/5 border-primary/20 p-3'>
                <p className='text-sm font-medium'>Chuyển đổi từ đặt cọc</p>
                <p className='text-xs text-muted-foreground mt-1'>
                  {fromReservation.tenantName} — {fromReservation.buildingName}, Phòng {fromReservation.roomNumber} — Cọc: {formatCurrency(fromReservation.depositAmount)}
                </p>
              </div>
            )}

            {/* Building + Room Selection */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='contract-building'>Tòa nhà *</Label>
                <Controller
                  name='buildingId'
                  control={control}
                  render={({ field }) => (
                    <Select
                      id='contract-building'
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!!fromReservation}
                      aria-invalid={!!errors.buildingId}
                    >
                      <option value=''>Chọn tòa nhà…</option>
                      {(buildingsData?.data ?? []).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </Select>
                  )}
                />
                {errors.buildingId && <p className='text-xs text-destructive'>{errors.buildingId.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='contract-room'>Phòng *</Label>
                <Controller
                  name='roomId'
                  control={control}
                  render={({ field }) => (
                    <Select
                      id='contract-room'
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!selectedBuildingId || !!fromReservation}
                      aria-invalid={!!errors.roomId}
                    >
                      <option value=''>
                        {!selectedBuildingId
                          ? 'Chọn tòa nhà trước'
                          : availableRooms.length === 0
                            ? 'Không có phòng trống'
                            : 'Chọn phòng…'
                        }
                      </option>
                      {availableRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roomNumber} — Tầng {r.floor} — {formatCurrency(r.price)}/tháng
                        </option>
                      ))}
                    </Select>
                  )}
                />
                {errors.roomId && <p className='text-xs text-destructive'>{errors.roomId.message}</p>}
              </div>
            </div>

            {/* Tenant Selection */}
            <div className='space-y-2'>
              <Label htmlFor='contract-tenant'>Khách thuê *</Label>
              <Controller
                name='tenantUserId'
                control={control}
                render={({ field }) => (
                  <Select
                    id='contract-tenant'
                    value={field.value}
                    onChange={field.onChange}
                    disabled={!!fromReservation}
                    aria-invalid={!!errors.tenantUserId}
                  >
                    <option value=''>Chọn khách thuê…</option>
                    {activeTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} — {t.email}
                      </option>
                    ))}
                  </Select>
                )}
              />
              {errors.tenantUserId && <p className='text-xs text-destructive'>{errors.tenantUserId.message}</p>}
            </div>

            {/* Dates */}
            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='contract-start'>Ngày bắt đầu *</Label>
                <Input
                  id='contract-start'
                  type='date'
                  {...register('startDate')}
                  aria-invalid={!!errors.startDate}
                />
                {errors.startDate && <p className='text-xs text-destructive'>{errors.startDate.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contract-end'>Ngày kết thúc *</Label>
                <Input
                  id='contract-end'
                  type='date'
                  {...register('endDate')}
                  aria-invalid={!!errors.endDate}
                />
                {errors.endDate && <p className='text-xs text-destructive'>{errors.endDate.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contract-movein'>Ngày dọn vào *</Label>
                <Input
                  id='contract-movein'
                  type='date'
                  {...register('moveInDate')}
                  aria-invalid={!!errors.moveInDate}
                />
                {errors.moveInDate && <p className='text-xs text-destructive'>{errors.moveInDate.message}</p>}
              </div>
            </div>

            {/* Pricing */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='contract-rent'>Giá thuê hàng tháng (VND) *</Label>
                <Input
                  id='contract-rent'
                  type='number'
                  min={0}
                  step={100000}
                  {...register('monthlyRent', {
                    setValueAs: (value) => value === '' ? undefined : Number(value),
                  })}
                  aria-invalid={!!errors.monthlyRent}
                />
                {errors.monthlyRent && <p className='text-xs text-destructive'>{errors.monthlyRent.message}</p>}
                <p className='text-xs text-muted-foreground'>
                  Cố định khi ký — không thay đổi nếu giá phòng thay đổi sau.
                </p>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contract-deposit'>Tiền cọc (VND) *</Label>
                <Input
                  id='contract-deposit'
                  type='number'
                  min={0}
                  step={100000}
                  {...register('depositAmount', {
                    setValueAs: (value) => value === '' ? undefined : Number(value),
                  })}
                  aria-invalid={!!errors.depositAmount}
                />
                {errors.depositAmount && <p className='text-xs text-destructive'>{errors.depositAmount.message}</p>}
                <p className='text-xs text-muted-foreground'>
                  {fromReservation
                    ? `Tiền cọc từ đặt cọc (${formatCurrency(fromReservation.depositAmount)}) sẽ được chuyển tự động.`
                    : 'Thanh toán tiền cọc sẽ được tự động ghi nhận.'}
                </p>
              </div>
            </div>

            {/* Note */}
            <div className='space-y-2'>
              <Label htmlFor='contract-note'>Ghi chú</Label>
              <Textarea
                id='contract-note'
                placeholder='Ghi chú thêm về hợp đồng…'
                rows={2}
                {...register('note')}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              Hủy
            </Button>
            <Button type='submit' disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang tạo…' : fromReservation ? 'Tạo hợp đồng' : 'Tạo hợp đồng'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
