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
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { formatCurrency, formatBillingPeriod } from '@/lib/utils'
import { invoiceKeys } from '@/lib/queries/invoices'
import { paymentKeys, recordPayment } from '@/lib/queries/payments'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import type { InvoiceDetailDto, RecordPaymentRequest } from '@/types/api'

type PaymentFormData = {
  amount: number
  paymentMethod?: string
  note?: string
}

// ─── Payment Methods ────────────────────────────────────

const paymentMethods = [
  { value: '', label: 'Select payment method…' },
  { value: 'Cash', label: 'Cash' },
  { value: 'BankTransfer', label: 'Bank Transfer' },
  { value: 'MoMo', label: 'MoMo' },
  { value: 'ZaloPay', label: 'ZaloPay' },
  { value: 'VNPay', label: 'VNPay' },
  { value: 'Card', label: 'Card' },
  { value: 'Other', label: 'Other' },
]

// ─── Props ──────────────────────────────────────────────

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceDetailDto
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
}: RecordPaymentDialogProps) {
  const queryClient = useQueryClient()

  const amountDue = invoice.totalAmount - invoice.paidAmount
  const paymentSchema = z.object({
    amount: z.number()
      .positive('Amount must be positive')
      .max(amountDue, `Payment cannot exceed the remaining balance of ${formatCurrency(amountDue)}`),
    paymentMethod: z.string().optional(),
    note: z.string().max(500).optional().or(z.literal('')),
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: amountDue,
      paymentMethod: '',
      note: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        amount: amountDue,
        paymentMethod: '',
        note: '',
      })
    }
  }, [open, reset, amountDue])

  const watchedAmount = watch('amount') || 0
  const newPaidAmount = invoice.paidAmount + watchedAmount
  const remainingAfter = invoice.totalAmount - newPaidAmount
  const willFullyPay = remainingAfter <= 0

  const mutation = useMutation({
    mutationFn: (data: RecordPaymentRequest) => recordPayment(invoice.id, data),
    onSuccess: () => {
      toast.success(
        'Payment recorded',
        willFullyPay
          ? 'Invoice is now fully paid.'
          : `${formatCurrency(remainingAfter)} remaining.`,
      )
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoice.id) })
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to record payment', error.message)
    },
  })

  const onSubmit = (data: PaymentFormData) => {
    mutation.mutate({
      amount: data.amount,
      paymentMethod: data.paymentMethod || undefined,
      note: data.note || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Recording payment for Room {invoice.roomNumber} —{' '}
            {formatBillingPeriod(invoice.billingYear, invoice.billingMonth)}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-5'>
            {/* Invoice Summary */}
            <div className='rounded-lg bg-muted/50 p-4 space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Total Invoice</span>
                <span className='font-medium'>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Already Paid</span>
                <span className='font-medium text-success'>
                  − {formatCurrency(invoice.paidAmount)}
                </span>
              </div>
              <div className='border-t pt-2 flex justify-between text-sm font-semibold'>
                <span>Amount Due</span>
                <span className='text-warning'>
                  {formatCurrency(amountDue)}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className='space-y-2'>
              <Label htmlFor='pay-amount'>Payment Amount (VND) *</Label>
              <Input
                id='pay-amount'
                type='number'
                min={1}
                step={1000}
                {...register('amount', { valueAsNumber: true })}
                aria-invalid={!!errors.amount}
              />
              {errors.amount && (
                <p className='text-xs text-destructive'>{errors.amount.message}</p>
              )}
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => reset({ ...watch(), amount: amountDue })}
                >
                  Full Amount
                </Button>
                <span className='text-xs text-muted-foreground'>
                  Click to pay the full remaining amount
                </span>
              </div>
            </div>

            {/* Preview */}
            {watchedAmount > 0 && (
              <div className='rounded-lg border p-3 space-y-1'>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>After this payment</span>
                  <span className={willFullyPay ? 'text-success font-medium' : ''}>
                    {willFullyPay ? 'Fully Paid' : `${formatCurrency(remainingAfter)} remaining`}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className='space-y-2'>
              <Label htmlFor='pay-method'>Payment Method</Label>
              <Select id='pay-method' {...register('paymentMethod')}>
                {paymentMethods.map((pm) => (
                  <option key={pm.value} value={pm.value}>{pm.label}</option>
                ))}
              </Select>
            </div>

            {/* Note */}
            <div className='space-y-2'>
              <Label htmlFor='pay-note'>Note</Label>
              <Textarea
                id='pay-note'
                placeholder='Transaction reference or remarks…'
                rows={2}
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
              Cancel
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Recording…' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
