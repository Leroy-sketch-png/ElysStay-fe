'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { mapApiErrorsToForm } from '@/lib/form-utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { User, Lock, Shield, Loader2 } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toaster'
import { userKeys, fetchCurrentUser, updateProfile } from '@/lib/queries/users'
import { useAuth } from '@/providers/AuthProvider'

// ─── Schemas ────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = { Owner: 'Chủ nhà', Staff: 'Nhân viên', Tenant: 'Khách thuê' }

const profileSchema = z.object({
  fullName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(200, 'Họ tên không vượt quá 200 ký tự'),
  phone: z.string().regex(/^\d{10}$/, 'Số điện thoại phải đúng 10 chữ số').optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

// ─── Page ───────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: userKeys.me(),
    queryFn: fetchCurrentUser,
  })

  // ─── Profile Form ──────────────────────────────────────
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', phone: '' },
  })

  const { reset: resetForm } = profileForm

  useEffect(() => {
    if (profile) {
      resetForm({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
      })
    }
  }, [profile, resetForm])

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success('Hồ sơ đã cập nhật')
      queryClient.invalidateQueries({ queryKey: userKeys.me() })
    },
    onError: (error: Error) => {
      if (!mapApiErrorsToForm(error, profileForm.setError)) {
        toast.error('Không thể cập nhật hồ sơ', error.message)
      }
    },
  })

  const onProfileSubmit = profileForm.handleSubmit((data) => {
    profileMutation.mutate({
      fullName: data.fullName,
      phone: data.phone || undefined,
    })
  })

  // ─── Render ────────────────────────────────────────────
  return (
    <PageTransition>
    <PageContainer title='Cài đặt' description='Quản lý tài khoản của bạn'>
      {isError && (
        <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center'>
          <p className='font-medium text-destructive'>Không thể tải hồ sơ</p>
          <p className='mt-1 text-sm text-muted-foreground'>{error?.message || 'Đã xảy ra lỗi không mong đợi.'}</p>
        </div>
      )}

      {!isError && (
      <div className='grid gap-6 max-w-2xl'>
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <User className='size-5 text-primary' />
              <div>
                <CardTitle>Hồ sơ</CardTitle>
                <CardDescription>Cập nhật tên hiển thị và thông tin liên hệ</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-4'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>
            ) : (
              <form noValidate onSubmit={onProfileSubmit} className='space-y-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='fullName'>Họ và tên</Label>
                  <Input
                    id='fullName'
                    {...profileForm.register('fullName')}
                    placeholder='Tên của bạn'
                  />
                  {profileForm.formState.errors.fullName && (
                    <p className='text-xs text-destructive'>
                      {profileForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='phone'>Số điện thoại</Label>
                  <Input
                    id='phone'
                    {...profileForm.register('phone')}
                    placeholder='+84 xxx xxx xxx'
                  />
                  {profileForm.formState.errors.phone && (
                    <p className='text-xs text-destructive'>
                      {profileForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className='space-y-1.5'>
                  <Label>Email</Label>
                  <Input
                    value={profile?.email || ''}
                    disabled
                    aria-disabled='true'
                    aria-label='Email hiện tại, chỉ đọc'
                  />
                  <p className='text-xs text-muted-foreground'>
                    Email không thể thay đổi
                  </p>
                </div>

                <div className='flex justify-end'>
                  <Button type='submit' disabled={profileMutation.isPending}>
                    {profileMutation.isPending ? (
                      <>
                        <Loader2 className='size-4 animate-spin' />
                        Đang lưu…
                      </>
                    ) : (
                      'Lưu thay đổi'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Password / Security Card */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <Lock className='size-5 text-primary' />
              <div>
                <CardTitle>Bảo mật</CardTitle>
                <CardDescription>Quản lý mật khẩu và cài đặt đăng nhập</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground mb-4'>
              Tài khoản của bạn được quản lý qua Keycloak.
              Để đổi mật khẩu, cập nhật xác thực hai yếu tố, hoặc quản lý phiên đăng nhập,
              hãy sử dụng Keycloak Account Console.
            </p>
            <a
              href={`${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'elysstay'}/account/#/security/signingin`}
              target='_blank'
              rel='noopener noreferrer'
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                process.env.NEXT_PUBLIC_KEYCLOAK_URL
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed pointer-events-none'
              }`}
              aria-disabled={!process.env.NEXT_PUBLIC_KEYCLOAK_URL}
            >
              <Shield className='size-4' />
              Quản lý bảo mật tài khoản
            </a>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <Shield className='size-5 text-primary' />
              <div>
                <CardTitle>Tài khoản</CardTitle>
                <CardDescription>Thông tin tài khoản của bạn</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='grid gap-3 text-sm'>
              <div className='flex justify-between py-2 border-b'>
                <span className='text-muted-foreground'>Vai trò</span>
                <span className='font-medium'>{user?.roles.map(r => ROLE_LABELS[r] ?? r).join(', ') || '—'}</span>
              </div>
              <div className='flex justify-between py-2'>
                <span className='text-muted-foreground'>Trạng thái tài khoản</span>
                <span className={`font-medium ${profile?.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                  {profile?.status === 'Active' ? 'Hoạt động' : profile?.status === 'Deactivated' ? 'Vô hiệu hóa' : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}
    </PageContainer>
    </PageTransition>
  )
}
