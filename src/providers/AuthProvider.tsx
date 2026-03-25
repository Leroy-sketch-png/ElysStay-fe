'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { setTokenAccessor, setOnUnauthorized, setTokenRefresher } from '@/lib/api-client'
import { DEV_AUTH_STORAGE_KEY, readDevAuthOverride } from '@/lib/dev-auth'
import {
  loginWithCredentials,
  refreshAccessToken,
  keycloakLogout,
  parseAccessToken,
  type LoginResult,
} from '@/lib/keycloak-auth'

// ─── Types ──────────────────────────────────────────────

export interface AuthUser {
  keycloakId: string
  email: string
  fullName: string
  roles: string[]
}

export interface AuthContextValue {
  /** Whether the initial auth check has completed */
  initialized: boolean
  /** Whether the user is currently authenticated */
  authenticated: boolean
  /** Parsed user info from the JWT token */
  user: AuthUser | null
  /** The raw access token (for debug; prefer api-client auto-injection) */
  token: string | undefined
  /** User-facing auth bootstrap error */
  authError: string | null
  /** Navigate to custom login page */
  login: () => void
  /** Log out and clear session */
  logout: () => void
  /** Authenticate with email/password via custom login form */
  loginWithPassword: (email: string, password: string) => Promise<LoginResult>
  /** Check if user has a specific realm role */
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Session Token Storage ──────────────────────────────

const TOKEN_STORAGE_KEY = '__elysstay_tokens__'

interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp in ms
}

function storeTokens(accessToken: string, refreshToken: string, expiresIn: number) {
  const data: StoredTokens = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
  }
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Private browsing or storage full — tokens live in memory only
  }
}

function readStoredTokens(): StoredTokens | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredTokens
  } catch {
    return null
  }
}

function clearStoredTokens() {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Ignore
  }
}

// ─── Token Parsing ──────────────────────────────────────

function parseUser(accessToken: string): AuthUser | null {
  const parsed = parseAccessToken(accessToken)
  if (!parsed || typeof parsed.sub !== 'string') return null

  const realmAccess = parsed.realm_access as { roles?: string[] } | undefined

  return {
    keycloakId: parsed.sub,
    email: typeof parsed.email === 'string' ? parsed.email : '',
    fullName:
      typeof parsed.name === 'string'
        ? parsed.name
        : typeof parsed.preferred_username === 'string'
          ? parsed.preferred_username
          : '',
    roles: Array.isArray(realmAccess?.roles)
      ? realmAccess.roles.filter(
          (r): r is string => typeof r === 'string' && !r.startsWith('default-roles-'),
        )
      : [],
  }
}

// ─── Provider ───────────────────────────────────────────

/** Seconds before expiry to trigger proactive refresh */
const REFRESH_BUFFER_S = 60

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [initialized, setInitialized] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | undefined>(undefined)
  const [authError, setAuthError] = useState<string | null>(null)
  const refreshTokenRef = useRef<string | null>(null)
  const refreshingRef = useRef(false)
  const initCalledRef = useRef(false)
  const router = useRouter()

  // ── Apply auth state from tokens ────────────────────

  const applyAuthState = useCallback(
    (accessToken: string, refreshToken: string, expiresIn: number) => {
      const parsedUser = parseUser(accessToken)
      refreshTokenRef.current = refreshToken
      setToken(accessToken)
      setUser(parsedUser)
      setAuthenticated(true)
      setAuthError(null)
      storeTokens(accessToken, refreshToken, expiresIn)
    },
    [],
  )

  const clearAuthState = useCallback(() => {
    refreshTokenRef.current = null
    setToken(undefined)
    setUser(null)
    setAuthenticated(false)
    clearStoredTokens()
  }, [])

  // ── Token refresh ───────────────────────────────────

  const doRefresh = useCallback(async (): Promise<boolean> => {
    const rt = refreshTokenRef.current
    if (!rt || refreshingRef.current) return false
    refreshingRef.current = true

    try {
      const result = await refreshAccessToken(rt)
      if (result.success) {
        applyAuthState(result.tokens.access_token, result.tokens.refresh_token, result.tokens.expires_in)
        return true
      }
      // Refresh failed — session expired
      clearAuthState()
      return false
    } finally {
      refreshingRef.current = false
    }
  }, [applyAuthState, clearAuthState])

  // ── Initialize: restore session from storage ────────

  useEffect(() => {
    if (initCalledRef.current) return
    initCalledRef.current = true

    // Dev-auth bypass (for testing without Keycloak)
    const devOverride = readDevAuthOverride()
    if (devOverride) {
      const devToken = devOverride.authenticated ? devOverride.token ?? 'dev-auth-token' : undefined
      const devAuthError = devOverride.authenticated
        ? devOverride.authError ?? null
        : devOverride.authError ?? 'Vui lòng đăng nhập để tiếp tục.'

      setAuthError(devAuthError)
      setAuthenticated(devOverride.authenticated)
      setUser(devOverride.authenticated ? devOverride.user ?? null : null)
      setToken(devToken)
      setTokenAccessor(() => devToken)
      setTokenRefresher(async () => devOverride.authenticated)
      setOnUnauthorized(() => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY)
        }
        setAuthenticated(false)
        setUser(null)
        setToken(undefined)
        setAuthError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      })
      setInitialized(true)
      return
    }

    // Try to restore from sessionStorage
    const stored = readStoredTokens()
    if (stored && stored.expiresAt > Date.now() + 10_000) {
      // Token still valid (with 10s margin)
      applyAuthState(
        stored.accessToken,
        stored.refreshToken,
        Math.floor((stored.expiresAt - Date.now()) / 1000),
      )
      setInitialized(true)
    } else if (stored?.refreshToken) {
      // Token expired but we have a refresh token — try refreshing
      refreshAccessToken(stored.refreshToken).then((result) => {
        if (result.success) {
          applyAuthState(
            result.tokens.access_token,
            result.tokens.refresh_token,
            result.tokens.expires_in,
          )
        } else {
          clearStoredTokens()
        }
        setInitialized(true)
      })
    } else {
      // No stored session — user needs to login
      setInitialized(true)
    }
  }, [applyAuthState])

  // ── Wire up api-client token injection ──────────────

  useEffect(() => {
    if (!initialized) return

    setTokenAccessor(() => token)
    setTokenRefresher(async () => {
      return await doRefresh()
    })
    setOnUnauthorized(() => {
      clearAuthState()
      router.push('/login')
    })
  }, [initialized, token, doRefresh, clearAuthState, router])

  // ── Proactive token refresh ─────────────────────────

  useEffect(() => {
    if (!authenticated) return

    const INTERVAL_MS = 30_000 // Check every 30s
    const interval = setInterval(() => {
      const stored = readStoredTokens()
      if (stored) {
        const secondsUntilExpiry = (stored.expiresAt - Date.now()) / 1000
        if (secondsUntilExpiry < REFRESH_BUFFER_S) {
          doRefresh()
        }
      }
    }, INTERVAL_MS)

    return () => clearInterval(interval)
  }, [authenticated, doRefresh])

  // ── Actions ─────────────────────────────────────────

  const login = useCallback(() => {
    const devOverride = typeof window !== 'undefined' ? readDevAuthOverride() : undefined
    if (devOverride) {
      if (!devOverride.authenticated) {
        setAuthError(devOverride.authError ?? 'Vui lòng đăng nhập để tiếp tục.')
      } else {
        setAuthError(null)
      }
      return
    }

    setAuthError(null)
    router.push('/login')
  }, [router])

  const loginWithPasswordFn = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const result = await loginWithCredentials(email, password)
      if (result.success) {
        applyAuthState(
          result.tokens.access_token,
          result.tokens.refresh_token,
          result.tokens.expires_in,
        )
      }
      return result
    },
    [applyAuthState],
  )

  const logout = useCallback(() => {
    if (typeof window !== 'undefined' && readDevAuthOverride()) {
      window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY)
      setAuthenticated(false)
      setUser(null)
      setToken(undefined)
      return
    }

    const rt = refreshTokenRef.current
    clearAuthState()
    if (rt) {
      keycloakLogout(rt)
    }
    router.push('/login')
  }, [clearAuthState, router])

  const hasRole = useCallback(
    (role: string) => user?.roles.some((r) => r.toLowerCase() === role.toLowerCase()) ?? false,
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      initialized,
      authenticated,
      user,
      token,
      authError,
      login,
      logout,
      loginWithPassword: loginWithPasswordFn,
      hasRole,
    }),
    [initialized, authenticated, user, token, authError, login, logout, loginWithPasswordFn, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ───────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
