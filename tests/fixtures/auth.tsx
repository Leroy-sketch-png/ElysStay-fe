/**
 * Mock auth context for tests.
 *
 * Provides a TestAuthProvider that wraps components with a controllable auth context,
 * bypassing real Keycloak initialization entirely.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { AuthContextValue, AuthUser } from '@/providers/AuthProvider'

// Re-export the real context types so tests only import from this file
export type { AuthContextValue, AuthUser }

// ─── Preset Users ───────────────────────────────────────

export const MOCK_OWNER: AuthUser = {
  keycloakId: '00000000-0000-0000-0000-000000000001',
  email: 'owner@elysstay.test',
  fullName: 'Test Owner',
  roles: ['Owner'],
}

export const MOCK_STAFF: AuthUser = {
  keycloakId: '00000000-0000-0000-0000-000000000002',
  email: 'staff@elysstay.test',
  fullName: 'Test Staff',
  roles: ['Staff'],
}

export const MOCK_TENANT: AuthUser = {
  keycloakId: '00000000-0000-0000-0000-000000000003',
  email: 'tenant@elysstay.test',
  fullName: 'Test Tenant',
  roles: ['Tenant'],
}

// ─── Mock Auth Values ───────────────────────────────────

export interface MockAuthOverrides {
  initialized?: boolean
  authenticated?: boolean
  user?: AuthUser | null
  token?: string
  authError?: string | null
}

export function createMockAuthValue(overrides: MockAuthOverrides = {}): AuthContextValue {
  const user = overrides.user ?? MOCK_OWNER
  return {
    initialized: overrides.initialized ?? true,
    authenticated: overrides.authenticated ?? true,
    user,
    token: overrides.token ?? 'mock-jwt-token',
    authError: overrides.authError ?? null,
    login: vi.fn(),
    loginWithPassword: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn(),
    hasRole: (role: string) =>
      user?.roles.some((r) => r.toLowerCase() === role.toLowerCase()) ?? false,
    sessionExpiringSoon: false,
  }
}

// ─── Test Auth Context ──────────────────────────────────

// We create a parallel context here so tests don't trigger Keycloak side effects.
// The useAuth hook in production reads from AuthContext in AuthProvider.tsx.
// For tests, we'll mock the module so useAuth returns our test values.
const TestAuthContext = createContext<AuthContextValue | undefined>(undefined)

export function TestAuthProvider({
  children,
  value,
}: {
  children: ReactNode
  value?: AuthContextValue
}) {
  const authValue = useMemo(() => value ?? createMockAuthValue(), [value])
  return <TestAuthContext.Provider value={authValue}>{children}</TestAuthContext.Provider>
}

export function useTestAuth(): AuthContextValue {
  const ctx = useContext(TestAuthContext)
  if (!ctx) throw new Error('useTestAuth must be used within TestAuthProvider')
  return ctx
}
