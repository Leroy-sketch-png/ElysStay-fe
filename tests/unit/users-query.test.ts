import { http, HttpResponse } from 'msw'
import { ApiError, setTokenAccessor } from '@/lib/api-client'
import {
  fetchCurrentUser,
  fetchDashboard,
  updateProfile,
  changePassword,
} from '@/lib/queries/users'
import { apiSuccess, apiUrl } from '../fixtures/handlers'
import { server } from '../fixtures/server'

beforeAll(() => setTokenAccessor(() => 'test-jwt-token'))

describe('users queries', () => {
  it('fetchCurrentUser calls GET /users/me and returns the payload', async () => {
    server.use(
      http.get(apiUrl('/users/me'), () =>
        apiSuccess({ id: 'u1', fullName: 'Owner User', email: 'owner@test.com', roles: ['Owner'] }),
      ),
    )

    const result = await fetchCurrentUser()
    expect(result.fullName).toBe('Owner User')
  })

  it('fetchDashboard calls GET /users/me/dashboard and returns dashboard data', async () => {
    server.use(
      http.get(apiUrl('/users/me/dashboard'), () =>
        apiSuccess({ totalBuildings: 2, totalRooms: 20, occupiedRooms: 18, occupancyRate: 0.9 }),
      ),
    )

    const result = await fetchDashboard()
    expect(result).toMatchObject({ totalBuildings: 2, totalRooms: 20 })
  })

  it('updateProfile sends PUT /users/me with the request body', async () => {
    let body: unknown = null
    server.use(
      http.put(apiUrl('/users/me'), async ({ request }) => {
        body = await request.json()
        return apiSuccess({ id: 'u1', fullName: 'New Name', phone: '0912345678' })
      }),
    )

    await updateProfile({ fullName: 'New Name', phone: '0912345678' })
    expect(body).toMatchObject({ fullName: 'New Name', phone: '0912345678' })
  })

  it('changePassword sends PUT /users/me/password', async () => {
    let body: unknown = null
    server.use(
      http.put(apiUrl('/users/me/password'), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ success: true })
      }),
    )

    await changePassword({ currentPassword: 'old', newPassword: 'new' })
    expect(body).toMatchObject({ currentPassword: 'old', newPassword: 'new' })
  })

  it('fetchCurrentUser propagates a 401 as ApiError', async () => {
    server.use(
      http.get(apiUrl('/users/me'), () =>
        HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }),
      ),
    )

    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(ApiError)
  })
})
