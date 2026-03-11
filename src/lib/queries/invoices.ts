import { api, toQueryString } from '@/lib/api-client'
import type {
  InvoiceDto,
  InvoiceDetailDto,
  InvoiceGenerationResult,
  GenerateInvoicesRequest,
  UpdateInvoiceRequest,
  BatchSendInvoicesRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (params: InvoiceFilters) => [...invoiceKeys.all, 'list', params] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
}

export interface InvoiceFilters {
  buildingId?: string
  billingYear?: number
  billingMonth?: number
  status?: string
  page?: number
  pageSize?: number
  sort?: string
}

// ─── Queries ────────────────────────────────────────────

export async function fetchInvoices(filters: InvoiceFilters = {}) {
  const qs = toQueryString({
    buildingId: filters.buildingId,
    billingYear: filters.billingYear,
    billingMonth: filters.billingMonth,
    status: filters.status,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    sort: filters.sort ?? 'createdAt:desc',
  })
  return api.getPaged<InvoiceDto>(`/invoices${qs}`)
}

export async function fetchInvoiceById(id: string) {
  const response = await api.get<InvoiceDetailDto>(`/invoices/${id}`)
  return response.data!
}

// ─── Mutations ──────────────────────────────────────────

export async function generateInvoices(data: GenerateInvoicesRequest) {
  const response = await api.post<InvoiceGenerationResult>('/invoices/generate', data)
  return response.data!
}

export async function updateInvoice(id: string, data: UpdateInvoiceRequest) {
  const response = await api.put<InvoiceDto>(`/invoices/${id}`, data)
  return response.data!
}

export async function sendInvoice(id: string) {
  await api.patch(`/invoices/${id}/send`)
}

export async function batchSendInvoices(data: BatchSendInvoicesRequest) {
  const response = await api.post<{ sentCount: number }>('/invoices/send-batch', data)
  return response.data!
}

export async function voidInvoice(id: string) {
  await api.patch(`/invoices/${id}/void`)
}
