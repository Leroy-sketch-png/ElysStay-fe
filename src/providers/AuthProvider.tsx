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
import { setTokenAccessor } from '@/lib/api-client'

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
  /** Redirect to Keycloak login page */
  login: () => void
  /** Redirect to Keycloak logout page */
  logout: () => void
  /** Check if user has a specific realm role */
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Config ─────────────────────────────────────────────

const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080'
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'elysstay'
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'elysstay-fe'

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
  const keycloakRef = useRef<Keycloak | null>(null)
  const initCalledRef = useRef(false)

  // Parse user from Keycloak token
  const parseUser = useCallback((kc: Keycloak): AuthUser | null => {
    if (!kc.tokenParsed) return null
    const parsed = kc.tokenParsed as Record<string, unknown>
    const realmAccess = parsed.realm_access as { roles?: string[] } | undefined
    return {
      keycloakId: parsed.sub as string,
      email: (parsed.email as string) || '',
      fullName: (parsed.name as string) || (parsed.preferred_username as string) || '',
      roles: realmAccess?.roles?.filter(r => !r.startsWith('default-roles-')) || [],
    }
  }, [])

  // Initialize Keycloak
  useEffect(() => {
    if (initCalledRef.current) return
    initCalledRef.current = true

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
        setAuthenticated(auth)
        if (auth) {
          setUser(parseUser(kc))
          setToken(kc.token)
          setTokenAccessor(() => kc.token)
        }
        setInitialized(true)
      })
      .catch(() => {
        setInitialized(true)
      })

    // Token refresh
    kc.onTokenExpired = () => {
      kc.updateToken(MIN_TOKEN_VALIDITY)
        .then(refreshed => {
          if (refreshed) {
            setToken(kc.token)
            setUser(parseUser(kc))
          }
        })
        .catch(() => {
          kc.logout()
        })
    }

    // Auth state events
    kc.onAuthLogout = () => {
      setAuthenticated(false)
      setUser(null)
      setToken(undefined)
    }

    kc.onAuthRefreshError = () => {
      setAuthenticated(false)
      setUser(null)
      setToken(undefined)
    }
  }, [loginRequired, parseUser])

  const login = useCallback(() => {
    keycloakRef.current?.login()
  }, [])

  const logout = useCallback(() => {
    keycloakRef.current?.logout({ redirectUri: window.location.origin })
  }, [])

  const hasRole = useCallback(
    (role: string) => user?.roles.some(r => r.toLowerCase() === role.toLowerCase()) ?? false,
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ initialized, authenticated, user, token, login, logout, hasRole }),
    [initialized, authenticated, user, token, login, logout, hasRole],
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
