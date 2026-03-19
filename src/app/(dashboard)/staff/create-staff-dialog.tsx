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
import { staffKeys, createStaffUser } from '@/lib/queries/staff'
import type { CreateStaffRequest } from '@/types/api'

// ─── Validation ─────────────────────────────────────────

const staffSchema = z.object({
  email: z.string().trim().email('Valid email required'),
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type StaffFormData = z.infer<typeof staffSchema>

// ─── Props ──────────────────────────────────────────────

interface CreateStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateStaffDialog({ open, onOpenChange }: CreateStaffDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { email: '', fullName: '', phone: '', password: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ email: '', fullName: '', phone: '', password: '' })
    }
  }, [open, reset])

  const createMutation = useMutation({
    mutationFn: (data: CreateStaffRequest) => createStaffUser(data),
    onSuccess: () => {
      toast.success('Staff account created', 'They can now log in and be assigned to buildings.')
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      onOpenChange(false)
    },
    onError: (error: Error & { status?: number; errors?: Record<string, string[]> }) => {
      if ((error as { status?: number }).status === 409) {
        toast.error('Email already exists', 'A user with this email address already exists.')
      } else {
        toast.error('Failed to create staff', error.message)
      }
    },
  })

  const onSubmit = (data: StaffFormData) => {
    createMutation.mutate({
      email: data.email,
      fullName: data.fullName,
      phone: data.phone || undefined,
      password: data.password,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='sm'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>
            Create a new staff account. They will be able to log in and manage assigned buildings.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='staff-name'>Full Name *</Label>
              <Input
                id='staff-name'
                placeholder='Enter full name'
                {...register('fullName')}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && <p className='text-xs text-destructive'>{errors.fullName.message}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='staff-email'>Email *</Label>
              <Input
                id='staff-email'
                type='email'
                placeholder='staff@example.com'
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className='text-xs text-destructive'>{errors.email.message}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='staff-phone'>Phone</Label>
              <Input
                id='staff-phone'
                type='tel'
                placeholder='10 digits (optional)'
                {...register('phone')}
              />
              {errors.phone && <p className='text-xs text-destructive'>{errors.phone.message}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='staff-pass'>Password *</Label>
              <Input
                id='staff-pass'
                type='password'
                placeholder='Min 8 characters'
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className='text-xs text-destructive'>{errors.password.message}</p>}
              <p className='text-xs text-muted-foreground'>
                Staff can change their password after first login.
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type='submit' disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Staff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
