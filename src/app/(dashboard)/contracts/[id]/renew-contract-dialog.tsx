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
import { toast } from '@/components/ui/toaster'
import { formatCurrency, formatDate, parseDateInput } from '@/lib/utils'
import { contractKeys, renewContract } from '@/lib/queries/contracts'
import { roomKeys } from '@/lib/queries/rooms'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import type { ContractDetailDto, RenewContractRequest } from '@/types/api'

// ─── Schema ─────────────────────────────────────────────

const renewSchema = z.object({
  newEndDate: z.string().min(1, 'New end date is required'),
  newMonthlyRent: z
    .preprocess(
      (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
      z.number().positive('Rent must be positive').optional(),
    ),
})

/** Build a schema with date-ordering validation scoped to the computed newStartDate. */
function buildRenewSchema(newStartDate: string) {
  return renewSchema.refine(
    (data) => data.newEndDate > newStartDate,
    { message: 'End date must be after start date', path: ['newEndDate'] },
  )
}

type RenewFormInput = z.input<typeof renewSchema>
type RenewFormData = z.output<typeof renewSchema>

function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ─── Props ──────────────────────────────────────────────

interface RenewContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractDetailDto
}

export function RenewContractDialog({
  open,
  onOpenChange,
  contract,
}: RenewContractDialogProps) {
  const queryClient = useQueryClient()

  // New contract starts the day after current end date
  // Use parseDateInput to avoid timezone shift bugs with new Date() on date-only strings
  const newStartDate = (() => {
    const d = parseDateInput(contract.endDate)
    d.setDate(d.getDate() + 1)
    return toLocalDateInputValue(d)
  })()

  // Default new end: 1 year from new start
  const defaultNewEnd = (() => {
    const d = new Date(newStartDate)
    d.setFullYear(d.getFullYear() + 1)
    return toLocalDateInputValue(d)
  })()

  const minNewEndDate = (() => {
    const d = new Date(newStartDate)
    d.setDate(d.getDate() + 1)
    return toLocalDateInputValue(d)
  })()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RenewFormInput, unknown, RenewFormData>({
    resolver: zodResolver(buildRenewSchema(newStartDate)),
    defaultValues: {
      newEndDate: defaultNewEnd,
      newMonthlyRent: undefined,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        newEndDate: defaultNewEnd,
        newMonthlyRent: undefined,
      })
    }
  }, [open, reset, defaultNewEnd])

  const mutation = useMutation({
    mutationFn: (data: RenewContractRequest) => renewContract(contract.id, data),
    onSuccess: () => {
      toast.success(
        'Contract renewed',
        'A new contract has been created. The old contract is now terminated.',
      )
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contract.id) })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to renew contract', error.message)
    },
  })

  const onSubmit = (data: RenewFormData) => {
    mutation.mutate({
      newEndDate: data.newEndDate,
      newMonthlyRent: data.newMonthlyRent && data.newMonthlyRent > 0
        ? data.newMonthlyRent
        : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Renew Contract</DialogTitle>
          <DialogDescription>
            Create a new contract continuing from Room {contract.roomNumber} ({contract.tenantName}).
            The current contract will be terminated automatically.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-5'>
            {/* Current contract info */}
            <div className='rounded-lg bg-muted/50 p-4 space-y-2'>
              <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                Current Contract
              </p>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>End Date</span>
                <span className='font-medium'>{formatDate(contract.endDate)}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Monthly Rent</span>
                <span className='font-medium'>{formatCurrency(contract.monthlyRent)}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Deposit (carries over)</span>
                <span className='font-medium'>{formatCurrency(contract.depositAmount)}</span>
              </div>
            </div>

            {/* New start info */}
            <div className='space-y-2'>
              <Label>New Start Date</Label>
              <Input
                type='date'
                value={newStartDate}
                disabled
                aria-label='New contract start date'
              />
              <p className='text-xs text-muted-foreground'>
                Automatically set to the day after current end date.
              </p>
            </div>

            {/* New end date */}
            <div className='space-y-2'>
              <Label htmlFor='renew-end'>New End Date *</Label>
              <Input
                id='renew-end'
                type='date'
                min={minNewEndDate}
                {...register('newEndDate')}
                aria-invalid={!!errors.newEndDate}
              />
              {errors.newEndDate && (
                <p className='text-xs text-destructive'>{errors.newEndDate.message}</p>
              )}
            </div>

            {/* Optional new rent */}
            <div className='space-y-2'>
              <Label htmlFor='renew-rent'>New Monthly Rent (VND)</Label>
              <Input
                id='renew-rent'
                type='number'
                min={0}
                step={100000}
                placeholder={String(contract.monthlyRent)}
                {...register('newMonthlyRent', {
                  setValueAs: (v) => {
                    if (v === '') return undefined
                    const parsed = Number(v)
                    return Number.isFinite(parsed) ? parsed : undefined
                  },
                })}
                aria-invalid={!!errors.newMonthlyRent}
              />
              {errors.newMonthlyRent && typeof errors.newMonthlyRent.message === 'string' && (
                <p className='text-xs text-destructive'>{errors.newMonthlyRent.message}</p>
              )}
              <p className='text-xs text-muted-foreground'>
                Leave empty to keep the current rent of {formatCurrency(contract.monthlyRent)}.
              </p>
            </div>

            {/* What happens */}
            <div className='rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-foreground space-y-1'>
              <p className='font-medium'>What happens on renewal:</p>
              <ul className='list-disc pl-4 space-y-0.5'>
                <li>Current contract → Terminated (no deposit refund)</li>
                <li>New Active contract → created with same room, tenant, and deposit</li>
                <li>All active roommates will be carried over</li>
                <li>Room stays Occupied — no interruption</li>
              </ul>
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
              {mutation.isPending ? 'Renewing…' : 'Renew Contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
