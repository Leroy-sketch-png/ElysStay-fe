/**
 * ElysStay Auth — Keycloak OIDC integration for Next.js client-side auth.
 *
 * Uses keycloak-js directly. AuthProvider wraps the app, provides auth state
 * and token to the API client.
 *
 * Auth flow:
 * 1. Keycloak.init() with login-required → redirects to Keycloak if not authenticated
 * 2. On success → stores token in memory, sets up refresh interval
 * 3. API client reads token via getToken accessor
 */

import Keycloak from 'keycloak-js'

const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080'
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'elysstay'
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'elysstay-fe'

// Singleton Keycloak instance
let keycloakInstance: Keycloak | null = null

export function getKeycloak(): Keycloak {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: KEYCLOAK_URL,
      realm: KEYCLOAK_REALM,
      clientId: KEYCLOAK_CLIENT_ID,
    })
  }
  return keycloakInstance
}

export interface AuthUser {
  keycloakId: string
  email: string
  fullName: string
  roles: string[]
}

export function parseUserFromToken(keycloak: Keycloak): AuthUser | null {
  if (!keycloak.tokenParsed) return null

  const parsed = keycloak.tokenParsed as Record<string, unknown>
  const realmAccess = parsed.realm_access as { roles?: string[] } | undefined

  return {
    keycloakId: parsed.sub as string,
    email: (parsed.email as string) || '',
    fullName: (parsed.name as string) || (parsed.preferred_username as string) || '',
    roles: realmAccess?.roles || [],
  }
}

export function hasRole(user: AuthUser | null, role: string): boolean {
  return user?.roles.some(r => r.toLowerCase() === role.toLowerCase()) ?? false
}

export function isOwner(user: AuthUser | null): boolean {
  return hasRole(user, 'Owner')
}

export function isStaff(user: AuthUser | null): boolean {
  return hasRole(user, 'Staff')
}

export function isTenant(user: AuthUser | null): boolean {
  return hasRole(user, 'Tenant')
}
