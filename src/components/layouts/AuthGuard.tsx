'use client'

import { useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

/**
 * Guard component that requires authentication.
 * Shows loading spinner while auth initializes.
 * Redirects to Keycloak login if not authenticated.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { initialized, authenticated, authError, login } = useAuth()

  useEffect(() => {
    if (initialized && !authenticated && !authError) {
      login()
    }
  }, [initialized, authenticated, authError, login])

  if (initialized && !authenticated && authError) {
    return (
      <div className='flex min-h-screen items-center justify-center px-6'>
        <div className='w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm'>
          <div className='space-y-3 text-center'>
            <h1 className='text-lg font-semibold text-foreground'>Không thể xác thực</h1>
            <p className='text-sm text-muted-foreground'>{authError}</p>
            <button
              type='button'
              onClick={login}
              className='inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90'
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
      <div className='flex h-screen items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <div className='size-12 rounded-full border-4 border-primary border-t-transparent animate-spin' />
          <p className='text-sm text-muted-foreground'>
            {!initialized ? 'Đang xác thực...' : 'Đang chuyển hướng đăng nhập...'}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
