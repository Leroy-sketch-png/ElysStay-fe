import { http } from 'msw'
import { setTokenAccessor } from '@/lib/api-client'
import { fetchDashboardStats, fetchPnlReport } from '@/lib/queries/reports'
import { apiSuccess, apiUrl } from '../fixtures/handlers'
import { server } from '../fixtures/server'

beforeAll(() => setTokenAccessor(() => 'test-jwt-token'))

describe('reports queries', () => {
  it('fetchDashboardStats calls /reports/dashboard-stats without filters by default', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/reports/dashboard-stats'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiSuccess({ totalBuildings: 2, totalRooms: 20 })
      }),
    )

    await fetchDashboardStats()

    expect(capturedUrl).not.toBeNull()
    expect(capturedUrl!.search).toBe('')
  })

  it('fetchDashboardStats passes buildingId when provided', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/reports/dashboard-stats'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiSuccess({ totalBuildings: 1, totalRooms: 10 })
      }),
    )

    await fetchDashboardStats('building-1')

    expect(capturedUrl).not.toBeNull()
    expect(capturedUrl!.searchParams.get('buildingId')).toBe('building-1')
  })

  it('fetchPnlReport passes buildingId and year in the query string', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/reports/pnl'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiSuccess({ months: [] })
      }),
    )

    await fetchPnlReport('building-1', 2026)

    expect(capturedUrl).not.toBeNull()
    expect(capturedUrl!.searchParams.get('buildingId')).toBe('building-1')
    expect(capturedUrl!.searchParams.get('year')).toBe('2026')
  })

  it('fetchPnlReport returns the parsed report data', async () => {
    server.use(
      http.get(apiUrl('/reports/pnl'), () =>
        apiSuccess({ months: [{ month: 1, operationalIncome: 40000000 }] }),
      ),
    )

    const result = await fetchPnlReport(undefined, 2026)
    expect(result.months[0]).toMatchObject({ month: 1, operationalIncome: 40000000 })
  })
})
