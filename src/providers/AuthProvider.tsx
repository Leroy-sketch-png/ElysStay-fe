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
  /** Whether the session is expiring soon (within 5 minutes) */
  sessionExpiringSoon: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Return-to URL ──────────────────────────────────────

const RETURN_TO_KEY = '__elysstay_return_to__'

function storeReturnTo(path: string) {
  try {
    // Only store meaningful paths, not login/root
    if (path && path !== '/' && path !== '/login') {
      sessionStorage.setItem(RETURN_TO_KEY, path)
    }
  } catch { /* ignore */ }
}

function consumeReturnTo(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_TO_KEY)
    sessionStorage.removeItem(RETURN_TO_KEY)
    return path
  } catch {
    return null
  }
}

// ─── Session Token Storage ──────────────────────────────

const TOKEN_STORAGE_KEY = '__elysstay_tokens__'

interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp in ms
  refreshExpiresAt: number // Unix timestamp in ms — when refresh token expires
}

function storeTokens(accessToken: string, refreshToken: string, expiresIn: number, refreshExpiresIn: number) {
  const data: StoredTokens = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshExpiresAt: Date.now() + refreshExpiresIn * 1000,
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

// ─── Cross-tab Sync ─────────────────────────────────────

const AUTH_CHANNEL_NAME = 'elysstay-auth'

type AuthBroadcastMessage =
  | { type: 'logout' }
  | { type: 'login' }

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
/** Warning threshold — warn user when refresh token has <5 min left */
const SESSION_WARN_THRESHOLD_MS = 5 * 60 * 1000

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [initialized, setInitialized] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | undefined>(undefined)
  const [authError, setAuthError] = useState<string | null>(null)
  const [sessionExpiringSoon, setSessionExpiringSoon] = useState(false)
  const refreshTokenRef = useRef<string | null>(null)
  const refreshExpiresAtRef = useRef<number>(0)
  const refreshingRef = useRef(false)
  const initCalledRef = useRef(false)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const router = useRouter()

  // ── Apply auth state from tokens ────────────────────

  const applyAuthState = useCallback(
    (accessToken: string, refreshToken: string, expiresIn: number, refreshExpiresIn: number) => {
      const parsedUser = parseUser(accessToken)
      refreshTokenRef.current = refreshToken
      refreshExpiresAtRef.current = Date.now() + refreshExpiresIn * 1000
      setToken(accessToken)
      setUser(parsedUser)
      setAuthenticated(true)
      setAuthError(null)
      setSessionExpiringSoon(false)
      storeTokens(accessToken, refreshToken, expiresIn, refreshExpiresIn)
    },
    [],
  )

  const clearAuthState = useCallback(() => {
    refreshTokenRef.current = null
    refreshExpiresAtRef.current = 0
    setToken(undefined)
    setUser(null)
    setAuthenticated(false)
    setSessionExpiringSoon(false)
    clearStoredTokens()
  }, [])

  // ── Token refresh ───────────────────────────────────

  const doRefresh = useCallback(async (): Promise<boolean> => {
    const rt = refreshTokenRef.current
    if (!rt || refreshingRef.current) return false

    // If refresh token itself is expired, don't bother trying
    if (refreshExpiresAtRef.current > 0 && Date.now() >= refreshExpiresAtRef.current) {
      clearAuthState()
      return false
    }

    refreshingRef.current = true

    try {
      const result = await refreshAccessToken(rt)
      if (result.success) {
        applyAuthState(
          result.tokens.access_token,
          result.tokens.refresh_token,
          result.tokens.expires_in,
          result.tokens.refresh_expires_in,
        )
        return true
      }
      // Refresh failed — session expired
      clearAuthState()
      return false
    } finally {
      refreshingRef.current = false
    }
  }, [applyAuthState, clearAuthState])

  // ── Cross-tab sync ──────────────────────────────────

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    broadcastChannelRef.current = channel

    channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
      if (event.data?.type === 'logout') {
        clearAuthState()
        router.push('/login')
      } else if (event.data?.type === 'login') {
        // Another tab logged in — try to pick up the session from storage
        const stored = readStoredTokens()
        if (stored && stored.expiresAt > Date.now() + 10_000) {
          applyAuthState(
            stored.accessToken,
            stored.refreshToken,
            Math.floor((stored.expiresAt - Date.now()) / 1000),
            Math.floor((stored.refreshExpiresAt - Date.now()) / 1000),
          )
        }
      }
    }

    return () => {
      channel.close()
      broadcastChannelRef.current = null
    }
  }, [clearAuthState, applyAuthState, router])

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
        stored.refreshExpiresAt ? Math.floor((stored.refreshExpiresAt - Date.now()) / 1000) : 1800,
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
            result.tokens.refresh_expires_in,
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
      // Store current path for return-to after re-login
      if (typeof window !== 'undefined') {
        storeReturnTo(window.location.pathname)
      }
      setAuthError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      router.push('/login')
    })
  }, [initialized, token, doRefresh, clearAuthState, router])

  // ── Proactive token refresh + session expiry warning ──

  useEffect(() => {
    if (!authenticated) return

    const INTERVAL_MS = 15_000 // Check every 15s
    const interval = setInterval(() => {
      const stored = readStoredTokens()
      if (stored) {
        const secondsUntilExpiry = (stored.expiresAt - Date.now()) / 1000
        if (secondsUntilExpiry < REFRESH_BUFFER_S) {
          doRefresh()
        }

        // Session expiry warning: when refresh token is within 5 min of expiring
        if (stored.refreshExpiresAt) {
          const msUntilRefreshExpiry = stored.refreshExpiresAt - Date.now()
          setSessionExpiringSoon(
            msUntilRefreshExpiry > 0 && msUntilRefreshExpiry < SESSION_WARN_THRESHOLD_MS,
          )
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
          result.tokens.refresh_expires_in,
        )
        // Broadcast login to other tabs
        broadcastChannelRef.current?.postMessage({ type: 'login' } satisfies AuthBroadcastMessage)
      }
      return result
    },
    [applyAuthState],
  )

  const logout = useCallback(async () => {
    if (typeof window !== 'undefined' && readDevAuthOverride()) {
      window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY)
      setAuthenticated(false)
      setUser(null)
      setToken(undefined)
      return
    }

    const rt = refreshTokenRef.current

    // Broadcast logout to other tabs FIRST (so they clear immediately)
    broadcastChannelRef.current?.postMessage({ type: 'logout' } satisfies AuthBroadcastMessage)

    // Await server-side session invalidation, THEN clear local state
    if (rt) {
      await keycloakLogout(rt)
    }
    clearAuthState()
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
      sessionExpiringSoon,
    }),
    [initialized, authenticated, user, token, authError, login, logout, loginWithPasswordFn, hasRole, sessionExpiringSoon],
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
