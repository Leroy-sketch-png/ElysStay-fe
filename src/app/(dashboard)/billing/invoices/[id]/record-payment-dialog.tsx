'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { mapApiErrorsToForm } from '@/lib/form-utils'
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
  { value: '', label: 'Chọn phương thức…' },
  { value: 'Cash', label: 'Tiền mặt' },
  { value: 'BankTransfer', label: 'Chuyển khoản' },
  { value: 'MoMo', label: 'MoMo' },
  { value: 'ZaloPay', label: 'ZaloPay' },
  { value: 'VNPay', label: 'VNPay' },
  { value: 'Card', label: 'Thẻ' },
  { value: 'Other', label: 'Khác' },
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
      .positive('Số tiền phải dương')
      .max(amountDue, `Thanh toán không được vượt quá số dư còn lại ${formatCurrency(amountDue)}`),
    paymentMethod: z.string().max(50, 'Phương thức không vượt quá 50 ký tự').optional(),
    note: z.string().max(1000, 'Ghi chú không vượt quá 1000 ký tự').optional().or(z.literal('')),
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
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
        'Đã ghi nhận thanh toán',
        willFullyPay
          ? 'Hóa đơn đã thanh toán đầy đủ.'
          : `Còn lại ${formatCurrency(remainingAfter)}.`,
      )
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoice.id) })
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      if (!mapApiErrorsToForm(error, setError)) {
        toast.error('Ghi nhận thanh toán thất bại', error.message)
      }
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
          <DialogTitle>Ghi nhận thanh toán</DialogTitle>
          <DialogDescription>
            Ghi nhận thanh toán cho Phòng {invoice.roomNumber} —{' '}
            {formatBillingPeriod(invoice.billingYear, invoice.billingMonth)}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-5'>
            {/* Invoice Summary */}
            <div className='rounded-lg bg-muted/50 p-4 space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Tổng hóa đơn</span>
                <span className='font-medium'>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Đã thanh toán</span>
                <span className='font-medium text-success'>
                  − {formatCurrency(invoice.paidAmount)}
                </span>
              </div>
              <div className='border-t pt-2 flex justify-between text-sm font-semibold'>
                <span>Còn nợ</span>
                <span className='text-warning'>
                  {formatCurrency(amountDue)}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className='space-y-2'>
              <Label htmlFor='pay-amount'>Số tiền thanh toán (VND) *</Label>
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
                  Toàn bộ
                </Button>
                <span className='text-xs text-muted-foreground'>
                  Nhấn để thanh toán toàn bộ số còn lại
                </span>
              </div>
            </div>

            {/* Preview */}
            {watchedAmount > 0 && (
              <div className='rounded-lg border p-3 space-y-1'>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Sau khi thanh toán</span>
                  <span className={willFullyPay ? 'text-success font-medium' : ''}>
                    {willFullyPay ? 'Đã thanh toán đủ' : `Còn lại ${formatCurrency(remainingAfter)}`}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className='space-y-2'>
              <Label htmlFor='pay-method'>Phương thức</Label>
              <Select id='pay-method' {...register('paymentMethod')}>
                {paymentMethods.map((pm) => (
                  <option key={pm.value} value={pm.value}>{pm.label}</option>
                ))}
              </Select>
            </div>

            {/* Note */}
            <div className='space-y-2'>
              <Label htmlFor='pay-note'>Ghi chú</Label>
              <Textarea
                id='pay-note'
                placeholder='Tham chiếu giao dịch hoặc ghi chú…'
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
              Hủy
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang ghi…' : 'Ghi nhận'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
