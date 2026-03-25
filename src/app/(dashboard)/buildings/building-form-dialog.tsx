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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { buildingKeys, createBuilding, updateBuilding } from '@/lib/queries/buildings'
import { userKeys } from '@/lib/queries/users'
import type { BuildingDto, CreateBuildingRequest, UpdateBuildingRequest } from '@/types/api'

// ─── Validation ─────────────────────────────────────────

const buildingSchema = z.object({
  name: z.string().trim().min(1, 'Tên là bắt buộc').max(200, 'Tên quá dài'),
  address: z.string().trim().min(1, 'Địa chỉ là bắt buộc').max(500, 'Địa chỉ quá dài'),
  description: z.string().trim().max(2000, 'Mô tả quá dài').optional().or(z.literal('')),
  totalFloors: z.preprocess(
    (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
    z.number().int().min(1, 'Tối thiểu 1 tầng').max(200, 'Tối đa 200 tầng'),
  ),
  invoiceDueDay: z.preprocess(
    (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
    z.number().int().min(1, 'Ngày tối thiểu 1').max(28, 'Ngày tối đa 28'),
  ),
})

type BuildingFormInput = z.input<typeof buildingSchema>
type BuildingFormData = z.output<typeof buildingSchema>

// ─── Props ──────────────────────────────────────────────

interface BuildingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  building?: BuildingDto
}

export function BuildingFormDialog({
  open,
  onOpenChange,
  mode,
  building,
}: BuildingFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = mode === 'edit'

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BuildingFormInput, unknown, BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: '',
      address: '',
      description: '',
      totalFloors: 1,
      invoiceDueDay: 10,
    },
  })

  // Reset form when dialog opens or building changes
  useEffect(() => {
    if (open) {
      if (isEdit && building) {
        reset({
          name: building.name,
          address: building.address,
          description: building.description ?? '',
          totalFloors: building.totalFloors,
          invoiceDueDay: building.invoiceDueDay,
        })
      } else {
        reset({
          name: '',
          address: '',
          description: '',
          totalFloors: 1,
          invoiceDueDay: 10,
        })
      }
    }
  }, [open, isEdit, building, reset])

  const createMutation = useMutation({
    mutationFn: (data: CreateBuildingRequest) => createBuilding(data),
    onSuccess: () => {
      toast.success('Tòa nhà đã tạo', 'Tòa nhà và dịch vụ mặc định đã sẵn sàng.')
      queryClient.invalidateQueries({ queryKey: buildingKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      if (!mapApiErrorsToForm(error, setError)) {
        toast.error('Không thể tạo tòa nhà', error.message)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBuildingRequest) => updateBuilding(building!.id, data),
    onSuccess: (updatedBuilding) => {
      toast.success('Tòa nhà đã cập nhật')
      queryClient.setQueryData(buildingKeys.detail(building!.id), (current: BuildingDto | undefined) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          ...updatedBuilding,
        }
      })
      queryClient.invalidateQueries({ queryKey: buildingKeys.all })
      queryClient.invalidateQueries({ queryKey: buildingKeys.detail(building!.id) })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      if (!mapApiErrorsToForm(error, setError)) {
        toast.error('Không thể cập nhật tòa nhà', error.message)
      }
    },
  })

  const onSubmit = (data: BuildingFormData) => {
    const payload = {
      name: data.name,
      address: data.address,
      description: data.description || undefined,
      totalFloors: data.totalFloors,
      invoiceDueDay: data.invoiceDueDay,
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
      <DialogContent size='md'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa tòa nhà' : 'Thêm tòa nhà'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Cập nhật thông tin tòa nhà.'
              : 'Nhập thông tin tòa nhà mới. 5 dịch vụ mặc định sẽ được tạo tự động.'}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            {/* Name */}
            <div className='space-y-2'>
              <Label htmlFor='name'>Tên tòa nhà *</Label>
              <Input id='name' placeholder='Ví dụ: Chung cư Sunrise' {...register('name')} aria-invalid={!!errors.name} />
              {errors.name && <p className='text-xs text-destructive'>{errors.name.message}</p>}
            </div>

            {/* Address */}
            <div className='space-y-2'>
              <Label htmlFor='address'>Địa chỉ *</Label>
              <Input id='address' placeholder='Ví dụ: 123 Nguyễn Văn Linh, Đà Nẵng' {...register('address')} aria-invalid={!!errors.address} />
              {errors.address && <p className='text-xs text-destructive'>{errors.address.message}</p>}
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label htmlFor='description'>Mô tả</Label>
              <Textarea id='description' placeholder='Ghi chú về tòa nhà (không bắt buộc)…' rows={3} {...register('description')} aria-invalid={!!errors.description} />
              {errors.description && <p className='text-xs text-destructive'>{errors.description.message}</p>}
            </div>

            {/* Row: Floors + Invoice Due Day */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='totalFloors'>Số tầng *</Label>
                <Input id='totalFloors' type='number' min={1} max={200} {...register('totalFloors', { valueAsNumber: true })} aria-invalid={!!errors.totalFloors} />
                {errors.totalFloors && <p className='text-xs text-destructive'>{errors.totalFloors.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='invoiceDueDay'>Ngày hạn hóa đơn *</Label>
                <Input id='invoiceDueDay' type='number' min={1} max={28} {...register('invoiceDueDay', { valueAsNumber: true })} aria-invalid={!!errors.invoiceDueDay} />
                <p className='text-xs text-muted-foreground'>Ngày trong tháng (1-28)</p>
                {errors.invoiceDueDay && <p className='text-xs text-destructive'>{errors.invoiceDueDay.message}</p>}
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={isPending}>
              Hủy
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? (isEdit ? 'Đang lưu…' : 'Đang tạo…') : isEdit ? 'Lưu thay đổi' : 'Tạo tòa nhà'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
