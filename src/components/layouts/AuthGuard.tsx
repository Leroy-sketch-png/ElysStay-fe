'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { Building2 } from 'lucide-react'

/**
 * Guard component that requires authentication.
 * Shows a branded loading state while auth initializes.
 * Redirects to /login if not authenticated.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { initialized, authenticated, authError, login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (initialized && !authenticated && !authError) {
      router.replace('/login')
    }
  }, [initialized, authenticated, authError, router])

  if (initialized && !authenticated && authError) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background px-6'>
        <div className='w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm' role='alert'>
          <div className='space-y-4 text-center'>
            <div className='mx-auto flex size-12 items-center justify-center rounded-xl bg-destructive/10'>
              <svg className='size-6 text-destructive' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z' />
              </svg>
            </div>
            <div>
              <h1 className='text-lg font-semibold text-foreground'>Không thể xác thực</h1>
              <p className='mt-1 text-sm text-muted-foreground'>{authError}</p>
            </div>
            <button
              type='button'
              onClick={login}
              className='inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 cursor-pointer'
            >
              Thử đăng nhập lại
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!initialized || !authenticated) {
    return (
      <div className='flex h-screen items-center justify-center bg-background' role='status'>
        <div className='flex flex-col items-center gap-4'>
          <div className='flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
            <Building2 className='size-6' />
          </div>
          <div className='size-6 rounded-full border-[2.5px] border-primary border-t-transparent animate-spin motion-reduce:animate-none' aria-hidden='true' />
          <p className='text-sm text-muted-foreground'>
            {!initialized ? 'Đang xác thực...' : 'Đang chuyển hướng...'}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
