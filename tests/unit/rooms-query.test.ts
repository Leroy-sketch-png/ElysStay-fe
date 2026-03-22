/**
 * API contract tests for @/lib/queries/rooms
 *
 * Verifies that each room query/mutation calls the correct endpoint,
 * passes parameters correctly, and propagates errors.
 */
import { http, HttpResponse } from 'msw'
import {
  fetchBuildingRooms,
  fetchRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  changeRoomStatus,
} from '@/lib/queries/rooms'
import { ApiError, setTokenAccessor } from '@/lib/api-client'
import { server } from '../fixtures/server'
import { apiUrl, apiSuccess, apiPagedSuccess } from '../fixtures/handlers'

beforeAll(() => setTokenAccessor(() => 'test-jwt-token'))

// ─── fetchBuildingRooms ───────────────────────────────────

describe('fetchBuildingRooms', () => {
  it('calls GET /buildings/:id/rooms with default pagination', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/buildings/b1/rooms'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchBuildingRooms('b1')

    expect(capturedUrl!.pathname).toBe('/api/v1/buildings/b1/rooms')
    expect(capturedUrl!.searchParams.get('page')).toBe('1')
    expect(capturedUrl!.searchParams.get('sort')).toBe('roomNumber:asc')
  })

  it('includes status filter when provided', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/buildings/b1/rooms'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchBuildingRooms('b1', { status: 'Available' })

    expect(capturedUrl!.searchParams.get('status')).toBe('Available')
  })

  it('returns room data from the paged response', async () => {
    const mockRoom = {
      id: 'r1',
      buildingId: 'b1',
      roomNumber: '101',
      floor: 1,
      area: 25,
      price: 3000000,
      maxOccupants: 2,
      status: 'Available',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    }
    server.use(http.get(apiUrl('/buildings/b1/rooms'), () => apiPagedSuccess([mockRoom])))

    const result = await fetchBuildingRooms('b1')

    expect(result.data).toHaveLength(1)
    expect(result.data[0].roomNumber).toBe('101')
  })
})

// ─── createRoom ───────────────────────────────────────────

describe('createRoom', () => {
  it('calls POST /buildings/:id/rooms with the request body', async () => {
    let capturedBody: unknown = null
    server.use(
      http.post(apiUrl('/buildings/b1/rooms'), async ({ request }) => {
        capturedBody = await request.json()
        return apiSuccess({ id: 'new-room', roomNumber: '201' })
      }),
    )

    await createRoom('b1', {
      roomNumber: '201',
      floor: 2,
      area: 30,
      price: 4000000,
      maxOccupants: 3,
    })

    expect(capturedBody).toMatchObject({ roomNumber: '201', floor: 2 })
  })

  it('propagates validation error (400) as ApiError', async () => {
    server.use(
      http.post(apiUrl('/buildings/b1/rooms'), () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Validation failed',
            errorCode: 'VALIDATION_ERROR',
            errors: { RoomNumber: ['Đã tồn tại.'] },
          },
          { status: 400 },
        ),
      ),
    )

    await expect(
      createRoom('b1', { roomNumber: '101', floor: 1, area: 20, price: 2000000, maxOccupants: 2 }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})

// ─── changeRoomStatus ─────────────────────────────────────

describe('changeRoomStatus', () => {
  it('calls PATCH /rooms/:id/status with the new status', async () => {
    let capturedBody: unknown = null
    server.use(
      http.patch(apiUrl('/rooms/r1/status'), async ({ request }) => {
        capturedBody = await request.json()
        return apiSuccess({ id: 'r1', status: 'Maintenance' })
      }),
    )

    await changeRoomStatus('r1', { status: 'Maintenance' })

    expect(capturedBody).toMatchObject({ status: 'Maintenance' })
  })
})

// ─── deleteRoom ───────────────────────────────────────────

describe('deleteRoom', () => {
  it('calls DELETE /rooms/:id', async () => {
    let methodCalled = false
    server.use(
      http.delete(apiUrl('/rooms/r1'), () => {
        methodCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await deleteRoom('r1')

    expect(methodCalled).toBe(true)
  })
})
