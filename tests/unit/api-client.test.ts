/**
 * Unit tests for api-client.ts
 *
 * Tests the core API client behavior: envelope parsing, error handling,
 * token injection, 401 refresh flow, retry-after parsing, and helpers.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import '../fixtures/server'
import { http, HttpResponse, apiUrl, apiSuccess, apiError, api429, apiValidationError } from '../fixtures/handlers'
import { server } from '../fixtures/server'
import {
  api,
  ApiError,
  requireData,
  toQueryString,
  setTokenAccessor,
  setOnUnauthorized,
  setTokenRefresher,
} from '@/lib/api-client'

// Reset token/auth hooks between tests
beforeEach(() => {
  setTokenAccessor(null as unknown as () => string | undefined)
  setOnUnauthorized(null as unknown as () => void)
  setTokenRefresher(null as unknown as () => Promise<boolean>)
})

// ─── Successful Responses ───────────────────────────────

describe('api.get — success envelope', () => {
  it('returns parsed ApiResponse on success', async () => {
    server.use(
      http.get(apiUrl('/test'), () => apiSuccess({ id: 1, name: 'Room A' })),
    )

    const res = await api.get<{ id: number; name: string }>('/test')
    expect(res.success).toBe(true)
    expect(res.data).toEqual({ id: 1, name: 'Room A' })
  })
})

describe('api.post — sends JSON body', () => {
  it('posts body and returns envelope', async () => {
    server.use(
      http.post(apiUrl('/rooms'), async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        return apiSuccess({ id: 'new-id', roomNumber: body.roomNumber })
      }),
    )

    const res = await api.post<{ id: string; roomNumber: string }>('/rooms', {
      roomNumber: '101',
    })
    expect(res.data?.roomNumber).toBe('101')
  })
})

// ─── Error Handling ─────────────────────────────────────

describe('ApiError on HTTP failure', () => {
  it('throws ApiError with status and message for 404', async () => {
    server.use(
      http.get(apiUrl('/missing'), () =>
        apiError(404, 'Không tìm thấy', 'NOT_FOUND'),
      ),
    )

    await expect(api.get('/missing')).rejects.toThrow(ApiError)
    try {
      await api.get('/missing')
    } catch (e) {
      const err = e as ApiError
      expect(err.status).toBe(404)
      expect(err.errorCode).toBe('NOT_FOUND')
    }
  })

  it('throws ApiError with field errors for 400 validation', async () => {
    server.use(
      http.post(apiUrl('/validate'), () =>
        apiValidationError({ RoomNumber: ['Số phòng đã tồn tại'] }),
      ),
    )

    await expect(api.post('/validate', {})).rejects.toThrow(ApiError)
    try {
      await api.post('/validate', {})
    } catch (e) {
      const err = e as ApiError
      expect(err.status).toBe(400)
      expect(err.errors?.RoomNumber).toEqual(['Số phòng đã tồn tại'])
    }
  })
})

// ─── 429 Rate Limiting ──────────────────────────────────

describe('429 with Retry-After header', () => {
  it('parses Retry-After seconds into retryAfterMs', async () => {
    server.use(
      http.get(apiUrl('/limited'), () => api429(30)),
    )

    try {
      await api.get('/limited')
    } catch (e) {
      const err = e as ApiError
      expect(err.status).toBe(429)
      expect(err.retryAfterMs).toBe(30_000)
    }
  })
})

// ─── 401 Token Refresh Flow ─────────────────────────────

describe('401 refresh-and-retry', () => {
  it('retries the request after successful token refresh', async () => {
    let callCount = 0
    server.use(
      http.get(apiUrl('/protected'), () => {
        callCount++
        if (callCount === 1) {
          return apiError(401, 'Token expired', 'UNAUTHORIZED')
        }
        return apiSuccess({ secret: 'data' })
      }),
    )

    // Provide a refresher that "succeeds"
    setTokenRefresher(async () => true)
    setTokenAccessor(() => 'refreshed-token')

    const res = await api.get<{ secret: string }>('/protected')
    expect(res.data?.secret).toBe('data')
    expect(callCount).toBe(2)
  })

  it('calls onUnauthorized when refresh fails', async () => {
    server.use(
      http.get(apiUrl('/protected'), () =>
        apiError(401, 'Token expired', 'UNAUTHORIZED'),
      ),
    )

    const onUnauth = vi.fn()
    setTokenRefresher(async () => false)
    setOnUnauthorized(onUnauth)

    await expect(api.get('/protected')).rejects.toThrow(ApiError)
    expect(onUnauth).toHaveBeenCalledOnce()
  })
})

// ─── Token Injection ────────────────────────────────────

describe('token injection', () => {
  it('sends Authorization header when token accessor is set', async () => {
    let capturedAuth = ''
    server.use(
      http.get(apiUrl('/auth-check'), ({ request }) => {
        capturedAuth = request.headers.get('Authorization') ?? ''
        return apiSuccess({ ok: true })
      }),
    )

    setTokenAccessor(() => 'my-jwt-token')
    await api.get('/auth-check')
    expect(capturedAuth).toBe('Bearer my-jwt-token')
  })
})

// ─── requireData helper ─────────────────────────────────

describe('requireData', () => {
  it('extracts data from a successful response', () => {
    const result = requireData({ success: true, data: { id: 1 } })
    expect(result).toEqual({ id: 1 })
  })

  it('throws ApiError when data is undefined', () => {
    expect(() => requireData({ success: true })).toThrow(ApiError)
  })

  it('throws ApiError when data is null', () => {
    expect(() => requireData({ success: true, data: null as unknown as undefined })).toThrow(ApiError)
  })
})

// ─── toQueryString helper ───────────────────────────────

describe('toQueryString', () => {
  it('builds query string from params', () => {
    const qs = toQueryString({ page: 1, pageSize: 20, search: 'hello' })
    expect(qs).toBe('?page=1&pageSize=20&search=hello')
  })

  it('filters out undefined, null, and empty strings', () => {
    const qs = toQueryString({ a: 'keep', b: undefined, c: null, d: '', e: 0 })
    expect(qs).toBe('?a=keep&e=0')
  })

  it('returns empty string when no valid params', () => {
    const qs = toQueryString({ a: undefined, b: '' })
    expect(qs).toBe('')
  })

  it('encodes special characters', () => {
    const qs = toQueryString({ q: 'hello world&more' })
    expect(qs).toBe('?q=hello%20world%26more')
  })
})

// ─── 204 No Content ─────────────────────────────────────

describe('204 No Content', () => {
  it('returns undefined for DELETE 204', async () => {
    server.use(
      http.delete(apiUrl('/items/1'), () => new HttpResponse(null, { status: 204 })),
    )

    const result = await api.delete('/items/1')
    expect(result).toBeUndefined()
  })
})

// ─── Success:false envelope ─────────────────────────────

describe('success:false in 200 response', () => {
  it('throws ApiError when envelope says success:false despite HTTP 200', async () => {
    server.use(
      http.get(apiUrl('/bad-envelope'), () =>
        HttpResponse.json(
          { success: false, message: 'Business rule violated', errorCode: 'RULE_FAIL' },
          { status: 200 },
        ),
      ),
    )

    await expect(api.get('/bad-envelope')).rejects.toThrow(ApiError)
    try {
      await api.get('/bad-envelope')
    } catch (e) {
      const err = e as ApiError
      expect(err.errorCode).toBe('RULE_FAIL')
    }
  })
})
