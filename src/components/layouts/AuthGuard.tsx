'use client'

import { useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'

/**
 * Guard component that requires authentication.
 * Shows loading spinner while auth initializes.
 * Redirects to Keycloak login if not authenticated.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { initialized, authenticated, login } = useAuth()

  useEffect(() => {
    if (initialized && !authenticated) {
      login()
    }
  }, [initialized, authenticated, login])

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
