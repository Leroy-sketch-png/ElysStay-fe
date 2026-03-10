import { api, toQueryString } from '@/lib/api-client'
import type {
  MeterReadingDto,
  BulkUpsertMeterReadingsRequest,
  UpdateMeterReadingRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const meterReadingKeys = {
  all: ['meterReadings'] as const,
  list: (params: MeterReadingFilters) => [...meterReadingKeys.all, 'list', params] as const,
}

export interface MeterReadingFilters {
  buildingId?: string
  billingYear: number
  billingMonth: number
}

// ─── Queries ────────────────────────────────────────────

export async function fetchMeterReadings(filters: MeterReadingFilters) {
  const qs = toQueryString({
    buildingId: filters.buildingId,
    billingYear: filters.billingYear,
    billingMonth: filters.billingMonth,
  })
  const response = await api.get<MeterReadingDto[]>(`/meter-readings${qs}`)
  return response.data
}

// ─── Mutations ──────────────────────────────────────────

export async function bulkUpsertMeterReadings(data: BulkUpsertMeterReadingsRequest) {
  const response = await api.post<MeterReadingDto[]>('/meter-readings/bulk', data)
  return response.data
}

export async function updateMeterReading(id: string, data: UpdateMeterReadingRequest) {
  const response = await api.put<MeterReadingDto>(`/meter-readings/${id}`, data)
  return response.data
}
