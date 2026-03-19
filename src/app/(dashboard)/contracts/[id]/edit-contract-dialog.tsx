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
import { contractKeys, updateContract } from '@/lib/queries/contracts'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import type { ContractDetailDto, UpdateContractRequest } from '@/types/api'

// ─── Schema ─────────────────────────────────────────────

const editSchema = z.object({
  endDate: z.string().min(1, 'End date is required'),
  monthlyRent: z.number().positive('Rent must be positive'),
  note: z.string().max(500).optional().or(z.literal('')),
})

type EditFormData = z.infer<typeof editSchema>

// ─── Props ──────────────────────────────────────────────

interface EditContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractDetailDto
}

export function EditContractDialog({
  open,
  onOpenChange,
  contract,
}: EditContractDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      endDate: contract.endDate.split('T')[0],
      monthlyRent: contract.monthlyRent,
      note: contract.note ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        endDate: contract.endDate.split('T')[0],
        monthlyRent: contract.monthlyRent,
        note: contract.note ?? '',
      })
    }
  }, [open, reset, contract])

  const mutation = useMutation({
    mutationFn: (data: UpdateContractRequest) => updateContract(contract.id, data),
    onSuccess: () => {
      toast.success('Contract updated')
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to update contract', error.message)
    },
  })

  const onSubmit = (data: EditFormData) => {
    // Only send changed fields
    const payload: UpdateContractRequest = {}
    const currentEndDate = contract.endDate.split('T')[0]
    if (data.endDate !== currentEndDate) payload.endDate = data.endDate
    if (data.monthlyRent !== contract.monthlyRent) payload.monthlyRent = data.monthlyRent
    if ((data.note ?? '') !== (contract.note ?? '')) payload.note = data.note || undefined

    if (Object.keys(payload).length === 0) {
      toast.info('No changes', 'Nothing was modified.')
      onOpenChange(false)
      return
    }

    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Edit Contract</DialogTitle>
          <DialogDescription>
            Update terms for Room {contract.roomNumber} ({contract.tenantName}).
            Room assignment and main tenant cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-5'>
            {/* End Date */}
            <div className='space-y-2'>
              <Label htmlFor='edit-end'>End Date *</Label>
              <Input
                id='edit-end'
                type='date'
                min={contract.startDate.split('T')[0]}
                {...register('endDate')}
                aria-invalid={!!errors.endDate}
              />
              {errors.endDate && (
                <p className='text-xs text-destructive'>{errors.endDate.message}</p>
              )}
            </div>

            {/* Monthly Rent */}
            <div className='space-y-2'>
              <Label htmlFor='edit-rent'>Monthly Rent (VND) *</Label>
              <Input
                id='edit-rent'
                type='number'
                min={0}
                step={100000}
                {...register('monthlyRent', { valueAsNumber: true })}
                aria-invalid={!!errors.monthlyRent}
              />
              {errors.monthlyRent && (
                <p className='text-xs text-destructive'>{errors.monthlyRent.message}</p>
              )}
            </div>

            {/* Note */}
            <div className='space-y-2'>
              <Label htmlFor='edit-note'>Note</Label>
              <Textarea
                id='edit-note'
                placeholder='Any additional notes…'
                rows={2}
                {...register('note')}
              />
            </div>

            <p className='text-xs text-muted-foreground'>
              Room and tenant cannot be changed (CT-03). To reassign, terminate this contract and create a new one.
            </p>
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
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
