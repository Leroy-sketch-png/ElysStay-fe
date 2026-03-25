/**
 * Keycloak Direct Grant Authentication
 *
 * Calls Keycloak's token endpoint directly with username/password.
 * This allows a custom login UI instead of Keycloak's default theme.
 *
 * Security model:
 * - Public client (no secret stored in browser)
 * - Tokens are standard Keycloak JWTs
 * - Refresh token rotation is handled by the AuthProvider
 */

const KEYCLOAK_URL =
  process.env.NEXT_PUBLIC_KEYCLOAK_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : '')
const KEYCLOAK_REALM =
  process.env.NEXT_PUBLIC_KEYCLOAK_REALM ||
  (process.env.NODE_ENV === 'development' ? 'elysstay' : '')
const KEYCLOAK_CLIENT_ID =
  process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ||
  (process.env.NODE_ENV === 'development' ? 'elysstay-fe' : '')

const TOKEN_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`

export interface KeycloakTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_expires_in: number
  token_type: string
  scope: string
}

export interface KeycloakErrorResponse {
  error: string
  error_description: string
}

export type LoginResult =
  | { success: true; tokens: KeycloakTokenResponse }
  | { success: false; error: string }

export type RefreshResult =
  | { success: true; tokens: KeycloakTokenResponse }
  | { success: false; error: string }

/**
 * Authenticate with username/password via Keycloak's token endpoint.
 */
export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<LoginResult> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: KEYCLOAK_CLIENT_ID,
    username,
    password,
    scope: 'openid',
  })

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    if (!res.ok) {
      const err: KeycloakErrorResponse = await res.json().catch(() => ({
        error: 'unknown',
        error_description: 'Lỗi không xác định từ máy chủ xác thực.',
      }))

      if (err.error === 'invalid_grant') {
        return { success: false, error: 'Email hoặc mật khẩu không đúng.' }
      }
      if (err.error === 'account_disabled' || err.error === 'user_disabled') {
        return { success: false, error: 'Tài khoản đã bị vô hiệu hóa.' }
      }
      if (err.error === 'account_temporarily_disabled') {
        return { success: false, error: 'Tài khoản tạm thời bị khóa. Vui lòng thử lại sau.' }
      }
      if (err.error === 'invalid_client') {
        return { success: false, error: 'Lỗi cấu hình hệ thống. Vui lòng liên hệ quản trị viên.' }
      }
      if (err.error === 'temporarily_unavailable') {
        return { success: false, error: 'Máy chủ xác thực đang quá tải. Vui lòng thử lại sau.' }
      }
      if (err.error === 'unauthorized_client') {
        return { success: false, error: 'Không được phép truy cập. Vui lòng liên hệ quản trị viên.' }
      }

      return {
        success: false,
        error: err.error_description || 'Không thể đăng nhập. Vui lòng thử lại.',
      }
    }

    const tokens: KeycloakTokenResponse = await res.json()
    return { success: true, tokens }
  } catch {
    return {
      success: false,
      error: 'Không thể kết nối tới máy chủ xác thực. Vui lòng kiểm tra kết nối mạng.',
    }
  }
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: KEYCLOAK_CLIENT_ID,
    refresh_token: refreshToken,
  })

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    if (!res.ok) {
      return { success: false, error: 'refresh_failed' }
    }

    const tokens: KeycloakTokenResponse = await res.json()
    return { success: true, tokens }
  } catch {
    return { success: false, error: 'network_error' }
  }
}

/**
 * Trigger Keycloak logout (invalidate session server-side).
 * Returns true if server session was successfully invalidated.
 */
export async function keycloakLogout(refreshToken: string): Promise<boolean> {
  const logoutEndpoint = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`

  const body = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    refresh_token: refreshToken,
  })

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(logoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (res.ok || res.status === 204) return true
      // 400 likely means token already invalid — treat as success
      if (res.status === 400) return true
    } catch {
      // Network error — retry once
    }
  }
  return false
}

/**
 * Parse a JWT access token to extract user claims.
 * Does NOT verify the signature — that's the backend's job.
 */
export function parseAccessToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}
