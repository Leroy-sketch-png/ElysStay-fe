import { api, toQueryString, requireData } from '@/lib/api-client'
import type {
  PaymentDto,
  PaymentSummaryDto,
  PaymentType,
  RecordPaymentRequest,
  BatchRecordPaymentsRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const paymentKeys = {
  all: ['payments'] as const,
  list: (params: PaymentFilters) => [...paymentKeys.all, 'list', params] as const,
  summary: (params: PaymentSummaryFilters) => [...paymentKeys.all, 'summary', params] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
}

export interface PaymentFilters {
  buildingId?: string
  type?: PaymentType
  fromDate?: string
  toDate?: string
  page?: number
  pageSize?: number
  sort?: string
}

export interface PaymentSummaryFilters {
  buildingId?: string
  type?: PaymentType
  fromDate?: string
  toDate?: string
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

export async function fetchPaymentSummary(filters: PaymentSummaryFilters = {}) {
  const qs = toQueryString({
    buildingId: filters.buildingId,
    type: filters.type,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  })
  const response = await api.get<PaymentSummaryDto>(`/payments/summary${qs}`)
  return requireData(response)
}

// ─── Mutations ──────────────────────────────────────────

/** Record payment on invoice (via invoices/{id}/payments) */
export async function recordPayment(invoiceId: string, data: RecordPaymentRequest) {
  const response = await api.post<PaymentDto>(`/invoices/${invoiceId}/payments`, data)
  return requireData(response)
}

/** Batch record payments */
export async function batchRecordPayments(data: BatchRecordPaymentsRequest) {
  const response = await api.post<PaymentDto[]>('/payments/batch', data)
  return requireData(response)
}
