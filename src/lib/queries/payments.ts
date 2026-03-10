import { api, toQueryString } from '@/lib/api-client'
import type {
  PaymentDto,
  RecordPaymentRequest,
  BatchRecordPaymentsRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const paymentKeys = {
  all: ['payments'] as const,
  list: (params: PaymentFilters) => [...paymentKeys.all, 'list', params] as const,
}

export interface PaymentFilters {
  buildingId?: string
  type?: string
  fromDate?: string
  toDate?: string
  page?: number
  pageSize?: number
  sort?: string
}

// ─── Queries ────────────────────────────────────────────

export async function fetchPayments(filters: PaymentFilters = {}) {
  const params = new URLSearchParams()
  if (filters.buildingId) params.set('buildingId', filters.buildingId)
  if (filters.type) params.set('type', filters.type)
  if (filters.fromDate) params.set('fromDate', filters.fromDate)
  if (filters.toDate) params.set('toDate', filters.toDate)
  params.set('page', String(filters.page ?? 1))
  params.set('pageSize', String(filters.pageSize ?? 20))
  if (filters.sort) params.set('sort', filters.sort)

  return api.getPaged<PaymentDto>(`/payments?${params}`)
}

// ─── Mutations ──────────────────────────────────────────

/** Record payment on invoice (via invoices/{id}/payments) */
export async function recordPayment(invoiceId: string, data: RecordPaymentRequest) {
  const response = await api.post<PaymentDto>(`/invoices/${invoiceId}/payments`, data)
  return response.data
}

/** Batch record payments */
export async function batchRecordPayments(data: BatchRecordPaymentsRequest) {
  const response = await api.post<PaymentDto[]>('/payments/batch', data)
  return response.data
}
