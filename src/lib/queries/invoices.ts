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
  const params = new URLSearchParams()
  if (filters.buildingId) params.set('buildingId', filters.buildingId)
  if (filters.billingYear) params.set('billingYear', String(filters.billingYear))
  if (filters.billingMonth) params.set('billingMonth', String(filters.billingMonth))
  if (filters.status) params.set('status', filters.status)
  params.set('page', String(filters.page ?? 1))
  params.set('pageSize', String(filters.pageSize ?? 20))
  if (filters.sort) params.set('sort', filters.sort)

  return api.getPaged<InvoiceDto>(`/invoices?${params}`)
}

export async function fetchInvoiceById(id: string) {
  const response = await api.get<InvoiceDetailDto>(`/invoices/${id}`)
  return response.data
}

// ─── Mutations ──────────────────────────────────────────

export async function generateInvoices(data: GenerateInvoicesRequest) {
  const response = await api.post<InvoiceGenerationResult>('/invoices/generate', data)
  return response.data
}

export async function updateInvoice(id: string, data: UpdateInvoiceRequest) {
  const response = await api.put<InvoiceDto>(`/invoices/${id}`, data)
  return response.data
}

export async function sendInvoice(id: string) {
  await api.patch(`/invoices/${id}/send`)
}

export async function batchSendInvoices(data: BatchSendInvoicesRequest) {
  const response = await api.post<{ sentCount: number }>('/invoices/send-batch', data)
  return response.data
}

export async function voidInvoice(id: string) {
  await api.patch(`/invoices/${id}/void`)
}
