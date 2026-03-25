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
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { contractKeys, updateContract } from '@/lib/queries/contracts'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import type { ContractDetailDto, UpdateContractRequest } from '@/types/api'

// ─── Schema ─────────────────────────────────────────────

const editSchema = z.object({
  endDate: z.string().min(1, 'Ngày kết thúc là bắt buộc'),
  monthlyRent: z.number().positive('Tiền thuê phải lớn hơn 0'),
  note: z.string().max(1000, 'Ghi chú không vượt quá 1000 ký tự').optional().or(z.literal('')),
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
    setError,
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
      toast.success('Đã cập nhật hợp đồng')
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contract.id) })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      if (!mapApiErrorsToForm(error, setError)) {
        toast.error('Cập nhật hợp đồng thất bại', error.message)
      }
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
      toast.info('Không có thay đổi', 'Không có gì được sửa.')
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
          <DialogTitle>Sửa hợp đồng</DialogTitle>
          <DialogDescription>
            Cập nhật điều khoản cho Phòng {contract.roomNumber} ({contract.tenantName}).
            Không thể thay đổi phòng và khách chính.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-5'>
            {/* End Date */}
            <div className='space-y-2'>
              <Label htmlFor='edit-end'>Ngày kết thúc *</Label>
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
              <Label htmlFor='edit-rent'>Tiền thuê/tháng (VND) *</Label>
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
              <Label htmlFor='edit-note'>Ghi chú</Label>
              <Textarea
                id='edit-note'
                placeholder='Ghi chú bổ sung…'
                rows={2}
                {...register('note')}
              />
            </div>

            <p className='text-xs text-muted-foreground'>
              Phòng và khách thuê không thể thay đổi (CT-03). Để chuyển, hãy chấm dứt và tạo hợp đồng mới.
            </p>
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
            <Button type='submit' loading={mutation.isPending}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
