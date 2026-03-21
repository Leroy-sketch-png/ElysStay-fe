/**
 * Test render helper.
 *
 * Wraps components with the providers needed for most tests:
 * - QueryClientProvider (fresh client per test to avoid cache bleed)
 * - Mocked AuthProvider (controllable auth state, no Keycloak side effects)
 *
 * Usage:
 *   import { renderWithProviders } from '@test/fixtures/render'
 *   const { getByText } = renderWithProviders(<MyComponent />, { user: MOCK_STAFF })
 */
import { type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  TestAuthProvider,
  createMockAuthValue,
  type MockAuthOverrides,
} from './auth'

// ─── Fresh QueryClient per test ─────────────────────────

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// ─── Provider Wrapper ───────────────────────────────────

interface ProviderOptions extends MockAuthOverrides {
  queryClient?: QueryClient
}

function createWrapper(options: ProviderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient()
  const authValue = createMockAuthValue(options)

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TestAuthProvider value={authValue}>{children}</TestAuthProvider>
      </QueryClientProvider>
    )
  }
}

// ─── renderWithProviders ────────────────────────────────

interface RenderWithProvidersOptions extends ProviderOptions {
  renderOptions?: Omit<RenderOptions, 'wrapper'>
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const { renderOptions, ...providerOptions } = options
  return render(ui, {
    wrapper: createWrapper(providerOptions),
    ...renderOptions,
  })
}

export { createTestQueryClient }
