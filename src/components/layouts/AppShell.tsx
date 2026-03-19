'use client'

import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  LayoutDashboard,
  Users,
  DoorOpen,
  FileText,
  Wrench,
  Receipt,
  CreditCard,
  Gauge,
  DollarSign,
  CalendarClock,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  Menu,
  LogOut,
  UserCog,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  Home,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { SIDEBAR, HEADER, Z_INDEX } from '@/lib/layout-constants'
import { NotificationBell } from './NotificationBell'

// ─── Navigation Config ──────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Buildings', href: '/buildings', icon: Building2, roles: ['Owner', 'Staff'] },
  { label: 'Rooms', href: '/rooms', icon: DoorOpen, roles: ['Owner', 'Staff'] },
  { label: 'Tenants', href: '/tenants', icon: Users, roles: ['Owner', 'Staff'] },
  { label: 'Reservations', href: '/reservations', icon: CalendarClock, roles: ['Owner', 'Staff'] },
  { label: 'Contracts', href: '/contracts', icon: FileText, roles: ['Owner', 'Staff'] },
  { label: 'Invoices', href: '/billing/invoices', icon: Receipt },
  { label: 'Payments', href: '/billing/payments', icon: CreditCard },
  { label: 'Meters', href: '/billing/meter-readings', icon: Gauge, roles: ['Owner', 'Staff'] },
  { label: 'Expenses', href: '/expenses', icon: DollarSign, roles: ['Owner', 'Staff'] },
  { label: 'Maintenance', href: '/maintenance', icon: Wrench },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'P&L Report', href: '/reports/pnl', icon: BarChart3, roles: ['Owner'] },
  { label: 'Staff', href: '/staff', icon: UserCog, roles: ['Owner'] },
]

// ─── Header Breadcrumbs ─────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  buildings: 'Buildings',
  rooms: 'Rooms',
  tenants: 'Tenants',
  contracts: 'Contracts',
  billing: 'Billing',
  invoices: 'Invoices',
  payments: 'Payments',
  'meter-readings': 'Meter Readings',
  expenses: 'Expenses',
  maintenance: 'Maintenance',
  reservations: 'Reservations',
  notifications: 'Notifications',
  settings: 'Settings',
  staff: 'Staff',
  reports: 'Reports',
  pnl: 'P&L Report',
}

function HeaderBreadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return <div className='flex-1' />

  const crumbs = segments.map((segment, i) => {
    const isId = /^[0-9a-f-]{36}$/.test(segment) // UUID detection
    const label = isId ? 'Details' : ROUTE_LABELS[segment] || segment
    const href = '/' + segments.slice(0, i + 1).join('/')
    return { label, href, isLast: i === segments.length - 1 }
  })

  return (
    <nav aria-label='Breadcrumb' className='hidden md:flex flex-1 items-center gap-1 px-2 text-sm'>
      <Link href='/dashboard' className='text-muted-foreground hover:text-foreground transition-colors'>
        <Home className='size-4' />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className='flex items-center gap-1'>
          <ChevronRight className='size-3.5 text-muted-foreground/50' />
          {crumb.isLast ? (
            <span className='font-medium text-foreground truncate max-w-[200px]'>{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className='text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]'>
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}

// ─── AppShell ───────────────────────────────────────────

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()

  // Sidebar state
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIDEBAR.storageKey) === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  // Persist collapsed state
  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR.storageKey, String(next))
      return next
    })
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Keyboard shortcut (Ctrl+B)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleCollapsed])

  // Filter nav items by user role
  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.roles) return true
    return item.roles.some(role => user?.roles.some(r => r.toLowerCase() === role.toLowerCase()))
  })

  const sidebarWidth = collapsed ? SIDEBAR.collapsedWidth : SIDEBAR.expandedWidth

  return (
    <div className='flex h-screen overflow-hidden bg-background'>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className='fixed inset-0 bg-black/50 md:hidden'
            style={{ zIndex: Z_INDEX.overlay }}
            onClick={() => setMobileOpen(false)}
            aria-hidden='true'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        role='navigation'
        aria-label='Main navigation'
        className={cn(
          'fixed top-0 left-0 h-full border-r bg-sidebar-bg transition-all duration-200 flex flex-col',
          'md:relative md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        style={{
          width: mobileOpen ? SIDEBAR.expandedWidth : sidebarWidth,
          zIndex: Z_INDEX.sticky,
        }}
      >
        {/* Logo / Brand */}
        <div
          className='flex items-center border-b px-4 shrink-0'
          style={{ height: HEADER.height }}
        >
          <Building2 className='size-6 text-primary shrink-0' />
          {(!collapsed || mobileOpen) && (
            <span className='ml-3 text-lg font-bold tracking-tight'>ElysStay</span>
          )}
        </div>

        {/* Nav Items */}
        <nav className='flex-1 overflow-y-auto p-2'>
          <ul className='space-y-1'>
            {visibleItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive && 'bg-primary/10 text-primary',
                      collapsed && !mobileOpen && 'justify-center px-0',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className='size-5 shrink-0' />
                    {(!collapsed || mobileOpen) && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className='hidden md:flex border-t p-2'>
          <button
            onClick={toggleCollapsed}
            className='flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer'
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={cn('size-5 transition-transform', collapsed && 'rotate-180')}
            />
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* Header */}
        <header
          className='flex items-center justify-between border-b bg-background px-4 shrink-0'
          style={{ height: HEADER.height, zIndex: Z_INDEX.sticky }}
        >
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className='md:hidden p-2 text-muted-foreground hover:text-foreground cursor-pointer'
            aria-label='Open navigation menu'
            aria-expanded={mobileOpen}
          >
            <Menu className='size-5' />
          </button>

          {/* Breadcrumbs */}
          <HeaderBreadcrumbs pathname={pathname} />

          {/* Right-side actions */}
          <div className='flex items-center gap-2'>
            {/* Theme toggle */}
            <button
              onClick={() =>
                setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'dark' : 'light')
              }
              className='p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer'
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className='size-[18px]' />
              ) : theme === 'light' ? (
                <Moon className='size-[18px]' />
              ) : (
                <Monitor className='size-[18px]' />
              )}
            </button>

            <NotificationBell />

            {/* User info + actions */}
            <div className='flex items-center gap-2'>
              <div className='hidden sm:block text-right'>
                <p className='text-sm font-medium leading-none'>{user?.fullName}</p>
                <p className='text-xs text-muted-foreground'>{user?.roles[0]}</p>
              </div>
              <Link
                href='/settings'
                className='p-2 text-muted-foreground hover:text-foreground transition-colors'
                title='Settings'
              >
                <Settings className='size-5' />
              </Link>
              <button
                onClick={logout}
                className='p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer'
                title='Sign out'
              >
                <LogOut className='size-5' />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id='main-content' className='flex-1 overflow-y-auto'>
          {children}
        </main>
      </div>
    </div>
  )
}
