/**
 * ElysStay API Client
 *
 * Type-safe fetch wrapper matching the backend's ApiResponse<T> / PagedResponse<T> envelope.
 * Automatically injects Keycloak JWT token from the auth store.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:5027/api/v1'
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? DEFAULT_API_BASE_URL : '')

if (!API_BASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_API_URL in non-development environment.')
}

// ─── Response Types (match backend envelope) ────────────

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errorCode?: string
  errors?: Record<string, string[]>
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface PagedResponse<T> {
  success: boolean
  data: T[]
  pagination: PaginationMeta
  message?: string
  errorCode?: string
  errors?: Record<string, string[]>
}

// ─── Error Class ────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public errorCode?: string,
    public errors?: Record<string, string[]>,
    public retryAfterMs?: number,
    message?: string,
  ) {
    super(message || 'API request failed')
    this.name = 'ApiError'
  }
}

function getRetryAfterMs(response: Response): number | undefined {
  const retryAfter = response.headers.get('Retry-After')
  if (!retryAfter) {
    return undefined
  }

  const seconds = Number(retryAfter)
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const retryDate = Date.parse(retryAfter)
  if (Number.isNaN(retryDate)) {
    return undefined
  }

  return Math.max(0, retryDate - Date.now())
}

function isApiEnvelope(value: unknown): value is {
  success: boolean
  message?: string
  errorCode?: string
  errors?: Record<string, string[]>
} {
  return typeof value === 'object' && value !== null && 'success' in value
}

// ─── Token Accessor ─────────────────────────────────────

let getToken: (() => string | undefined) | null = null

export function setTokenAccessor(accessor: () => string | undefined) {
  getToken = accessor
}

// ─── Auth Error Handler ─────────────────────────────────

let onUnauthorized: (() => void) | null = null

/** Register a callback invoked on 401 responses (e.g. redirect to login) */
export function setOnUnauthorized(handler: () => void) {
  onUnauthorized = handler
}

// ─── Core Fetch ─────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken?.()

  const headers: HeadersInit = {
    ...options.headers,
  }

  // Only set Content-Type for JSON requests (not FormData)
  if (options.body && !(options.body instanceof FormData)) {
    ;(headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', undefined, undefined, 'Lỗi mạng — vui lòng kiểm tra kết nối và thử lại.')
  }

  // 204 No Content — callers expecting void or undefined handle this safely
  if (response.status === 204) {
    return undefined as unknown as T
  }

  let json: Record<string, unknown>
  try {
    json = await response.json()
  } catch {
    throw new ApiError(response.status, 'PARSE_ERROR', undefined, undefined, 'Phản hồi không mong đợi từ máy chủ.')
  }

  if (!response.ok) {
    const retryAfterMs = getRetryAfterMs(response)

    // 401 Unauthorized — token expired or invalid, trigger auth redirect
    if (response.status === 401) {
      onUnauthorized?.()
    }

    throw new ApiError(
      response.status,
      json.errorCode as string | undefined,
      json.errors as Record<string, string[]> | undefined,
      retryAfterMs,
      (json.message as string | undefined) ?? `Yêu cầu thất bại (${response.status})`,
    )
  }

  if (isApiEnvelope(json) && json.success === false) {
    throw new ApiError(
      response.status,
      typeof json.errorCode === 'string' ? json.errorCode : undefined,
      json.errors,
      undefined,
      typeof json.message === 'string'
        ? json.message
        : 'Máy chủ báo yêu cầu không thành công.',
    )
  }

  return json as T
}

// ─── HTTP Methods ───────────────────────────────────────

export const api = {
  get<T>(path: string): Promise<ApiResponse<T>> {
    return apiFetch<ApiResponse<T>>(path)
  },

  getPaged<T>(path: string): Promise<PagedResponse<T>> {
    return apiFetch<PagedResponse<T>>(path)
  },

  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return apiFetch<ApiResponse<T>>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return apiFetch<ApiResponse<T>>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return apiFetch<ApiResponse<T>>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  delete(path: string): Promise<void> {
    return apiFetch<void>(path, { method: 'DELETE' })
  },
}

// ─── Data Extraction Helper ─────────────────────────────

/** Extract `data` from an API response, throwing if absent. Replaces unsafe `res.data!`. */
export function requireData<T>(res: ApiResponse<T>): T {
  if (res.data === undefined || res.data === null) {
    throw new ApiError(
      0,
      'EMPTY_RESPONSE',
      undefined,
      undefined,
      res.message || 'Máy chủ trả về thành công nhưng không có dữ liệu.',
    )
  }
  return res.data
}

// ─── Query String Helper ────────────────────────────────

export function toQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .filter(([, v]) => typeof v !== 'string' || v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return entries.length > 0 ? `?${entries.join('&')}` : ''
}
