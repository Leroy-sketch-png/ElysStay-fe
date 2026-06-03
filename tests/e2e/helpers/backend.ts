/**
 * Backend API helpers for E2E test data setup and teardown.
 *
 * These functions run in Node.js context (not the browser) so that test data
 * can be created / cleaned up in Playwright beforeEach / afterEach hooks without
 * driving the browser.
 *
 * Auth token resolution order:
 *   1. E2E_OWNER_TOKEN env var — a pre-obtained JWT (CI / long-running token)
 *   2. Keycloak password grant using E2E_KEYCLOAK_* + E2E_OWNER_* credentials
 *   3. 'e2e-owner-token' fallback — only works if the backend has dev-auth bypass
 *
 * Required env vars (any one set is enough):
 *   NEXT_PUBLIC_API_URL   — backend base URL (default: http://localhost:5027/api/v1)
 *   E2E_OWNER_TOKEN       — pre-obtained owner JWT
 *   E2E_KEYCLOAK_URL      — Keycloak base URL  (e.g. http://localhost:8080)
 *   E2E_KEYCLOAK_REALM    — Keycloak realm     (default: elysstay)
 *   E2E_KEYCLOAK_CLIENT_ID— Keycloak client ID (default: elysstay-frontend)
 *   E2E_OWNER_EMAIL       — test owner email   (default: owner@elysstay.test)
 *   E2E_OWNER_PASSWORD    — test owner password
 */
import type { Page } from '@playwright/test'
import { DEV_AUTH_STORAGE_KEY } from '../../../src/lib/dev-auth'

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5027/api/v1'

// ─── Token Management ────────────────────────────────────

let _cachedToken: string | null = null

async function fetchKeycloakToken(): Promise<string | null> {
  const kcUrl = process.env.E2E_KEYCLOAK_URL
  if (!kcUrl) return null

  const realm = process.env.E2E_KEYCLOAK_REALM ?? 'elysstay'
  const clientId = process.env.E2E_KEYCLOAK_CLIENT_ID ?? 'elysstay-frontend'
  const email = process.env.E2E_OWNER_EMAIL ?? 'owner@elysstay.test'
  const password = process.env.E2E_OWNER_PASSWORD

  if (!password) return null

  try {
    const res = await fetch(
      `${kcUrl}/realms/${realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: clientId,
          username: email,
          password,
        }),
      },
    )
    if (!res.ok) return null
    const data = await res.json() as { access_token?: string }
    return data.access_token ?? null
  } catch {
    return null
  }
}

export async function getOwnerToken(): Promise<string> {
  if (_cachedToken) return _cachedToken

  if (process.env.E2E_OWNER_TOKEN) {
    _cachedToken = process.env.E2E_OWNER_TOKEN
    return _cachedToken
  }

  const kcToken = await fetchKeycloakToken()
  if (kcToken) {
    _cachedToken = kcToken
    return _cachedToken
  }

  // Fallback: dev-auth fake token — works only when the backend has dev auth bypass enabled
  return 'e2e-owner-token'
}

// ─── Browser Auth Injection ───────────────────────────────

/**
 * Inject auth credentials into the browser page so the Next.js frontend
 * accepts the E2E session without redirecting to Keycloak.
 *
 * Works via two parallel paths:
 *   • localStorage dev-auth override — active in Next.js dev mode (NODE_ENV=development)
 *   • sessionStorage JWT tokens      — active in production build (next start)
 */
export async function loginAsOwner(page: Page): Promise<void> {
  const token = await getOwnerToken()

  // Path 1 — dev-auth localStorage override
  await page.addInitScript(
    ([key, value]: [string, unknown]) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    },
    [
      DEV_AUTH_STORAGE_KEY,
      {
        authenticated: true,
        token,
        user: {
          keycloakId: 'e2e-owner-id',
          email: process.env.E2E_OWNER_EMAIL ?? 'owner@elysstay.test',
          fullName: 'E2E Owner',
          roles: ['Owner'],
        },
      },
    ] as [string, unknown],
  )

  // Path 2 — sessionStorage JWT tokens (production build)
  await page.addInitScript((rawToken: string) => {
    const parts = rawToken.split('.')
    // Use real JWT directly; otherwise wrap a fake payload for dev
    const accessToken = parts.length === 3
      ? rawToken
      : btoa('{"alg":"RS256"}') + '.' + btoa(JSON.stringify({
          sub: 'e2e-owner-id',
          email: 'owner@elysstay.test',
          name: 'E2E Owner',
          realm_access: { roles: ['Owner'] },
          exp: 9_999_999_999,
        })) + '.e2e-sig'

    try {
      sessionStorage.setItem(
        '__elysstay_tokens__',
        JSON.stringify({
          accessToken,
          refreshToken: 'e2e-refresh-token',
          expiresAt: Date.now() + 3_600_000,
          refreshExpiresAt: Date.now() + 86_400_000,
        }),
      )
    } catch { /* private-browsing / storage-full — ignore */ }
  }, token)
}

// ─── HTTP Helper ─────────────────────────────────────────

async function backendFetch<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getOwnerToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new Error(`Backend ${method} ${path} → ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ─── Building Helpers ────────────────────────────────────

export interface BuildingInfo {
  id: string
  name: string
  address: string
  invoiceDueDay: number
}

export async function fetchFirstBuilding(): Promise<BuildingInfo | null> {
  try {
    const res = await backendFetch<{ success: boolean; data: BuildingInfo[] }>(
      'GET',
      '/buildings?pageSize=1&page=1',
    )
    return res.data?.[0] ?? null
  } catch {
    return null
  }
}

export async function fetchBuildings(): Promise<BuildingInfo[]> {
  try {
    const res = await backendFetch<{ success: boolean; data: BuildingInfo[] }>(
      'GET',
      '/buildings?pageSize=9',
    )
    return res.data ?? []
  } catch {
    return []
  }
}

// ─── Invoice Helpers ──────────────────────────────────────

export interface InvoiceSummary {
  id: string
  status: string
  roomNumber: string
  tenantName: string
  totalAmount: number
  paidAmount: number
  billingYear: number
  billingMonth: number
  buildingId: string
  dueDate: string
}

interface GenerationResult {
  generated: InvoiceSummary[]
  skipped: Array<{ contractId: string; reason: string }>
  warnings: string[]
}

export async function generateInvoices(
  buildingId: string,
  billingYear: number,
  billingMonth: number,
): Promise<GenerationResult> {
  try {
    const res = await backendFetch<{ success: boolean; data: GenerationResult }>(
      'POST',
      '/invoices/generate',
      { buildingId, billingYear, billingMonth },
    )
    return res.data ?? { generated: [], skipped: [], warnings: [] }
  } catch {
    return { generated: [], skipped: [], warnings: [] }
  }
}

export async function fetchInvoices(
  params: Record<string, string | number> = {},
): Promise<InvoiceSummary[]> {
  try {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')

    const res = await backendFetch<{ success: boolean; data: InvoiceSummary[] }>(
      'GET',
      `/invoices${qs ? `?${qs}` : ''}`,
    )
    return res.data ?? []
  } catch {
    return []
  }
}

export async function voidInvoice(id: string): Promise<void> {
  try {
    await backendFetch('PATCH', `/invoices/${id}/void`)
  } catch { /* best-effort cleanup */ }
}

export async function sendInvoice(id: string): Promise<void> {
  await backendFetch('PATCH', `/invoices/${id}/send`)
}

export async function recordPayment(
  invoiceId: string,
  amount: number,
  paymentMethod = 'BankTransfer',
): Promise<void> {
  await backendFetch('POST', `/invoices/${invoiceId}/payments`, {
    amount,
    paymentMethod,
  })
}
