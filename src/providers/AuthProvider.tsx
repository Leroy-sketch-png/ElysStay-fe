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
import Keycloak from 'keycloak-js'
import { setTokenAccessor, setOnUnauthorized, setTokenRefresher } from '@/lib/api-client'
import { DEV_AUTH_STORAGE_KEY, readDevAuthOverride } from '@/lib/dev-auth'

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
  /** The raw Keycloak access token (for debug; prefer api-client auto-injection) */
  token: string | undefined
  /** User-facing auth bootstrap error, if Keycloak could not be reached */
  authError: string | null
  /** Redirect to Keycloak login page */
  login: () => void
  /** Redirect to Keycloak logout page */
  logout: () => void
  /** Check if user has a specific realm role */
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Config ─────────────────────────────────────────────

const KEYCLOAK_URL =
  process.env.NEXT_PUBLIC_KEYCLOAK_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : '')
const KEYCLOAK_REALM =
  process.env.NEXT_PUBLIC_KEYCLOAK_REALM ||
  (process.env.NODE_ENV === 'development' ? 'elysstay' : '')
const KEYCLOAK_CLIENT_ID =
  process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ||
  (process.env.NODE_ENV === 'development' ? 'elysstay-fe' : '')

if (!KEYCLOAK_URL || !KEYCLOAK_REALM || !KEYCLOAK_CLIENT_ID) {
  throw new Error('Missing Keycloak public env vars in non-development environment.')
}

/** How many seconds before token expiry to refresh (default 60s) */
const MIN_TOKEN_VALIDITY = 60

// ─── Provider ───────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode
  /**
   * If true, immediately redirects to Keycloak login if not authenticated.
   * If false, initializes silently (check-sso) — useful for public pages.
   * Default: false
   */
  loginRequired?: boolean
}

export function AuthProvider({ children, loginRequired = false }: AuthProviderProps) {
  const [initialized, setInitialized] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | undefined>(undefined)
  const [authError, setAuthError] = useState<string | null>(null)
  const keycloakRef = useRef<Keycloak | null>(null)
  const initCalledRef = useRef(false)
  const refreshingRef = useRef(false)

  // Parse user from Keycloak token
  const parseUser = useCallback((kc: Keycloak): AuthUser | null => {
    if (!kc.tokenParsed) return null
    const parsed = kc.tokenParsed as Record<string, unknown>
    const sub = parsed.sub
    if (typeof sub !== 'string') return null
    const realmAccess = parsed.realm_access as { roles?: string[] } | undefined
    return {
      keycloakId: sub,
      email: typeof parsed.email === 'string' ? parsed.email : '',
      fullName: typeof parsed.name === 'string'
        ? parsed.name
        : typeof parsed.preferred_username === 'string'
          ? parsed.preferred_username
          : '',
      roles: Array.isArray(realmAccess?.roles)
        ? realmAccess.roles.filter((r): r is string => typeof r === 'string' && !r.startsWith('default-roles-'))
        : [],
    }
  }, [])

  // Shared token refresh — prevents concurrent updateToken calls from race condition
  const refreshToken = useCallback((kc: Keycloak) => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    kc.updateToken(MIN_TOKEN_VALIDITY)
      .then(refreshed => {
        setAuthError(null)
        if (refreshed) {
          setToken(kc.token)
          setUser(parseUser(kc))
        }
      })
      .catch(() => {
        // Transient refresh failures should not immediately destroy the session.
        // The next API request will still attempt refresh once more before redirecting.
      })
      .finally(() => {
        refreshingRef.current = false
      })
  }, [parseUser])

  // Initialize Keycloak
  useEffect(() => {
    if (initCalledRef.current) return
    initCalledRef.current = true

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

    const kc = new Keycloak({
      url: KEYCLOAK_URL,
      realm: KEYCLOAK_REALM,
      clientId: KEYCLOAK_CLIENT_ID,
    })
    keycloakRef.current = kc

    kc.init({
      onLoad: loginRequired ? 'login-required' : 'check-sso',
      checkLoginIframe: false,
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: typeof window !== 'undefined'
        ? `${window.location.origin}/silent-check-sso.html`
        : undefined,
    })
      .then(auth => {
        setAuthError(null)
        setAuthenticated(auth)
        if (auth) {
          setUser(parseUser(kc))
          setToken(kc.token)
          setTokenAccessor(() => kc.token)
          // Redirect to login on any 401 API response (after refresh attempt fails)
          setOnUnauthorized(() => kc.login())
          // Allow api-client to silently refresh token on 401 before redirecting
          setTokenRefresher(async () => {
            try {
              const refreshed = await kc.updateToken(-1)
              if (refreshed) {
                setToken(kc.token)
                setUser(parseUser(kc))
              }
              return true // token is valid (refreshed or still valid)
            } catch {
              return false
            }
          })
        }
        setInitialized(true)
      })
      .catch(() => {
        setAuthenticated(false)
        setUser(null)
        setToken(undefined)
        setAuthError('Không thể kết nối tới máy chủ xác thực. Vui lòng thử lại sau.')
        setInitialized(true)
      })

    // Reactive token refresh (fallback when onTokenExpired fires)
    kc.onTokenExpired = () => {
      refreshToken(kc)
    }

    // Proactive token refresh — refresh well before expiry so requests never hit a stale token
    const REFRESH_INTERVAL_MS = 30_000 // check every 30s
    const refreshInterval = setInterval(() => {
      if (kc.authenticated) {
        refreshToken(kc)
      }
    }, REFRESH_INTERVAL_MS)

    // Auth state events
    kc.onAuthLogout = () => {
      setAuthenticated(false)
      setUser(null)
      setToken(undefined)
    }

    kc.onAuthRefreshError = () => {
      setAuthError('Phiên đăng nhập tạm thời không thể làm mới. Hệ thống sẽ thử lại khi cần.')
    }

    return () => {
      clearInterval(refreshInterval)
    }
  }, [loginRequired, parseUser, refreshToken])

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
    keycloakRef.current?.login()
  }, [])

  const logout = useCallback(() => {
    if (typeof window !== 'undefined' && readDevAuthOverride()) {
      window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY)
      setAuthenticated(false)
      setUser(null)
      setToken(undefined)
      return
    }
    keycloakRef.current?.logout({ redirectUri: window.location.origin })
  }, [])

  const hasRole = useCallback(
    (role: string) => user?.roles.some(r => r.toLowerCase() === role.toLowerCase()) ?? false,
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ initialized, authenticated, user, token, authError, login, logout, hasRole }),
    [initialized, authenticated, user, token, authError, login, logout, hasRole],
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
