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
import { formatCurrency, formatDate } from '@/lib/utils'
import { contractKeys, renewContract } from '@/lib/queries/contracts'
import type { ContractDetailDto, RenewContractRequest } from '@/types/api'

// ─── Schema ─────────────────────────────────────────────

const renewSchema = z.object({
  newEndDate: z.string().min(1, 'New end date is required'),
  newMonthlyRent: z.union([
    z.literal(0),
    z.number().positive('Rent must be positive'),
  ]).optional(),
})

type RenewFormData = z.infer<typeof renewSchema>

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
  const newStartDate = (() => {
    const d = new Date(contract.endDate)
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  // Default new end: 1 year from new start
  const defaultNewEnd = (() => {
    const d = new Date(newStartDate)
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().split('T')[0]
  })()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RenewFormData>({
    resolver: zodResolver(renewSchema),
    defaultValues: {
      newEndDate: defaultNewEnd,
      newMonthlyRent: 0,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        newEndDate: defaultNewEnd,
        newMonthlyRent: 0,
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

        <form onSubmit={handleSubmit(onSubmit)}>
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
                min={newStartDate}
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
                {...register('newMonthlyRent', { valueAsNumber: true })}
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
            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 space-y-1'>
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
