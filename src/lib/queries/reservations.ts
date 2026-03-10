import { api, toQueryString } from '@/lib/api-client'
import type {
  ReservationDto,
  CreateReservationRequest,
  ChangeReservationStatusRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const reservationKeys = {
  all: ['reservations'] as const,
  list: (filters: object) => [...reservationKeys.all, 'list', filters] as const,
  detail: (id: string) => [...reservationKeys.all, id] as const,
}

// ─── Queries ────────────────────────────────────────────

export interface ReservationFilters {
  buildingId?: string
  roomId?: string
  status?: string
  sortBy?: string
  sortDesc?: boolean
  page?: number
  pageSize?: number
}

export async function fetchReservations(filters: ReservationFilters = {}) {
  const qs = toQueryString({
    buildingId: filters.buildingId,
    roomId: filters.roomId,
    status: filters.status,
    sortBy: filters.sortBy ?? 'createdAt',
    sortDesc: filters.sortDesc ?? true,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  })
  return api.getPaged<ReservationDto>(`/reservations${qs}`)
}

// ─── Mutations ──────────────────────────────────────────

export async function createReservation(data: CreateReservationRequest) {
  const res = await api.post<ReservationDto>('/reservations', data)
  return res.data!
}

export async function changeReservationStatus(id: string, data: ChangeReservationStatusRequest) {
  const res = await api.patch<ReservationDto>(`/reservations/${id}/status`, data)
  return res.data!
}
