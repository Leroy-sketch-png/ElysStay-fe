import { api, toQueryString, requireData, type PagedResponse } from '@/lib/api-client'
import type {
  UserDto,
  CreateTenantRequest,
  ChangeUserStatusRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const tenantKeys = {
  all: ['tenants'] as const,
  list: (filters: object) => [...tenantKeys.all, 'list', filters] as const,
  detail: (id: string) => [...tenantKeys.all, id] as const,
}

// ─── Queries ────────────────────────────────────────────

export interface TenantFilters {
  search?: string
  page?: number
  pageSize?: number
  sort?: string
}

export async function fetchTenants(filters: TenantFilters = {}): Promise<PagedResponse<UserDto>> {
  const qs = toQueryString({
    search: filters.search,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    sort: filters.sort ?? 'createdAt:desc',
  })
  return api.getPaged<UserDto>(`/users/tenants${qs}`)
}

export async function fetchTenantById(id: string): Promise<UserDto> {
  const res = await api.get<UserDto>(`/users/${id}`)
  return requireData(res)
}

// ─── Mutations ──────────────────────────────────────────

export async function createTenant(data: CreateTenantRequest): Promise<UserDto> {
  const res = await api.post<UserDto>('/users/tenants', data)
  return requireData(res)
}

export async function changeTenantStatus(id: string, data: ChangeUserStatusRequest): Promise<void> {
  await api.patch(`/users/${id}/status`, data)
}
