/**
 * ElysStay API Client
 *
 * Type-safe fetch wrapper matching the backend's ApiResponse<T> / PagedResponse<T> envelope.
 * Automatically injects Keycloak JWT token from the auth store.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

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
}

// ─── Error Class ────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public errorCode?: string,
    public errors?: Record<string, string[]>,
    message?: string,
  ) {
    super(message || 'API request failed')
    this.name = 'ApiError'
  }
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

  // Only set Content-Type for requests that have a body
  if (options.body) {
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
    throw new ApiError(0, 'NETWORK_ERROR', undefined, 'Network error — check your connection and try again.')
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  let json: Record<string, unknown>
  try {
    json = await response.json()
  } catch {
    throw new ApiError(response.status, 'PARSE_ERROR', undefined, 'Unexpected response from the server.')
  }

  if (!response.ok) {
    // 401 Unauthorized — token expired or invalid, trigger auth redirect
    if (response.status === 401) {
      onUnauthorized?.()
    }

    throw new ApiError(
      response.status,
      json.errorCode as string | undefined,
      json.errors as Record<string, string[]> | undefined,
      (json.message as string | undefined) ?? `Request failed (${response.status})`,
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

// ─── Query String Helper ────────────────────────────────

export function toQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return entries.length > 0 ? `?${entries.join('&')}` : ''
}
