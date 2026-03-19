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
import { tenantKeys, createTenant } from '@/lib/queries/tenants'
import type { CreateTenantRequest } from '@/types/api'

// ─── Validation ─────────────────────────────────────────

const tenantSchema = z.object({
  email: z.string().trim().email('Valid email required'),
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type TenantFormData = z.infer<typeof tenantSchema>

// ─── Props ──────────────────────────────────────────────

interface CreateTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTenantDialog({ open, onOpenChange }: CreateTenantDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { email: '', fullName: '', phone: '', password: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ email: '', fullName: '', phone: '', password: '' })
    }
  }, [open, reset])

  const createMutation = useMutation({
    mutationFn: (data: CreateTenantRequest) => createTenant(data),
    onSuccess: () => {
      toast.success('Tenant account created', 'Their profile can now be completed and a contract can be created.')
      queryClient.invalidateQueries({ queryKey: tenantKeys.all })
      onOpenChange(false)
    },
    onError: (error: Error & { status?: number }) => {
      if ((error as { status?: number }).status === 409) {
        toast.error('Email already exists', 'A user with this email address already exists.')
      } else {
        toast.error('Failed to create tenant', error.message)
      }
    },
  })

  const onSubmit = (data: TenantFormData) => {
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
          <DialogTitle>Add Tenant</DialogTitle>
          <DialogDescription>
            Create a new tenant account. They will be able to log in and view their room, invoices, and issues.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='tenant-name'>Full Name *</Label>
              <Input
                id='tenant-name'
                placeholder='Enter full name'
                {...register('fullName')}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && <p className='text-xs text-destructive'>{errors.fullName.message}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='tenant-email'>Email *</Label>
              <Input
                id='tenant-email'
                type='email'
                placeholder='tenant@example.com'
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className='text-xs text-destructive'>{errors.email.message}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='tenant-phone'>Phone</Label>
              <Input
                id='tenant-phone'
                type='tel'
                placeholder='10 digits (optional)'
                {...register('phone')}
              />
              {errors.phone && <p className='text-xs text-destructive'>{errors.phone.message}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='tenant-pass'>Password *</Label>
              <Input
                id='tenant-pass'
                type='password'
                placeholder='Min 8 characters'
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className='text-xs text-destructive'>{errors.password.message}</p>}
              <p className='text-xs text-muted-foreground'>
                Tenant can change their password after first login.
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type='submit' disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
