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
import { toast } from '@/components/ui/toaster'
import { serviceKeys, createService, updateService } from '@/lib/queries/services'
import type { ServiceDto, CreateServiceRequest, UpdateServiceRequest } from '@/types/api'

// ─── Validation ─────────────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(1, 'Tên là bắt buộc').max(200),
  unit: z.string().min(1, 'Đơn vị là bắt buộc').max(50),
  unitPrice: z.number().positive('Giá phải lớn hơn 0'),
  isMetered: z.enum(['true', 'false']),
})

type ServiceFormData = z.infer<typeof serviceSchema>

// ─── Props ──────────────────────────────────────────────

interface ServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  buildingId: string
  service?: ServiceDto
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  mode,
  buildingId,
  service,
}: ServiceFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = mode === 'edit'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: '', unit: '', unitPrice: 1000, isMetered: 'false' },
  })

  useEffect(() => {
    if (open) {
      if (isEdit && service) {
        reset({
          name: service.name,
          unit: service.unit,
          unitPrice: service.unitPrice,
          isMetered: service.isMetered ? 'true' : 'false',
        })
      } else {
        reset({ name: '', unit: '', unitPrice: 0, isMetered: 'false' })
      }
    }
  }, [open, isEdit, service, reset])

  const createMutation = useMutation({
    mutationFn: (data: CreateServiceRequest) => createService(buildingId, data),
    onSuccess: () => {
      toast.success('Đã tạo dịch vụ')
      queryClient.invalidateQueries({ queryKey: serviceKeys.byBuilding(buildingId) })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Tạo dịch vụ thất bại', error.message),
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateServiceRequest) => updateService(service!.id, data),
    onSuccess: () => {
      toast.success('Đã cập nhật dịch vụ')
      queryClient.invalidateQueries({ queryKey: serviceKeys.byBuilding(buildingId) })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Cập nhật dịch vụ thất bại', error.message),
  })

  const onSubmit = (data: ServiceFormData) => {
    const payload = {
      name: data.name,
      unit: data.unit,
      unitPrice: data.unitPrice,
      isMetered: data.isMetered === 'true',
    }
    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='sm'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Cập nhật cấu hình dịch vụ. Thay đổi giá được theo dõi tự động.'
              : 'Thêm dịch vụ mới cho tòa nhà.'}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='svc-name'>Tên dịch vụ *</Label>
              <Input id='svc-name' placeholder='VD: Điện' {...register('name')} aria-invalid={!!errors.name} />
              {errors.name && <p className='text-xs text-destructive'>{errors.name.message}</p>}
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='svc-unit'>Đơn vị *</Label>
                <Input id='svc-unit' placeholder='VD: kWh' {...register('unit')} aria-invalid={!!errors.unit} />
                {errors.unit && <p className='text-xs text-destructive'>{errors.unit.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='svc-price'>Đơn giá (VND) *</Label>
                <Input id='svc-price' type='number' min={0} step={100} {...register('unitPrice', { valueAsNumber: true })} aria-invalid={!!errors.unitPrice} />
                {errors.unitPrice && <p className='text-xs text-destructive'>{errors.unitPrice.message}</p>}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='svc-metered'>Loại tính phí *</Label>
              <Select id='svc-metered' {...register('isMetered')}>
                <option value='false'>Cố định (theo kỳ)</option>
                <option value='true'>Đo đếm (cần ghi chỉ số)</option>
              </Select>
              <p className='text-xs text-muted-foreground'>
                Dịch vụ đo đếm sử dụng chỉ số điện/nước để tính phí.
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={isPending}>
              Hủy
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo dịch vụ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
