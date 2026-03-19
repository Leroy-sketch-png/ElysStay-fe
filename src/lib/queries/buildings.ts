import { api, toQueryString, requireData, type PagedResponse } from '@/lib/api-client'
import type {
  BuildingDto,
  BuildingDetailDto,
  CreateBuildingRequest,
  UpdateBuildingRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const buildingKeys = {
  all: ['buildings'] as const,
  list: (filters: object) => [...buildingKeys.all, 'list', filters] as const,
  detail: (id: string) => [...buildingKeys.all, id] as const,
}

// ─── Queries ────────────────────────────────────────────

export interface BuildingFilters {
  name?: string
  address?: string
  page?: number
  pageSize?: number
  sort?: string
}

export async function fetchBuildings(filters: BuildingFilters = {}) {
  const qs = toQueryString({
    name: filters.name,
    address: filters.address,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    sort: filters.sort ?? 'createdAt:desc',
  })
  return api.getPaged<BuildingDto>(`/buildings${qs}`)
}

export async function fetchBuildingById(id: string) {
  const res = await api.get<BuildingDetailDto>(`/buildings/${id}`)
  return requireData(res)
}

// ─── Mutations ──────────────────────────────────────────

export async function createBuilding(data: CreateBuildingRequest) {
  const res = await api.post<BuildingDto>('/buildings', data)
  return requireData(res)
}

export async function updateBuilding(id: string, data: UpdateBuildingRequest) {
  const res = await api.put<BuildingDto>(`/buildings/${id}`, data)
  return requireData(res)
}

export async function deleteBuilding(id: string) {
  await api.delete(`/buildings/${id}`)
}
