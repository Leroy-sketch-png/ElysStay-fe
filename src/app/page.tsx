'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'

export default function HomePage() {
  const { initialized, authenticated, login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!initialized) return
    if (authenticated) {
      router.replace('/dashboard')
    }
  }, [initialized, authenticated, router])

  if (!initialized) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='size-10 rounded-full border-4 border-primary border-t-transparent animate-spin' />
      </div>
    )
  }

  // Not authenticated — show landing/login
  return (
    <div className='flex h-screen flex-col items-center justify-center gap-8'>
      <div className='text-center'>
        <h1 className='text-4xl font-bold tracking-tight'>ElysStay</h1>
        <p className='mt-2 text-lg text-muted-foreground'>
          Smart Rental Property Management
        </p>
      </div>
      <button
        onClick={login}
        className='rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer'
      >
        Sign in to continue
      </button>
    </div>
  )
}
