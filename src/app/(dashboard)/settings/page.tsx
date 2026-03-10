'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { userKeys, fetchCurrentUser, updateProfile, changePassword } from '@/lib/queries/users'
import { useAuth } from '@/providers/AuthProvider'

// ─── Schemas ────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

// ─── Page ───────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: userKeys.me(),
    queryFn: fetchCurrentUser,
  })

  // ─── Profile Form ──────────────────────────────────────
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', phone: '' },
  })

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success('Profile updated')
      queryClient.invalidateQueries({ queryKey: userKeys.me() })
    },
    onError: () => {
      toast.error('Failed to update profile')
    },
  })

  const onProfileSubmit = profileForm.handleSubmit((data) => {
    profileMutation.mutate({
      fullName: data.fullName,
      phone: data.phone || undefined,
    })
  })

  // ─── Password Form ─────────────────────────────────────
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormData) =>
      changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast.success('Password changed')
      passwordForm.reset()
    },
    onError: () => {
      toast.error('Failed to change password', 'Check your current password')
    },
  })

  const onPasswordSubmit = passwordForm.handleSubmit((data) => {
    passwordMutation.mutate(data)
  })

  // ─── Render ────────────────────────────────────────────
  return (
    <PageTransition>
    <PageContainer title='Settings' description='Manage your account'>
      <div className='grid gap-6 max-w-2xl'>
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <User className='size-5 text-primary' />
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your display name and contact info</CardDescription>
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
              <form onSubmit={onProfileSubmit} className='space-y-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='fullName'>Full Name</Label>
                  <Input
                    {...profileForm.register('fullName')}
                    placeholder='Your name'
                  />
                  {profileForm.formState.errors.fullName && (
                    <p className='text-xs text-destructive'>
                      {profileForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='phone'>Phone</Label>
                  <Input
                    {...profileForm.register('phone')}
                    placeholder='+84 xxx xxx xxx'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label>Email</Label>
                  <Input value={profile?.email || ''} disabled />
                  <p className='text-xs text-muted-foreground'>
                    Email cannot be changed
                  </p>
                </div>

                <div className='flex justify-end'>
                  <Button type='submit' disabled={profileMutation.isPending}>
                    {profileMutation.isPending ? (
                      <>
                        <Loader2 className='mr-2 size-4 animate-spin' />
                        Saving…
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <Lock className='size-5 text-primary' />
              <div>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onPasswordSubmit} className='space-y-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='currentPassword'>Current Password</Label>
                <Input
                  type='password'
                  {...passwordForm.register('currentPassword')}
                  placeholder='••••••••'
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className='text-xs text-destructive'>
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='newPassword'>New Password</Label>
                <Input
                  type='password'
                  {...passwordForm.register('newPassword')}
                  placeholder='••••••••'
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className='text-xs text-destructive'>
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='confirmPassword'>Confirm Password</Label>
                <Input
                  type='password'
                  {...passwordForm.register('confirmPassword')}
                  placeholder='••••••••'
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className='text-xs text-destructive'>
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className='flex justify-end'>
                <Button type='submit' disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? (
                    <>
                      <Loader2 className='mr-2 size-4 animate-spin' />
                      Updating…
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <Shield className='size-5 text-primary' />
              <div>
                <CardTitle>Account</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='grid gap-3 text-sm'>
              <div className='flex justify-between py-2 border-b'>
                <span className='text-muted-foreground'>Role</span>
                <span className='font-medium'>{user?.roles.join(', ') || '—'}</span>
              </div>
              <div className='flex justify-between py-2'>
                <span className='text-muted-foreground'>Account Status</span>
                <span className={`font-medium ${profile?.status === 'Active' ? 'text-green-600' : 'text-destructive'}`}>
                  {profile?.status ?? '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
    </PageTransition>
  )
}
