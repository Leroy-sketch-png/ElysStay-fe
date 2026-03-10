import { api, toQueryString, type ApiResponse, type PagedResponse } from '@/lib/api-client'
import type {
  RoomDto,
  CreateRoomRequest,
  UpdateRoomRequest,
  ChangeRoomStatusRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const roomKeys = {
  all: ['rooms'] as const,
  list: (filters: object) => [...roomKeys.all, 'list', filters] as const,
  byBuilding: (buildingId: string, filters?: object) =>
    [...roomKeys.all, 'building', buildingId, ...(filters ? [filters] : [])] as const,
  detail: (id: string) => [...roomKeys.all, id] as const,
}

// ─── Queries ────────────────────────────────────────────

export interface RoomFilters {
  buildingId?: string
  status?: string
  floor?: number
  page?: number
  pageSize?: number
  sort?: string
}

export async function fetchRooms(filters: RoomFilters = {}) {
  const qs = toQueryString({
    buildingId: filters.buildingId,
    status: filters.status,
    floor: filters.floor,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    sort: filters.sort ?? 'createdAt:desc',
  })
  return api.getPaged<RoomDto>(`/rooms${qs}`)
}

export async function fetchBuildingRooms(buildingId: string, filters: Omit<RoomFilters, 'buildingId'> = {}) {
  const qs = toQueryString({
    status: filters.status,
    floor: filters.floor,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    sort: filters.sort ?? 'roomNumber:asc',
  })
  return api.getPaged<RoomDto>(`/buildings/${buildingId}/rooms${qs}`)
}

export async function fetchRoomById(id: string) {
  const res = await api.get<RoomDto>(`/rooms/${id}`)
  return res.data!
}

// ─── Mutations ──────────────────────────────────────────

export async function createRoom(buildingId: string, data: CreateRoomRequest) {
  const res = await api.post<RoomDto>(`/buildings/${buildingId}/rooms`, data)
  return res.data!
}

export async function updateRoom(id: string, data: UpdateRoomRequest) {
  const res = await api.put<RoomDto>(`/rooms/${id}`, data)
  return res.data!
}

export async function deleteRoom(id: string) {
  await api.delete(`/rooms/${id}`)
}

export async function changeRoomStatus(id: string, data: ChangeRoomStatusRequest) {
  const res = await api.patch<RoomDto>(`/rooms/${id}/status`, data)
  return res.data!
}
