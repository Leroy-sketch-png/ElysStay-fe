/**
 * API contract tests for @/lib/queries/buildings
 *
 * Verifies that:
 * - The correct HTTP method and URL are called for each operation
 * - Query string parameters are serialized correctly
 * - Responses are parsed and returned as expected
 * - 4xx errors propagate as ApiError
 */
import { http, HttpResponse } from 'msw'
import {
  fetchBuildings,
  fetchBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} from '@/lib/queries/buildings'
import { ApiError, setTokenAccessor } from '@/lib/api-client'
import { server } from '../fixtures/server'
import { apiUrl, apiSuccess, apiPagedSuccess } from '../fixtures/handlers'

// Inject a fixed test token so the Authorization header is set
beforeAll(() => setTokenAccessor(() => 'test-jwt-token'))

// ─── fetchBuildings ──────────────────────────────────────

describe('fetchBuildings', () => {
  it('calls GET /buildings with default pagination parameters', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/buildings'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchBuildings()

    expect(capturedUrl).not.toBeNull()
    expect(capturedUrl!.searchParams.get('page')).toBe('1')
    expect(capturedUrl!.searchParams.get('pageSize')).toBe('20')
    expect(capturedUrl!.searchParams.get('sort')).toBe('createdAt:desc')
  })

  it('includes name filter when provided', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/buildings'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchBuildings({ name: 'Tower A' })

    expect(capturedUrl!.searchParams.get('name')).toBe('Tower A')
  })

  it('returns the building list from the response envelope', async () => {
    const mockBuilding = {
      id: 'b1',
      ownerId: 'o1',
      name: 'Tower A',
      address: '1 Main St',
      totalFloors: 5,
      invoiceDueDay: 10,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    }
    server.use(http.get(apiUrl('/buildings'), () => apiPagedSuccess([mockBuilding])))

    const result = await fetchBuildings()

    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe('Tower A')
    expect(result.pagination.totalItems).toBe(1)
  })
})

// ─── fetchBuildingById ───────────────────────────────────

describe('fetchBuildingById', () => {
  it('calls GET /buildings/:id', async () => {
    let capturedPath: string | null = null
    server.use(
      http.get(apiUrl('/buildings/building-123'), ({ request }) => {
        capturedPath = new URL(request.url).pathname
        return apiSuccess({ id: 'building-123', name: 'Tower A' })
      }),
    )

    await fetchBuildingById('building-123')

    expect(capturedPath).toBe('/api/v1/buildings/building-123')
  })

  it('propagates a 404 as ApiError', async () => {
    server.use(
      http.get(apiUrl('/buildings/missing'), () =>
        HttpResponse.json({ success: false, message: 'Không tìm thấy.' }, { status: 404 }),
      ),
    )

    await expect(fetchBuildingById('missing')).rejects.toBeInstanceOf(ApiError)
  })
})

// ─── createBuilding ──────────────────────────────────────

describe('createBuilding', () => {
  it('calls POST /buildings with the request body', async () => {
    let capturedBody: unknown = null
    server.use(
      http.post(apiUrl('/buildings'), async ({ request }) => {
        capturedBody = await request.json()
        return apiSuccess({ id: 'new', name: 'New Tower' })
      }),
    )

    const payload = { name: 'New Tower', address: '2 St', totalFloors: 3, invoiceDueDay: 5 }
    await createBuilding(payload as any)

    expect(capturedBody).toMatchObject({ name: 'New Tower' })
  })
})

// ─── deleteBuilding ──────────────────────────────────────

describe('deleteBuilding', () => {
  it('calls DELETE /buildings/:id', async () => {
    let methodCalled = false
    server.use(
      http.delete(apiUrl('/buildings/b1'), () => {
        methodCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await deleteBuilding('b1')

    expect(methodCalled).toBe(true)
  })
})
