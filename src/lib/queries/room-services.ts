import { api, type ApiResponse } from '@/lib/api-client'
import type { RoomServiceDto, RoomServiceOverride } from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const roomServiceKeys = {
  all: ['room-services'] as const,
  byRoom: (roomId: string) => [...roomServiceKeys.all, roomId] as const,
}

// ─── Queries ────────────────────────────────────────────

export async function fetchRoomServices(roomId: string) {
  const res = await api.get<RoomServiceDto[]>(`/rooms/${roomId}/services`)
  return res.data!
}

// ─── Mutations ──────────────────────────────────────────

export async function updateRoomServices(roomId: string, overrides: RoomServiceOverride[]) {
  const res = await api.put<RoomServiceDto[]>(`/rooms/${roomId}/services`, overrides)
  return res.data!
}

export async function removeRoomServiceOverride(roomId: string, serviceId: string) {
  await api.delete(`/rooms/${roomId}/services/${serviceId}`)
}
