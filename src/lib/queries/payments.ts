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
  const qs = toQueryString({
    buildingId: filters.buildingId,
    type: filters.type,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    sort: filters.sort ?? 'paidAt:desc',
  })
  return api.getPaged<PaymentDto>(`/payments${qs}`)
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
