/**
 * MSW request handlers for common API patterns.
 *
 * These intercept fetch calls made by api-client.ts and return backend-shaped
 * envelope responses (ApiResponse<T> / PagedResponse<T>).
 */
import { http, HttpResponse } from 'msw'

const API_BASE = 'http://localhost:5027/api/v1'

// ─── Response Factories ─────────────────────────────────

export function apiSuccess<T>(data: T) {
  return HttpResponse.json({ success: true, data })
}

export function apiPagedSuccess<T>(data: T[], page = 1, pageSize = 20, totalItems?: number) {
  const total = totalItems ?? data.length
  return HttpResponse.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      totalItems: total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

export function apiError(
  status: number,
  message: string,
  errorCode?: string,
  errors?: Record<string, string[]>,
) {
  return HttpResponse.json(
    { success: false, message, errorCode, errors },
    { status },
  )
}

export function apiValidationError(errors: Record<string, string[]>) {
  return HttpResponse.json(
    {
      success: false,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors,
    },
    { status: 400 },
  )
}

export function api429(retryAfterSeconds = 60) {
  return HttpResponse.json(
    { success: false, message: 'Too many requests', errorCode: 'RATE_LIMITED' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    },
  )
}

// ─── Default Handlers ───────────────────────────────────
// Fallback handlers that prevent unhandled request warnings.
// Override per-test by passing more specific handlers to server.use().

export const defaultHandlers = [
  // Health check
  http.get(`${API_BASE.replace('/api/v1', '')}/healthz`, () => {
    return HttpResponse.text('Healthy')
  }),
]

// ─── Helper to build full URL paths ─────────────────────

export function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

export { http, HttpResponse }
