import { api, requireData } from '@/lib/api-client'
import type {
  ServiceDto,
  CreateServiceRequest,
  UpdateServiceRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const serviceKeys = {
  all: ['services'] as const,
  byBuilding: (buildingId: string) => [...serviceKeys.all, 'building', buildingId] as const,
}

// ─── Queries ────────────────────────────────────────────

export async function fetchBuildingServices(buildingId: string) {
  const res = await api.get<ServiceDto[]>(`/buildings/${buildingId}/services`)
  return requireData(res)
}

// ─── Mutations ──────────────────────────────────────────

export async function createService(buildingId: string, data: CreateServiceRequest) {
  const res = await api.post<ServiceDto>(`/buildings/${buildingId}/services`, data)
  return requireData(res)
}

export async function updateService(id: string, data: UpdateServiceRequest) {
  const res = await api.put<ServiceDto>(`/services/${id}`, data)
  return requireData(res)
}

export async function deactivateService(id: string) {
  await api.delete(`/services/${id}`)
}
