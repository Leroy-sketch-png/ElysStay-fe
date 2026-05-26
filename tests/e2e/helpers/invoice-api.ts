/**
 * Shared API mock helpers for invoice E2E tests.
 *
 * Uses URL predicate functions (not glob patterns) for route matching so that
 * query-string URLs like /api/v1/buildings?page=1&pageSize=999 are matched
 * correctly — Playwright globs do not reliably match query strings.
 */
import type { Page } from '@playwright/test'
import { DEV_AUTH_STORAGE_KEY } from '../../../src/lib/dev-auth'

// ─── Types ───────────────────────────────────────────────

export type InvoiceStatus = 'Draft' | 'Sent' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Void'

export interface MockInvoice {
  id: string
  contractId: string
  roomId: string
  roomNumber: string
  buildingId: string
  buildingName: string
  tenantUserId: string
  tenantName: string
  billingYear: number
  billingMonth: number
  rentAmount: number
  serviceAmount: number
  penaltyAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
  dueDate: string
  createdAt: string
  updatedAt: string
}

export interface MockInvoiceDetail extends MockInvoice {
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    amount: number
    previousReading?: number
    currentReading?: number
  }>
  payments: Array<{
    id: string
    amount: number
    type: string
    paymentMethod?: string
    paidAt: string
    referenceCode?: string
    recordedByName: string
  }>
}

// ─── URL helpers ─────────────────────────────────────────

/** Extract the API path after /api/v1 from a URL object. */
function v1Path(url: URL): string {
  return url.pathname.replace(/^.*\/api\/v1/, '')
}

/** Returns true when the URL pathname ends with the given suffix. */
function pathIs(suffix: string) {
  return (url: URL) => url.pathname.endsWith(suffix)
}

/** Returns true when the URL pathname starts with the given prefix after /api/v1. */
function pathStartsWith(prefix: string) {
  return (url: URL) => v1Path(url).startsWith(prefix)
}

// ─── Fixtures ────────────────────────────────────────────

export function makeInvoice(overrides: Partial<MockInvoice> = {}): MockInvoice {
  const id = overrides.id ?? `inv-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    contractId: overrides.contractId ?? 'contract-1',
    roomId: overrides.roomId ?? `room-${overrides.roomNumber ?? '101'}`,
    roomNumber: overrides.roomNumber ?? '101',
    buildingId: overrides.buildingId ?? 'building-1',
    buildingName: overrides.buildingName ?? 'Toa nha A',
    tenantUserId: overrides.tenantUserId ?? 'tenant-1',
    tenantName: overrides.tenantName ?? 'Nguyen Van A',
    billingYear: overrides.billingYear ?? 2026,
    billingMonth: overrides.billingMonth ?? 5,
    rentAmount: overrides.rentAmount ?? 5_000_000,
    serviceAmount: overrides.serviceAmount ?? 500_000,
    penaltyAmount: overrides.penaltyAmount ?? 0,
    discountAmount: overrides.discountAmount ?? 0,
    totalAmount: overrides.totalAmount ?? 5_500_000,
    paidAmount: overrides.paidAmount ?? 0,
    status: overrides.status ?? 'Draft',
    dueDate: overrides.dueDate ?? '2026-05-10',
    createdAt: overrides.createdAt ?? '2026-05-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-05-01T00:00:00Z',
  }
}

export function makeInvoiceDetail(
  base: MockInvoice,
  payments: MockInvoiceDetail['payments'] = [],
): MockInvoiceDetail {
  return {
    ...base,
    lineItems: [
      {
        id: 'li-1',
        description: 'Tien thue thang 5/2026',
        quantity: 1,
        unitPrice: base.rentAmount,
        amount: base.rentAmount,
      },
      {
        id: 'li-2',
        description: 'Dien',
        quantity: 150,
        unitPrice: 3300,
        amount: 495_000,
        previousReading: 100,
        currentReading: 250,
      },
    ],
    payments,
  }
}

// ─── Auth ────────────────────────────────────────────────

/**
 * Inject auth into the page so E2E tests reach authenticated routes.
 *
 * Two parallel bypass paths handle both server modes:
 *
 * 1. localStorage dev-auth key — used by readDevAuthOverride() when
 *    process.env.NODE_ENV === 'development' (next dev).
 *
 * 2. sessionStorage tokens — used by AuthProvider's fallback when
 *    readDevAuthOverride() returns undefined (e.g. next start / production
 *    build where NODE_ENV === 'production').  The token is a fake JWT whose
 *    signature is never verified client-side, so any three-part string works.
 */
export async function loginAsOwner(page: Page) {
  // Path 1 — dev-auth localStorage override (next dev mode)
  await page.addInitScript(
    ([key, value]: [string, unknown]) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    },
    [
      DEV_AUTH_STORAGE_KEY,
      {
        authenticated: true,
        token: 'e2e-owner-token',
        user: {
          keycloakId: 'e2e-owner-id',
          email: 'owner@elysstay.test',
          fullName: 'E2E Owner',
          roles: ['Owner'],
        },
      },
    ] as [string, unknown],
  )

  // Path 2 — sessionStorage token bypass (next start / production build)
  // AuthProvider reads '__elysstay_tokens__' and calls applyAuthState() when
  // the stored access token has not expired.  parseAccessToken() only does a
  // base64 decode — no signature verification — so a crafted payload is fine.
  await page.addInitScript(() => {
    const payload = {
      sub: 'e2e-owner-id',
      email: 'owner@elysstay.test',
      name: 'E2E Owner',
      realm_access: { roles: ['Owner'] },
      exp: 9_999_999_999,
    }
    const fakeJwt =
      btoa('{"alg":"RS256"}') + '.' + btoa(JSON.stringify(payload)) + '.e2e-sig'
    try {
      sessionStorage.setItem(
        '__elysstay_tokens__',
        JSON.stringify({
          accessToken: fakeJwt,
          refreshToken: 'fake-refresh-token',
          expiresAt: Date.now() + 3_600_000,
          refreshExpiresAt: Date.now() + 86_400_000,
        }),
      )
    } catch { /* private-browsing / storage-full — ignore */ }
  })
}

// ─── Shell API mocks ─────────────────────────────────────

export async function mockShellApis(page: Page) {
  // /api/v1/users/me/dashboard — must be registered before /users/me so the
  // more-specific route wins (Playwright matches in registration order).
  await page.route(
    pathIs('/api/v1/users/me/dashboard'),
    (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalBuildings: 1, totalRooms: 5, occupiedRooms: 3,
          occupancyRate: 0.6, activeContracts: 3, expiringContracts: 0,
          pendingReservations: 0, monthlyRevenue: 16_500_000,
          overdueInvoiceCount: 0, overdueAmount: 0, pendingMeterReadings: 0,
        },
      }),
    }),
  )

  await page.route(
    pathIs('/api/v1/users/me'),
    (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'owner-1',
          keycloakId: 'e2e-owner-id',
          email: 'owner@elysstay.test',
          fullName: 'E2E Owner',
          roles: ['Owner'],
          status: 'Active',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      }),
    }),
  )

  await page.route(
    pathStartsWith('/notifications'),
    (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      }),
    }),
  )
}

// ─── Buildings mock ──────────────────────────────────────

export const MOCK_BUILDING = {
  id: 'building-1',
  ownerId: 'owner-1',
  name: 'Toa nha A',
  address: '123 Demo Street',
  totalFloors: 5,
  invoiceDueDay: 10,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

export async function mockBuildingsApi(page: Page) {
  await page.route(
    pathStartsWith('/buildings'),
    (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [MOCK_BUILDING],
        pagination: { page: 1, pageSize: 999, totalItems: 1, totalPages: 1 },
      }),
    }),
  )
}

// ─── Invoice API mock factory ─────────────────────────────

/**
 * Registers a stateful invoice API mock.
 * Returns the mutable store so tests can assert on state after mutations.
 */
export async function mockInvoiceApi(page: Page, initialInvoices: MockInvoice[] = []) {
  const invoices: MockInvoice[] = [...initialInvoices]

  await page.route(pathStartsWith('/invoices'), async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const parts = v1Path(url).split('/').filter(Boolean)
    const method = request.method()

    const ok = (data: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data }),
      })

    // POST /invoices/generate
    if (parts[1] === 'generate' && method === 'POST') {
      const generated = [
        makeInvoice({ id: 'inv-gen-1', roomNumber: '101', status: 'Draft' }),
        makeInvoice({ id: 'inv-gen-2', roomNumber: '201', status: 'Draft' }),
        makeInvoice({ id: 'inv-gen-3', roomNumber: '301', status: 'Draft' }),
      ]
      invoices.push(...generated)
      return ok({ generated, skipped: [], warnings: [] })
    }

    // POST /invoices/send-batch
    if (parts[1] === 'send-batch' && method === 'POST') {
      const body = JSON.parse(request.postData() || '{}') as { invoiceIds?: string[] }
      let sentCount = 0
      for (const inv of invoices) {
        if ((body.invoiceIds ?? []).includes(inv.id) && inv.status === 'Draft') {
          inv.status = 'Sent'
          sentCount++
        }
      }
      return ok({ sentCount })
    }

    // PATCH /invoices/:id/send
    if (parts[2] === 'send' && method === 'PATCH') {
      const inv = invoices.find((i) => i.id === parts[1])
      if (inv) inv.status = 'Sent'
      return ok(null)
    }

    // PATCH /invoices/:id/void
    if (parts[2] === 'void' && method === 'PATCH') {
      const inv = invoices.find((i) => i.id === parts[1])
      if (inv) inv.status = 'Void'
      return ok(null)
    }

    // POST /invoices/:id/payments
    if (parts[2] === 'payments' && method === 'POST') {
      const body = JSON.parse(request.postData() || '{}') as { amount?: number }
      const inv = invoices.find((i) => i.id === parts[1])
      if (inv && body.amount) {
        inv.paidAmount += body.amount
        inv.status = inv.paidAmount >= inv.totalAmount ? 'Paid' : 'PartiallyPaid'
      }
      return ok({ id: `pay-${Date.now()}`, amount: body.amount })
    }

    // GET /invoices/:id  (detail — must come before list)
    if (parts.length === 2 && method === 'GET') {
      const inv = invoices.find((i) => i.id === parts[1])
      if (!inv) {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Khong tim thay hoa don.' }),
        })
      }
      return ok(makeInvoiceDetail(inv))
    }

    // GET /invoices  (list) — getPaged expects data + pagination at the top level
    if (parts.length === 1 && method === 'GET') {
      const statusFilter = url.searchParams.get('status')
      const filtered = statusFilter ? invoices.filter((i) => i.status === statusFilter) : invoices
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: filtered,
          pagination: {
            page: 1,
            pageSize: 20,
            totalItems: filtered.length,
            totalPages: Math.max(1, Math.ceil(filtered.length / 20)),
          },
        }),
      })
    }

    // Unhandled — return empty success so the page doesn't error
    return ok(null)
  })

  return invoices
}
