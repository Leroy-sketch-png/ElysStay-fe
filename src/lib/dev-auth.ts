export const DEV_AUTH_STORAGE_KEY = '__elysstay_dev_auth__'

export interface DevAuthUser {
  keycloakId: string
  email: string
  fullName: string
  roles: string[]
}

export interface DevAuthOverride {
  authenticated: boolean
  authError?: string | null
  token?: string
  user?: DevAuthUser | null
}

function isValidUser(value: unknown): value is DevAuthUser {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>

  return typeof candidate.keycloakId === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.fullName === 'string'
    && Array.isArray(candidate.roles)
    && candidate.roles.every((role): role is string => typeof role === 'string')
}

export function readDevAuthOverride(): DevAuthOverride | undefined {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return undefined
  }

  const raw = window.localStorage.getItem(DEV_AUTH_STORAGE_KEY)
  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (typeof parsed.authenticated !== 'boolean') {
      window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY)
      return undefined
    }

    const override: DevAuthOverride = {
      authenticated: parsed.authenticated,
      authError: typeof parsed.authError === 'string' ? parsed.authError : null,
      token: typeof parsed.token === 'string' ? parsed.token : undefined,
      user: isValidUser(parsed.user) ? parsed.user : null,
    }

    if (override.authenticated && !override.user) {
      window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY)
      return undefined
    }

    return override
  } catch {
    window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY)
    return undefined
  }
}
