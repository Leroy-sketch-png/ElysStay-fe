/**
 * API contract tests for @/lib/queries/invoices
 *
 * Verifies HTTP method, URL, query string serialization,
 * response parsing, and error propagation for every operation.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { http, HttpResponse } from 'msw'
import {
  fetchInvoices,
  fetchInvoiceById,
  generateInvoices,
  updateInvoice,
  sendInvoice,
  batchSendInvoices,
  voidInvoice,
} from '@/lib/queries/invoices'
import { ApiError, setTokenAccessor } from '@/lib/api-client'
import { server } from '../fixtures/server'
import { apiUrl, apiSuccess, apiPagedSuccess, apiError } from '../fixtures/handlers'
import type { InvoiceDto } from '@/types/api'

beforeAll(() => setTokenAccessor(() => 'test-jwt-token'))

// ─── Fixtures ────────────────────────────────────────────

const MOCK_INVOICE: InvoiceDto = {
  id: 'inv-1',
  contractId: 'contract-1',
  roomId: 'room-1',
  roomNumber: '101',
  buildingId: 'building-1',
  buildingName: 'Tòa A',
  tenantUserId: 'user-1',
  tenantName: 'Nguyễn Văn A',
  billingYear: 2026,
  billingMonth: 5,
  rentAmount: 5000000,
  serviceAmount: 500000,
  penaltyAmount: 0,
  discountAmount: 0,
  totalAmount: 5500000,
  paidAmount: 0,
  status: 'Draft',
  dueDate: '2026-05-10',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
}

// ─── fetchInvoices ───────────────────────────────────────

describe('fetchInvoices', () => {
  it('calls GET /invoices with default pagination', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/invoices'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchInvoices()

    expect(capturedUrl).not.toBeNull()
    expect(capturedUrl!.searchParams.get('page')).toBe('1')
    expect(capturedUrl!.searchParams.get('pageSize')).toBe('20')
    expect(capturedUrl!.searchParams.get('sort')).toBe('createdAt:desc')
  })

  it('includes buildingId filter when provided', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/invoices'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchInvoices({ buildingId: 'building-1' })

    expect(capturedUrl!.searchParams.get('buildingId')).toBe('building-1')
  })

  it('includes contractId filter when provided', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/invoices'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchInvoices({ contractId: 'contract-xyz' })

    expect(capturedUrl!.searchParams.get('contractId')).toBe('contract-xyz')
  })

  it('includes billingYear and billingMonth filters', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/invoices'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchInvoices({ billingYear: 2026, billingMonth: 5 })

    expect(capturedUrl!.searchParams.get('billingYear')).toBe('2026')
    expect(capturedUrl!.searchParams.get('billingMonth')).toBe('5')
  })

  it('includes status filter when provided', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/invoices'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchInvoices({ status: 'Draft' })

    expect(capturedUrl!.searchParams.get('status')).toBe('Draft')
  })

  it('respects custom page and pageSize', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/invoices'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchInvoices({ page: 3, pageSize: 50 })

    expect(capturedUrl!.searchParams.get('page')).toBe('3')
    expect(capturedUrl!.searchParams.get('pageSize')).toBe('50')
  })

  it('returns data and pagination from the response envelope', async () => {
    server.use(
      http.get(apiUrl('/invoices'), () => apiPagedSuccess([MOCK_INVOICE], 1, 20, 1)),
    )

    const result = await fetchInvoices()

    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('inv-1')
    expect(result.data[0].status).toBe('Draft')
    expect(result.pagination.totalItems).toBe(1)
  })

  it('returns empty data array when no invoices match', async () => {
    server.use(
      http.get(apiUrl('/invoices'), () => apiPagedSuccess([], 1, 20, 0)),
    )

    const result = await fetchInvoices()

    expect(result.data).toHaveLength(0)
    expect(result.pagination.totalItems).toBe(0)
  })
})

// ─── fetchInvoiceById ────────────────────────────────────

describe('fetchInvoiceById', () => {
  it('calls GET /invoices/:id', async () => {
    let capturedPath: string | null = null
    server.use(
      http.get(apiUrl('/invoices/inv-1'), ({ request }) => {
        capturedPath = new URL(request.url).pathname
        return apiSuccess({ ...MOCK_INVOICE, lineItems: [], payments: [] })
      }),
    )

    await fetchInvoiceById('inv-1')

    expect(capturedPath).toBe('/api/v1/invoices/inv-1')
  })

  it('returns the invoice detail from the response envelope', async () => {
    server.use(
      http.get(apiUrl('/invoices/inv-1'), () =>
        apiSuccess({ ...MOCK_INVOICE, lineItems: [], payments: [] }),
      ),
    )

    const result = await fetchInvoiceById('inv-1')

    expect(result.id).toBe('inv-1')
    expect(result.billingYear).toBe(2026)
    expect(result.billingMonth).toBe(5)
  })

  it('propagates a 404 as ApiError', async () => {
    server.use(
      http.get(apiUrl('/invoices/missing'), () =>
        HttpResponse.json({ success: false, message: 'Không tìm thấy hóa đơn.' }, { status: 404 }),
      ),
    )

    await expect(fetchInvoiceById('missing')).rejects.toBeInstanceOf(ApiError)
  })

  it('propagates a 403 as ApiError', async () => {
    server.use(
      http.get(apiUrl('/invoices/other'), () =>
        apiError(403, 'Forbidden'),
      ),
    )

    await expect(fetchInvoiceById('other')).rejects.toBeInstanceOf(ApiError)
  })
})

// ─── generateInvoices ────────────────────────────────────

describe('generateInvoices', () => {
  it('calls POST /invoices/generate with the correct body', async () => {
    let capturedBody: unknown = null
    server.use(
      http.post(apiUrl('/invoices/generate'), async ({ request }) => {
        capturedBody = await request.json()
        return apiSuccess({ generated: [MOCK_INVOICE], skipped: [], warnings: [] })
      }),
    )

    await generateInvoices({ buildingId: 'building-1', billingYear: 2026, billingMonth: 5 })

    expect(capturedBody).toMatchObject({
      buildingId: 'building-1',
      billingYear: 2026,
      billingMonth: 5,
    })
  })

  it('returns generated, skipped, and warnings from result', async () => {
    server.use(
      http.post(apiUrl('/invoices/generate'), () =>
        apiSuccess({
          generated: [MOCK_INVOICE],
          skipped: [{ contractId: 'c2', reason: 'Already exists' }],
          warnings: ['Some warning'],
        }),
      ),
    )

    const result = await generateInvoices({
      buildingId: 'building-1',
      billingYear: 2026,
      billingMonth: 5,
    })

    expect(result.generated).toHaveLength(1)
    expect(result.skipped).toHaveLength(1)
    expect(result.warnings).toHaveLength(1)
    expect(result.skipped[0].reason).toBe('Already exists')
  })

  it('returns empty arrays when no invoices were generated', async () => {
    server.use(
      http.post(apiUrl('/invoices/generate'), () =>
        apiSuccess({ generated: [], skipped: [], warnings: [] }),
      ),
    )

    const result = await generateInvoices({
      buildingId: 'building-1',
      billingYear: 2026,
      billingMonth: 5,
    })

    expect(result.generated).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
  })

  it('propagates a 4xx error as ApiError', async () => {
    server.use(
      http.post(apiUrl('/invoices/generate'), () =>
        apiError(400, 'Building not found', 'NOT_FOUND'),
      ),
    )

    await expect(
      generateInvoices({ buildingId: 'bad', billingYear: 2026, billingMonth: 5 }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})

// ─── updateInvoice ───────────────────────────────────────

describe('updateInvoice', () => {
  it('calls PUT /invoices/:id with the update body', async () => {
    let capturedBody: unknown = null
    server.use(
      http.put(apiUrl('/invoices/inv-1'), async ({ request }) => {
        capturedBody = await request.json()
        return apiSuccess({ ...MOCK_INVOICE, penaltyAmount: 100000, discountAmount: 50000 })
      }),
    )

    await updateInvoice('inv-1', { penaltyAmount: 100000, discountAmount: 50000, note: 'Late fee' })

    expect(capturedBody).toMatchObject({
      penaltyAmount: 100000,
      discountAmount: 50000,
      note: 'Late fee',
    })
  })

  it('returns the updated invoice', async () => {
    server.use(
      http.put(apiUrl('/invoices/inv-1'), () =>
        apiSuccess({ ...MOCK_INVOICE, penaltyAmount: 200000 }),
      ),
    )

    const result = await updateInvoice('inv-1', { penaltyAmount: 200000 })

    expect(result.penaltyAmount).toBe(200000)
  })
})

// ─── sendInvoice ─────────────────────────────────────────

describe('sendInvoice', () => {
  it('calls PATCH /invoices/:id/send', async () => {
    let methodAndPath: string | null = null
    server.use(
      http.patch(apiUrl('/invoices/inv-1/send'), ({ request }) => {
        methodAndPath = `${request.method} ${new URL(request.url).pathname}`
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await sendInvoice('inv-1')

    expect(methodAndPath).toBe('PATCH /api/v1/invoices/inv-1/send')
  })

  it('propagates a 409 conflict as ApiError', async () => {
    server.use(
      http.patch(apiUrl('/invoices/inv-1/send'), () =>
        apiError(409, 'Invoice already sent', 'ALREADY_SENT'),
      ),
    )

    await expect(sendInvoice('inv-1')).rejects.toBeInstanceOf(ApiError)
  })
})

// ─── batchSendInvoices ───────────────────────────────────

describe('batchSendInvoices', () => {
  it('calls POST /invoices/send-batch with invoiceIds', async () => {
    let capturedBody: unknown = null
    server.use(
      http.post(apiUrl('/invoices/send-batch'), async ({ request }) => {
        capturedBody = await request.json()
        return apiSuccess({ sentCount: 3 })
      }),
    )

    await batchSendInvoices({ invoiceIds: ['inv-1', 'inv-2', 'inv-3'] })

    expect(capturedBody).toMatchObject({ invoiceIds: ['inv-1', 'inv-2', 'inv-3'] })
  })

  it('returns sentCount from the response', async () => {
    server.use(
      http.post(apiUrl('/invoices/send-batch'), () =>
        apiSuccess({ sentCount: 5 }),
      ),
    )

    const result = await batchSendInvoices({ invoiceIds: ['a', 'b', 'c', 'd', 'e'] })

    expect(result.sentCount).toBe(5)
  })

  it('propagates errors as ApiError', async () => {
    server.use(
      http.post(apiUrl('/invoices/send-batch'), () =>
        apiError(400, 'Empty invoiceIds', 'VALIDATION_ERROR'),
      ),
    )

    await expect(batchSendInvoices({ invoiceIds: [] })).rejects.toBeInstanceOf(ApiError)
  })
})

// ─── voidInvoice ─────────────────────────────────────────

describe('voidInvoice', () => {
  it('calls PATCH /invoices/:id/void', async () => {
    let methodAndPath: string | null = null
    server.use(
      http.patch(apiUrl('/invoices/inv-1/void'), ({ request }) => {
        methodAndPath = `${request.method} ${new URL(request.url).pathname}`
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await voidInvoice('inv-1')

    expect(methodAndPath).toBe('PATCH /api/v1/invoices/inv-1/void')
  })

  it('propagates a 409 conflict as ApiError when invoice is already paid', async () => {
    server.use(
      http.patch(apiUrl('/invoices/inv-1/void'), () =>
        apiError(409, 'Cannot void a paid invoice', 'INVALID_STATUS'),
      ),
    )

    await expect(voidInvoice('inv-1')).rejects.toBeInstanceOf(ApiError)
  })
})
