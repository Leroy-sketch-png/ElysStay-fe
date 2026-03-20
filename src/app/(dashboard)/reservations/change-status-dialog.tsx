'use client'

import { useState } from 'react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { mapApiErrorsToForm } from '@/lib/form-utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { FileText } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { ReservationStatusBadge } from '@/components/ui/status-badge'
import { canCancelReservation, canConfirmReservation, canConvertReservation } from '@/lib/domain-constants'
import { reservationKeys, changeReservationStatus } from '@/lib/queries/reservations'
import { roomKeys } from '@/lib/queries/rooms'
import { paymentKeys } from '@/lib/queries/payments'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReservationDto, ReservationAction } from '@/types/api'
import { ContractFormDialog } from '../contracts/contract-form-dialog'

// ─── Cancel Schema (with refund fields) ─────────────────

function buildCancelSchema(depositAmount: number) {
  return z.object({
    refundAmount: z
      .number({ error: 'Nhập số tiền hợp lệ' })
      .min(0, 'Tiền hoàn không được âm')
      .max(depositAmount, `Tiền hoàn không vượt quá ${formatCurrency(depositAmount)}`),
    refundNote: z.string().trim().max(500).optional(),
  })
}

type CancelFormData = z.infer<ReturnType<typeof buildCancelSchema>>

// ─── Props ──────────────────────────────────────────────

interface ChangeReservationStatusDialogProps {
  reservation: ReservationDto
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangeReservationStatusDialog({
  reservation,
  open,
  onOpenChange,
}: ChangeReservationStatusDialogProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'choose' | 'cancel'>('choose')
  const [contractDialogOpen, setContractDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CancelFormData>({
    resolver: zodResolver(buildCancelSchema(reservation.depositAmount)),
    defaultValues: {
      refundAmount: reservation.depositAmount,
      refundNote: '',
    },
  })

  const refundAmount = watch('refundAmount')
  const isPartialRefund = refundAmount > 0 && refundAmount < reservation.depositAmount
  const isNoRefund = refundAmount === 0

  // ─── Mutations ─────────────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: () =>
      changeReservationStatus(reservation.id, { action: 'CONFIRM' }),
    onSuccess: () => {
      toast.success('Đã xác nhận đặt cọc')
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Không thể xác nhận đặt cọc', error.message)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (data: CancelFormData) =>
      changeReservationStatus(reservation.id, {
        action: 'CANCEL',
        refundAmount: data.refundAmount,
        refundNote: data.refundNote || undefined,
      }),
    onSuccess: () => {
      toast.success('Đã hủy đặt cọc')
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      if (!mapApiErrorsToForm(error, setError)) {
        toast.error('Không thể hủy đặt cọc', error.message)
      }
    },
  })

  const isPending = confirmMutation.isPending || cancelMutation.isPending

  const onCancelSubmit = handleSubmit((data) => cancelMutation.mutate(data))

  useEffect(() => {
    if (open) {
      setMode('choose')
      reset({
        refundAmount: reservation.depositAmount,
        refundNote: '',
      })
    }
  }, [open, reservation.id, reservation.depositAmount, reset])

  // ─── Allowed actions based on current status ───────────
  const canConfirm = canConfirmReservation(reservation.status)
  const canCancel = canCancelReservation(reservation.status)
  const canConvert = canConvertReservation(reservation.status)

  return (
    <>
    <Dialog
      open={open && !contractDialogOpen}
      onOpenChange={(o) => {
        if (!o) setMode('choose')
        onOpenChange(o)
      }}
    >
      <DialogContent size='md'>
        <DialogClose />

        {mode === 'choose' ? (
          <>
            <DialogHeader>
              <DialogTitle>Quản lý đặt cọc</DialogTitle>
              <DialogDescription>
                Chọn thao tác cho đặt cọc này.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className='space-y-4'>
              {/* Reservation summary */}
              <div className='rounded-lg border bg-muted/30 p-4 space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>
                    {reservation.tenantName ?? 'Khách thuê không xác định'}
                  </span>
                  <ReservationStatusBadge status={reservation.status} />
                </div>
                <div className='grid grid-cols-2 gap-2 text-sm text-muted-foreground'>
                  <div>
                    <span className='text-xs uppercase tracking-wider'>Phòng</span>
                    <p className='text-foreground'>
                      {reservation.buildingName} — {reservation.roomNumber}
                    </p>
                  </div>
                  <div>
                    <span className='text-xs uppercase tracking-wider'>Tiền cọc</span>
                    <p className='text-foreground font-medium'>
                      {formatCurrency(reservation.depositAmount)}
                    </p>
                  </div>
                  <div>
                    <span className='text-xs uppercase tracking-wider'>Hết hạn</span>
                    <p className='text-foreground'>{formatDate(reservation.expiresAt)}</p>
                  </div>
                  <div>
                    <span className='text-xs uppercase tracking-wider'>Ngày tạo</span>
                    <p className='text-foreground'>{formatDate(reservation.createdAt)}</p>
                  </div>
                </div>
                {reservation.note && (
                  <p className='text-sm text-muted-foreground italic'>
                    &ldquo;{reservation.note}&rdquo;
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className='flex flex-col gap-2'>
                {canConvert && (
                  <Button
                    className='w-full justify-start'
                    onClick={() => {
                      setContractDialogOpen(true)
                    }}
                    disabled={isPending}
                  >
                    <FileText className='size-4 mr-2' />
                    Chuyển đổi thành hợp đồng
                  </Button>
                )}
                {canConfirm && (
                  <Button
                    variant='outline'
                    className='w-full justify-start'
                    onClick={() => confirmMutation.mutate()}
                    disabled={isPending}
                  >
                    {confirmMutation.isPending ? 'Đang xác nhận…' : 'Xác nhận đặt cọc'}
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant='destructive'
                    className='w-full justify-start'
                    onClick={() => setMode('cancel')}
                    disabled={isPending}
                  >
                    Hủy đặt cọc…
                  </Button>
                )}
                {!canConfirm && !canCancel && !canConvert && (
                  <p className='text-sm text-muted-foreground'>
                    Không có thao tác khả dụng cho đặt cọc ở trạng thái {reservation.status}.
                  </p>
                )}
              </div>
            </DialogBody>
          </>
        ) : (
          /* Cancel flow with refund details */
          <form noValidate onSubmit={onCancelSubmit}>
            <DialogHeader>
              <DialogTitle>Hủy đặt cọc</DialogTitle>
              <DialogDescription>
                Thao tác này sẽ hủy đặt cọc và trả phòng. Cấu hình hoàn tiền bên dưới.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className='space-y-4'>
              {/* Deposit info */}
              <div className='rounded-lg border bg-muted/30 p-3'>
                <p className='text-sm text-muted-foreground'>
                  Tiền cọc đang giữ: <span className='font-semibold text-foreground'>{formatCurrency(reservation.depositAmount)}</span>
                </p>
              </div>

              {/* Refund amount */}
              <div className='space-y-1.5'>
                <Label htmlFor='refundAmount'>Số tiền hoàn *</Label>
                <Input
                  type='number'
                  step='1000'
                  min='0'
                  max={reservation.depositAmount}
                  {...register('refundAmount', { valueAsNumber: true })}
                />
                {errors.refundAmount && (
                  <p className='text-xs text-destructive'>{errors.refundAmount.message}</p>
                )}

                {/* Quick actions */}
                <div className='flex gap-2'>
                  <button
                    type='button'
                    className='text-xs underline text-primary'
                    onClick={() => setValue('refundAmount', reservation.depositAmount, { shouldValidate: true })}
                  >
                    Hoàn toàn bộ
                  </button>
                  <button
                    type='button'
                    className='text-xs underline text-primary'
                    onClick={() => setValue('refundAmount', 0, { shouldValidate: true })}
                  >
                    Không hoàn
                  </button>
                </div>

                {/* Refund preview */}
                {isPartialRefund && (
                  <p className='text-xs text-warning'>
                    Hoàn một phần: {formatCurrency(refundAmount)} / {formatCurrency(reservation.depositAmount)}
                    {' '}(giữ lại {formatCurrency(reservation.depositAmount - refundAmount)})
                  </p>
                )}
                {isNoRefund && (
                  <p className='text-xs text-muted-foreground'>
                    Không hoàn tiền. Toàn bộ tiền cọc ({formatCurrency(reservation.depositAmount)}) sẽ được giữ lại.
                  </p>
                )}
              </div>

              {/* Refund note */}
              <div className='space-y-1.5'>
                <Label htmlFor='refundNote'>Ghi chú hoàn tiền</Label>
                <Textarea
                  rows={2}
                  placeholder='Lý do hoàn tiền…'
                  {...register('refundNote')}
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setMode('choose')}
                disabled={cancelMutation.isPending}
              >
                Quay lại
              </Button>
              <Button
                type='submit'
                variant='destructive'
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Đang hủy…' : 'Hủy đặt cọc'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>

    {/* Contract creation dialog (conversion flow) */}
    <ContractFormDialog
      open={contractDialogOpen}
      onOpenChange={(o) => {
        setContractDialogOpen(o)
        if (!o) onOpenChange(false)
      }}
      fromReservation={reservation}
    />
    </>
  )
}
