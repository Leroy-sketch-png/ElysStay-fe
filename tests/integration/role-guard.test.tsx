/**
 * Integration tests for RoleGuard component.
 *
 * RoleGuard maps current pathnames to required roles and redirects users who
 * lack the necessary role. It is the second layer of the authorization stack,
 * sitting inside AuthGuard in the component tree.
 *
 * Strategy:
 * - vi.mock('next/navigation') to control usePathname/useRouter
 * - vi.mock('@/providers/AuthProvider') to control useAuth
 * - vi.mock('@/components/ui/toaster') to capture toast calls
 */
import { render, screen, waitFor } from '@testing-library/react'
import { RoleGuard } from '@/components/layouts/RoleGuard'
import { useAuth } from '@/providers/AuthProvider'
import { usePathname, useRouter } from 'next/navigation'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}))

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/components/ui/toaster', () => ({
  toast: { error: vi.fn() },
}))

// ─── Helpers ─────────────────────────────────────────────

const OWNER = {
  keycloakId: 'u-owner',
  email: 'owner@test.com',
  fullName: 'Owner User',
  roles: ['Owner'],
}
const STAFF = {
  keycloakId: 'u-staff',
  email: 'staff@test.com',
  fullName: 'Staff User',
  roles: ['Staff'],
}
const TENANT = {
  keycloakId: 'u-tenant',
  email: 'tenant@test.com',
  fullName: 'Tenant User',
  roles: ['Tenant'],
}

function setupAuth(user: typeof OWNER | typeof STAFF | typeof TENANT) {
  vi.mocked(useAuth).mockReturnValue({
    initialized: true,
    authenticated: true,
    user,
    token: 'mock-token',
    authError: null,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: (role: string) => user.roles.includes(role),
    updateToken: vi.fn(),
  } as any)
}

function setupRouter(pathname: string) {
  const replace = vi.fn()
  vi.mocked(usePathname).mockReturnValue(pathname)
  vi.mocked(useRouter).mockReturnValue({ replace } as any)
  return { replace }
}

// ─── Tests ───────────────────────────────────────────────

describe('RoleGuard', () => {
  it('renders children when owner accesses an owner-only route (/staff)', () => {
    setupAuth(OWNER)
    setupRouter('/staff')

    render(
      <RoleGuard>
        <div>Staff Management</div>
      </RoleGuard>,
    )

    expect(screen.getByText('Staff Management')).toBeInTheDocument()
  })

  it('redirects tenant to /dashboard when accessing owner-only route (/staff)', async () => {
    setupAuth(TENANT)
    const { replace } = setupRouter('/staff')

    render(
      <RoleGuard>
        <div>Staff Management</div>
      </RoleGuard>,
    )

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'))
  })

  it('redirects staff to /dashboard when accessing owner-only P&L reports', async () => {
    setupAuth(STAFF)
    const { replace } = setupRouter('/reports/pnl')

    render(
      <RoleGuard>
        <div>P&amp;L Report</div>
      </RoleGuard>,
    )

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'))
  })

  it('renders children when owner accesses owner-only P&L report', () => {
    setupAuth(OWNER)
    setupRouter('/reports/pnl')

    render(
      <RoleGuard>
        <div>P&amp;L Report</div>
      </RoleGuard>,
    )

    expect(screen.getByText('P&L Report')).toBeInTheDocument()
  })

  it('renders children for any authenticated user on an unprotected route (/dashboard)', () => {
    setupAuth(TENANT)
    setupRouter('/dashboard')

    render(
      <RoleGuard>
        <div>Dashboard</div>
      </RoleGuard>,
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders children for staff on an owner+staff allowed route (/buildings)', () => {
    setupAuth(STAFF)
    setupRouter('/buildings')

    render(
      <RoleGuard>
        <div>Buildings</div>
      </RoleGuard>,
    )

    expect(screen.getByText('Buildings')).toBeInTheDocument()
  })
})
