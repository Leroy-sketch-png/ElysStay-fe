'use client'

import { useAuth } from '@/providers/AuthProvider'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Guard component that requires authentication.
 * Shows loading skeleton while auth initializes.
 * Redirects to Keycloak login if not authenticated.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { initialized, authenticated, login } = useAuth()

  if (!initialized) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <div className='size-12 rounded-full border-4 border-primary border-t-transparent animate-spin' />
          <p className='text-sm text-muted-foreground'>Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    // Trigger Keycloak login redirect
    login()
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <Skeleton className='h-8 w-48' />
          <p className='text-sm text-muted-foreground'>Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
