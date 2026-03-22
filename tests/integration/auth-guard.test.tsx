/**
 * Integration tests for AuthGuard component.
 *
 * AuthGuard is the first security boundary — it shows a spinner while Keycloak
 * initialises, calls login() if unauthenticated, shows an error view when
 * Keycloak can't be reached, and renders children once authenticated.
 *
 * Strategy: vi.mock('@/providers/AuthProvider') to control useAuth() state
 * without any real Keycloak side effects.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthGuard } from '@/components/layouts/AuthGuard'
import { useAuth } from '@/providers/AuthProvider'

vi.mock('@/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

// ─── Helpers ─────────────────────────────────────────────

function createAuthState(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    initialized: true,
    authenticated: true,
    user: {
      keycloakId: 'u1',
      email: 'owner@test.com',
      fullName: 'Test Owner',
      roles: ['Owner'],
    },
    token: 'mock-token',
    authError: null,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: vi.fn((r: string) => r === 'Owner'),
    updateToken: vi.fn(),
    ...overrides,
  }
}

// ─── Tests ───────────────────────────────────────────────

describe('AuthGuard', () => {
  it('shows "Đang xác thực..." while auth is initializing', () => {
    vi.mocked(useAuth).mockReturnValue(
      createAuthState({ initialized: false, authenticated: false }),
    )

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )

    expect(screen.getByText('Đang xác thực...')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows "Đang chuyển hướng đăng nhập..." when initialized but not yet authenticated', () => {
    vi.mocked(useAuth).mockReturnValue(
      createAuthState({ initialized: true, authenticated: false }),
    )

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )

    expect(screen.getByText('Đang chuyển hướng đăng nhập...')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('automatically calls login() when initialized but not authenticated (no error)', async () => {
    const login = vi.fn()
    vi.mocked(useAuth).mockReturnValue(
      createAuthState({ initialized: true, authenticated: false, authError: null, login }),
    )

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )

    // The useEffect fires after render and calls login()
    await waitFor(() => expect(login).toHaveBeenCalledOnce())
  })

  it('shows the error state with retry button when authError is set', async () => {
    const login = vi.fn()
    vi.mocked(useAuth).mockReturnValue(
      createAuthState({
        initialized: true,
        authenticated: false,
        authError: 'Không thể kết nối Keycloak.',
        login,
      }),
    )

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )

    expect(screen.getByText('Không thể xác thực')).toBeInTheDocument()
    expect(screen.getByText('Không thể kết nối Keycloak.')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: 'Thử đăng nhập lại' })
    expect(retryButton).toBeInTheDocument()

    await userEvent.click(retryButton)
    expect(login).toHaveBeenCalledOnce()
  })

  it('renders protected children when fully authenticated', () => {
    vi.mocked(useAuth).mockReturnValue(
      createAuthState({ initialized: true, authenticated: true }),
    )

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Đang xác thực...')).not.toBeInTheDocument()
  })
})
