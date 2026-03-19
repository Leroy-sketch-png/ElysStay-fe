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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { buildingKeys, createBuilding, updateBuilding } from '@/lib/queries/buildings'
import { userKeys } from '@/lib/queries/users'
import type { BuildingDto, CreateBuildingRequest, UpdateBuildingRequest } from '@/types/api'

// ─── Validation ─────────────────────────────────────────

const buildingSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name too long'),
  address: z.string().trim().min(1, 'Address is required').max(500, 'Address too long'),
  description: z.string().trim().max(2000, 'Description too long').optional().or(z.literal('')),
  totalFloors: z.preprocess(
    (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
    z.number().int().min(1, 'At least 1 floor').max(100, 'Max 100 floors'),
  ),
  invoiceDueDay: z.preprocess(
    (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
    z.number().int().min(1, 'Min day 1').max(28, 'Max day 28'),
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
      toast.success('Building created', 'Your building and default services are ready.')
      queryClient.invalidateQueries({ queryKey: buildingKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to create building', error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBuildingRequest) => updateBuilding(building!.id, data),
    onSuccess: () => {
      toast.success('Building updated')
      queryClient.invalidateQueries({ queryKey: buildingKeys.all })
      queryClient.invalidateQueries({ queryKey: buildingKeys.detail(building!.id) })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to update building', error.message)
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
          <DialogTitle>{isEdit ? 'Edit Building' : 'Add Building'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update your building information.'
              : 'Enter details for your new building. 5 default services will be created automatically.'}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            {/* Name */}
            <div className='space-y-2'>
              <Label htmlFor='name'>Building Name *</Label>
              <Input id='name' placeholder='e.g. Sunrise Apartments' {...register('name')} aria-invalid={!!errors.name} />
              {errors.name && <p className='text-xs text-destructive'>{errors.name.message}</p>}
            </div>

            {/* Address */}
            <div className='space-y-2'>
              <Label htmlFor='address'>Address *</Label>
              <Input id='address' placeholder='e.g. 123 Nguyen Van Linh, Da Nang' {...register('address')} aria-invalid={!!errors.address} />
              {errors.address && <p className='text-xs text-destructive'>{errors.address.message}</p>}
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea id='description' placeholder='Optional notes about this building…' rows={3} {...register('description')} aria-invalid={!!errors.description} />
              {errors.description && <p className='text-xs text-destructive'>{errors.description.message}</p>}
            </div>

            {/* Row: Floors + Invoice Due Day */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='totalFloors'>Total Floors *</Label>
                <Input id='totalFloors' type='number' min={1} max={100} {...register('totalFloors', { valueAsNumber: true })} aria-invalid={!!errors.totalFloors} />
                {errors.totalFloors && <p className='text-xs text-destructive'>{errors.totalFloors.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='invoiceDueDay'>Invoice Due Day *</Label>
                <Input id='invoiceDueDay' type='number' min={1} max={28} {...register('invoiceDueDay', { valueAsNumber: true })} aria-invalid={!!errors.invoiceDueDay} />
                <p className='text-xs text-muted-foreground'>Day of month (1-28)</p>
                {errors.invoiceDueDay && <p className='text-xs text-destructive'>{errors.invoiceDueDay.message}</p>}
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save Changes' : 'Create Building'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
