'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { mapApiErrorsToForm } from '@/lib/form-utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Copy, Check, KeyRound } from 'lucide-react'
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
import type { CreateStaffRequest, CreateUserResultDto } from '@/types/api'

// ─── Validation ─────────────────────────────────────────

const staffSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ').max(254, 'Email không vượt quá 254 ký tự'),
  fullName: z.string().trim().min(1, 'Họ tên là bắt buộc').max(200, 'Họ tên không vượt quá 200 ký tự'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Số điện thoại phải đủ 10 chữ số').optional().or(z.literal('')),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
})

type StaffFormData = z.infer<typeof staffSchema>

// ─── Props ──────────────────────────────────────────────

interface CreateStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateStaffDialog({ open, onOpenChange }: CreateStaffDialogProps) {
  const queryClient = useQueryClient()
  const [createdUser, setCreatedUser] = useState<CreateUserResultDto | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { email: '', fullName: '', phone: '', password: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ email: '', fullName: '', phone: '', password: '' })
      setCreatedUser(null)
      setCopied(false)
    }
  }, [open, reset])

  const createMutation = useMutation({
    mutationFn: (data: CreateStaffRequest) => createStaffUser(data),
    onSuccess: (result) => {
      setCreatedUser(result)
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
    },
    onError: (error: Error & { status?: number }) => {
      if (mapApiErrorsToForm(error, setError)) return
      if ((error as { status?: number }).status === 409) {
        toast.error('Email đã tồn tại', 'Đã có tài khoản sử dụng email này.')
      } else {
        toast.error('Không thể tạo nhân viên', error.message)
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

  const handleCopyCredentials = async () => {
    if (!createdUser) return
    const text = `Email: ${createdUser.email}\nMật khẩu: ${createdUser.temporaryPassword}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Đã sao chép thông tin đăng nhập')
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── Success State ─────────────────────────────────────
  if (createdUser) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size='sm'>
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Tạo tài khoản thành công</DialogTitle>
            <DialogDescription>
              Hãy gửi thông tin đăng nhập dưới đây cho nhân viên. Mật khẩu chỉ hiển thị một lần duy nhất.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className='space-y-4'>
            <div className='rounded-lg border bg-muted/30 p-4 space-y-3'>
              <div className='flex items-center gap-2 text-sm'>
                <span className='text-muted-foreground w-20'>Họ tên:</span>
                <span className='font-medium'>{createdUser.fullName}</span>
              </div>
              <div className='flex items-center gap-2 text-sm'>
                <span className='text-muted-foreground w-20'>Email:</span>
                <span className='font-medium'>{createdUser.email}</span>
              </div>
              <div className='flex items-center gap-2 text-sm'>
                <KeyRound className='size-4 text-muted-foreground' />
                <span className='text-muted-foreground'>Mật khẩu:</span>
                <code className='rounded bg-background px-2 py-0.5 font-mono text-sm font-semibold'>
                  {createdUser.temporaryPassword}
                </code>
              </div>
            </div>

            <p className='text-xs text-warning font-medium'>
              Nhân viên nên đổi mật khẩu ngay sau khi đăng nhập lần đầu.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button variant='outline' onClick={handleCopyCredentials}>
              {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
              {copied ? 'Đã sao chép' : 'Sao chép thông tin'}
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Form State ────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='sm'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Thêm nhân viên</DialogTitle>
          <DialogDescription>
            Tạo tài khoản nhân viên mới. Họ có thể đăng nhập và quản lý tòa nhà được phân công.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='staff-name'>Họ tên *</Label>
              <Input
                id='staff-name'
                placeholder='Nhập họ tên đầy đủ'
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
                placeholder='email@example.com'
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className='text-xs text-destructive'>{errors.email.message}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='staff-phone'>Số điện thoại</Label>
              <Input
                id='staff-phone'
                type='tel'
                placeholder='10 chữ số (không bắt buộc)'
                {...register('phone')}
              />
              {errors.phone && <p className='text-xs text-destructive'>{errors.phone.message}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='staff-pass'>Mật khẩu *</Label>
              <Input
                id='staff-pass'
                type='password'
                placeholder='Tối thiểu 8 ký tự'
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className='text-xs text-destructive'>{errors.password.message}</p>}
              <p className='text-xs text-muted-foreground'>
                Nhân viên có thể đổi mật khẩu sau khi đăng nhập.
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              Hủy
            </Button>
            <Button type='submit' disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang tạo…' : 'Tạo nhân viên'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
