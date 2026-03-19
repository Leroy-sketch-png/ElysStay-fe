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
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { formatCurrency } from '@/lib/utils'
import { contractKeys, terminateContract } from '@/lib/queries/contracts'
import { roomKeys } from '@/lib/queries/rooms'
import { invoiceKeys } from '@/lib/queries/invoices'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import type { ContractDetailDto, TerminateContractRequest } from '@/types/api'

// ─── Schema ─────────────────────────────────────────────

const terminateSchema = z.object({
  terminationDate: z.string().min(1, 'Termination date is required'),
  deductions: z
    .preprocess(
      (v) => (v === '' || v == null || Number.isNaN(v) ? 0 : v),
      z.number().min(0, 'Cannot be negative'),
    ),
  note: z.string().trim().max(500).optional().or(z.literal('')),
})

type TerminateFormInput = z.input<typeof terminateSchema>
type TerminateFormData = z.output<typeof terminateSchema>

function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ─── Props ──────────────────────────────────────────────

interface TerminateContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractDetailDto
}

export function TerminateContractDialog({
  open,
  onOpenChange,
  contract,
}: TerminateContractDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TerminateFormInput, unknown, TerminateFormData>({
    resolver: zodResolver(
      terminateSchema.refine(
        (data) => data.deductions <= contract.depositAmount,
        {
          message: `Deductions cannot exceed deposit (${formatCurrency(contract.depositAmount)})`,
          path: ['deductions'],
        },
      ),
    ),
    defaultValues: {
      terminationDate: toLocalDateInputValue(new Date()),
      deductions: 0,
      note: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        terminationDate: toLocalDateInputValue(new Date()),
        deductions: 0,
        note: '',
      })
    }
  }, [open, reset])

  const watchedDeductionsValue = watch('deductions')
  const watchedDeductions = typeof watchedDeductionsValue === 'number' ? watchedDeductionsValue : 0
  const refundAmount = Math.max(0, contract.depositAmount - watchedDeductions)

  const mutation = useMutation({
    mutationFn: (data: TerminateContractRequest) => terminateContract(contract.id, data),
    onSuccess: () => {
      toast.success('Contract terminated', 'Room has been set back to Available.')
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to terminate contract', error.message)
    },
  })

  const onSubmit = (data: TerminateFormData) => {
    mutation.mutate({
      terminationDate: data.terminationDate,
      deductions: data.deductions || 0,
      note: data.note || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Terminate Contract</DialogTitle>
          <DialogDescription>
            Ending the contract for Room {contract.roomNumber} ({contract.tenantName}).
            The room status will be set back to Available.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-5'>
            {/* Date */}
            <div className='space-y-2'>
              <Label htmlFor='term-date'>Termination Date *</Label>
              <Input
                id='term-date'
                type='date'
                min={contract.startDate}
                {...register('terminationDate')}
                aria-invalid={!!errors.terminationDate}
              />
              {errors.terminationDate && (
                <p className='text-xs text-destructive'>{errors.terminationDate.message}</p>
              )}
            </div>

            {/* Deductions & Refund Preview */}
            <div className='space-y-2'>
              <Label htmlFor='term-deductions'>Deductions from Deposit (VND)</Label>
              <Input
                id='term-deductions'
                type='number'
                min={0}
                max={contract.depositAmount}
                step={10000}
                {...register('deductions', {
                  setValueAs: (v) => {
                    if (v === '' || v == null) return 0
                    const parsed = Number(v)
                    return Number.isFinite(parsed) ? parsed : 0
                  },
                })}
                aria-invalid={!!errors.deductions}
              />
              {errors.deductions && (
                <p className='text-xs text-destructive'>{errors.deductions.message}</p>
              )}
            </div>

            {/* Refund Calculation Preview */}
            <div className='rounded-lg bg-muted/50 p-4 space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Deposit Paid</span>
                <span className='font-medium'>{formatCurrency(contract.depositAmount)}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Deductions</span>
                <span className='font-medium text-destructive'>
                  − {formatCurrency(watchedDeductions)}
                </span>
              </div>
              <div className='border-t pt-2 flex justify-between text-sm font-semibold'>
                <span>Refund to Tenant</span>
                <span className={refundAmount > 0 ? 'text-success' : 'text-muted-foreground'}>
                  {formatCurrency(refundAmount)}
                </span>
              </div>
              {refundAmount === 0 && (
                <p className='text-xs text-muted-foreground'>
                  Full deposit will be forfeited — no refund payment will be created.
                </p>
              )}
            </div>

            {/* Note */}
            <div className='space-y-2'>
              <Label htmlFor='term-note'>Reason / Note</Label>
              <Textarea
                id='term-note'
                placeholder='Reason for termination…'
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
            <Button type='submit' variant='destructive' disabled={mutation.isPending}>
              {mutation.isPending ? 'Terminating…' : 'Terminate Contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
