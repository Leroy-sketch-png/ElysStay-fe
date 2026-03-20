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

interface NavGroup {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Bất động sản',
    items: [
      { label: 'Tòa nhà', href: '/buildings', icon: Building2, roles: ['Owner', 'Staff'] },
      { label: 'Phòng', href: '/rooms', icon: DoorOpen, roles: ['Owner', 'Staff'] },
    ],
  },
  {
    label: 'Khách thuê',
    items: [
      { label: 'Khách thuê', href: '/tenants', icon: Users, roles: ['Owner', 'Staff'] },
      { label: 'Đặt cọc', href: '/reservations', icon: CalendarClock, roles: ['Owner', 'Staff'] },
      { label: 'Hợp đồng', href: '/contracts', icon: FileText, roles: ['Owner', 'Staff'] },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      { label: 'Hóa đơn', href: '/billing/invoices', icon: Receipt },
      { label: 'Thanh toán', href: '/billing/payments', icon: CreditCard },
      { label: 'Đồng hồ', href: '/billing/meter-readings', icon: Gauge, roles: ['Owner', 'Staff'] },
      { label: 'Chi phí', href: '/expenses', icon: DollarSign, roles: ['Owner', 'Staff'] },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { label: 'Bảo trì', href: '/maintenance', icon: Wrench },
      { label: 'Thông báo', href: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { label: 'Báo cáo L/L', href: '/reports/pnl', icon: BarChart3, roles: ['Owner'] },
      { label: 'Nhân viên', href: '/staff', icon: UserCog, roles: ['Owner'] },
    ],
  },
]

// ─── Header Breadcrumbs ─────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Tổng quan',
  buildings: 'Tòa nhà',
  rooms: 'Phòng',
  tenants: 'Khách thuê',
  contracts: 'Hợp đồng',
  billing: 'Tài chính',
  invoices: 'Hóa đơn',
  payments: 'Thanh toán',
  'meter-readings': 'Đồng hồ',
  expenses: 'Chi phí',
  maintenance: 'Bảo trì',
  reservations: 'Đặt cọc',
  notifications: 'Thông báo',
  settings: 'Cài đặt',
  staff: 'Nhân viên',
  reports: 'Báo cáo',
  pnl: 'Báo cáo L/L',
}

function HeaderBreadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return <div className='flex-1' />

  const crumbs = segments.map((segment, i) => {
    const isId = /^[0-9a-f-]{36}$/.test(segment) // UUID detection
    const label = isId ? 'Chi tiết' : ROUTE_LABELS[segment] || segment
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

  // Filter nav groups by user role
  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.roles) return true
        return item.roles.some(role => user?.roles.some(r => r.toLowerCase() === role.toLowerCase()))
      }),
    })).filter(group => group.items.length > 0)
  }, [user?.roles])

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
        aria-label='Thanh điều hướng chính'
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
        <Link
          href='/dashboard'
          className='flex items-center border-b px-4 shrink-0 hover:bg-accent/50 transition-colors'
          style={{ height: HEADER.height }}
        >
          <Building2 className='size-6 text-primary shrink-0' />
          {(!collapsed || mobileOpen) && (
            <span className='ml-3 text-lg font-bold tracking-tight'>ElysStay</span>
          )}
        </Link>

        {/* Nav Items */}
        <nav className='flex-1 overflow-y-auto p-2'>
          {visibleGroups.map((group, gi) => (
            <div key={gi} className={cn(gi > 0 && 'mt-3 pt-3 border-t border-border/50')}>
              {group.label && (!collapsed || mobileOpen) && (
                <p className='px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70'>
                  {group.label}
                </p>
              )}
              <ul className='space-y-0.5'>
                {group.items.map(item => {
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
            </div>
          ))}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className='hidden md:flex border-t p-2'>
          <button
            onClick={toggleCollapsed}
            className='flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer'
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
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
            className='md:hidden p-2.5 -ml-1 text-muted-foreground hover:text-foreground cursor-pointer'
            aria-label='Mở menu điều hướng'
            aria-expanded={mobileOpen}
          >
            <Menu className='size-5' />
          </button>

          {/* Breadcrumbs */}
          <HeaderBreadcrumbs pathname={pathname} />

          {/* Right-side actions */}
          <div className='flex items-center gap-1 sm:gap-2'>
            {/* Theme toggle */}
            <button
              onClick={() =>
                setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'dark' : 'light')
              }
              className='p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer'
              title={`Chuyển sang chế độ ${theme === 'dark' ? 'sáng' : 'tối'}`}
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
            <div className='flex items-center gap-1 sm:gap-2'>
              <div className='hidden sm:block text-right'>
                <p className='text-sm font-medium leading-none'>{user?.fullName}</p>
                <p className='text-xs text-muted-foreground'>{user?.roles[0]}</p>
              </div>
              <Link
                href='/settings'
                className='p-2.5 text-muted-foreground hover:text-foreground transition-colors'
                title='Cài đặt'
              >
                <Settings className='size-5' />
              </Link>
              <button
                onClick={logout}
                className='p-2.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer'
                title='Đăng xuất'
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
