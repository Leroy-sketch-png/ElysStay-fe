import { api, toQueryString, requireData, type PagedResponse } from '@/lib/api-client'
import type {
  StaffAssignmentDto,
  AssignStaffRequest,
  UserDto,
  CreateStaffRequest,
  ChangeUserStatusRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const staffKeys = {
  all: ['staff'] as const,
  list: (filters: object) => [...staffKeys.all, 'list', filters] as const,
  byBuilding: (buildingId: string) => [...staffKeys.all, 'building', buildingId] as const,
}

// ─── Queries ────────────────────────────────────────────

export interface StaffFilters {
  search?: string
  page?: number
  pageSize?: number
  sort?: string
}

export async function fetchStaffList(filters: StaffFilters = {}) {
  const qs = toQueryString({
    search: filters.search,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    sort: filters.sort ?? 'createdAt:desc',
  })
  return api.getPaged<UserDto>(`/users/staff${qs}`)
}

export async function fetchBuildingStaff(buildingId: string) {
  const res = await api.get<StaffAssignmentDto[]>(`/buildings/${buildingId}/staff`)
  return requireData(res)
}

// ─── Mutations ──────────────────────────────────────────

export async function assignStaff(buildingId: string, data: AssignStaffRequest) {
  const res = await api.post<StaffAssignmentDto>(`/buildings/${buildingId}/staff`, data)
  return requireData(res)
}

export async function unassignStaff(buildingId: string, staffId: string) {
  await api.delete(`/buildings/${buildingId}/staff/${staffId}`)
}

// ─── Staff User CRUD ────────────────────────────────────

export async function createStaffUser(data: CreateStaffRequest) {
  const res = await api.post<UserDto>('/users/staff', data)
  return requireData(res)
}

export async function changeUserStatus(userId: string, data: ChangeUserStatusRequest) {
  await api.patch(`/users/${userId}/status`, data)
}
