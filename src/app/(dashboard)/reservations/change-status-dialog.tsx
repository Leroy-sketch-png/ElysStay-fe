'use client'

import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { ReservationStatusBadge } from '@/components/ui/status-badge'
import { reservationKeys, changeReservationStatus } from '@/lib/queries/reservations'
import { roomKeys } from '@/lib/queries/rooms'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReservationDto, ReservationAction } from '@/types/api'

// ─── Cancel Schema (with refund fields) ─────────────────

const cancelSchema = z.object({
  refundAmount: z
    .number({ error: 'Enter a valid amount' })
    .min(0, 'Refund cannot be negative'),
  refundNote: z.string().max(500).optional(),
})

type CancelFormData = z.infer<typeof cancelSchema>

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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CancelFormData>({
    resolver: zodResolver(cancelSchema),
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
      toast.success('Reservation confirmed')
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Failed to confirm reservation')
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
      toast.success('Reservation cancelled')
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Failed to cancel reservation')
    },
  })

  const isPending = confirmMutation.isPending || cancelMutation.isPending

  const onCancelSubmit = handleSubmit((data) => cancelMutation.mutate(data))

  // ─── Allowed actions based on current status ───────────
  const canConfirm = reservation.status === 'Pending'
  const canCancel = reservation.status === 'Pending' || reservation.status === 'Confirmed'

  return (
    <Dialog
      open={open}
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
              <DialogTitle>Manage Reservation</DialogTitle>
              <DialogDescription>
                Choose an action for this reservation.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className='space-y-4'>
              {/* Reservation summary */}
              <div className='rounded-lg border bg-muted/30 p-4 space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>
                    {reservation.tenantName ?? 'Unknown tenant'}
                  </span>
                  <ReservationStatusBadge status={reservation.status} />
                </div>
                <div className='grid grid-cols-2 gap-2 text-sm text-muted-foreground'>
                  <div>
                    <span className='text-xs uppercase tracking-wider'>Room</span>
                    <p className='text-foreground'>
                      {reservation.buildingName} — {reservation.roomNumber}
                    </p>
                  </div>
                  <div>
                    <span className='text-xs uppercase tracking-wider'>Deposit</span>
                    <p className='text-foreground font-medium'>
                      {formatCurrency(reservation.depositAmount)}
                    </p>
                  </div>
                  <div>
                    <span className='text-xs uppercase tracking-wider'>Expires</span>
                    <p className='text-foreground'>{formatDate(reservation.expiresAt)}</p>
                  </div>
                  <div>
                    <span className='text-xs uppercase tracking-wider'>Created</span>
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
                {canConfirm && (
                  <Button
                    className='w-full justify-start'
                    onClick={() => confirmMutation.mutate()}
                    disabled={isPending}
                  >
                    {confirmMutation.isPending ? 'Confirming…' : 'Confirm Reservation'}
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant='destructive'
                    className='w-full justify-start'
                    onClick={() => setMode('cancel')}
                    disabled={isPending}
                  >
                    Cancel Reservation…
                  </Button>
                )}
              </div>
            </DialogBody>
          </>
        ) : (
          /* Cancel flow with refund details */
          <form onSubmit={onCancelSubmit}>
            <DialogHeader>
              <DialogTitle>Cancel Reservation</DialogTitle>
              <DialogDescription>
                This will cancel the reservation and release the room. Configure deposit refund below.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className='space-y-4'>
              {/* Deposit info */}
              <div className='rounded-lg border bg-muted/30 p-3'>
                <p className='text-sm text-muted-foreground'>
                  Deposit held: <span className='font-semibold text-foreground'>{formatCurrency(reservation.depositAmount)}</span>
                </p>
              </div>

              {/* Refund amount */}
              <div className='space-y-1.5'>
                <Label htmlFor='refundAmount'>Refund Amount *</Label>
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
                    onClick={() => setValue('refundAmount', reservation.depositAmount)}
                  >
                    Full refund
                  </button>
                  <button
                    type='button'
                    className='text-xs underline text-primary'
                    onClick={() => setValue('refundAmount', 0)}
                  >
                    No refund
                  </button>
                </div>

                {/* Refund preview */}
                {isPartialRefund && (
                  <p className='text-xs text-amber-600'>
                    Partial refund: {formatCurrency(refundAmount)} of {formatCurrency(reservation.depositAmount)}
                    {' '}({formatCurrency(reservation.depositAmount - refundAmount)} retained)
                  </p>
                )}
                {isNoRefund && (
                  <p className='text-xs text-muted-foreground'>
                    No refund. Entire deposit ({formatCurrency(reservation.depositAmount)}) will be retained.
                  </p>
                )}
              </div>

              {/* Refund note */}
              <div className='space-y-1.5'>
                <Label htmlFor='refundNote'>Refund Note</Label>
                <Textarea
                  rows={2}
                  placeholder='Reason for refund amount…'
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
                Back
              </Button>
              <Button
                type='submit'
                variant='destructive'
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Reservation'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
