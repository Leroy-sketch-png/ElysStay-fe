'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { toast } from '@/components/ui/toaster'

// Route prefixes requiring specific roles.
// Routes not listed are accessible to all authenticated users.
// Sorted longest-prefix-first so `/billing/meter-readings` matches before a hypothetical `/billing`.
const ROUTE_ROLES: { prefix: string; roles: string[] }[] = [
  { prefix: '/billing/meter-readings', roles: ['Owner', 'Staff'] },
  { prefix: '/buildings', roles: ['Owner', 'Staff'] },
  { prefix: '/rooms', roles: ['Owner', 'Staff'] },
  { prefix: '/tenants', roles: ['Owner', 'Staff'] },
  { prefix: '/reservations', roles: ['Owner', 'Staff'] },
  { prefix: '/contracts', roles: ['Owner', 'Staff'] },
  { prefix: '/expenses', roles: ['Owner', 'Staff'] },
  { prefix: '/reports/pnl', roles: ['Owner'] },
  { prefix: '/staff', roles: ['Owner'] },
  { prefix: '/settings', roles: ['Owner'] },
]

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, hasRole } = useAuth()
  const deniedPathRef = useRef<string | null>(null)

  const rule = ROUTE_ROLES.find(
    r => pathname === r.prefix || pathname.startsWith(r.prefix + '/'),
  )

  const allowed = !rule || rule.roles.some(r => hasRole(r))

  useEffect(() => {
    if (allowed) {
      deniedPathRef.current = null
      return
    }

    if (user && deniedPathRef.current !== pathname) {
      deniedPathRef.current = pathname
      toast.error('Truy cập bị từ chối', 'Bạn không có quyền truy cập trang này.')
      router.replace('/dashboard')
    }
  }, [user, allowed, pathname, router])

  if (!allowed) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <div className='size-12 rounded-full border-4 border-primary border-t-transparent animate-spin' />
          <p className='text-sm text-muted-foreground'>Đang chuyển hướng...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
