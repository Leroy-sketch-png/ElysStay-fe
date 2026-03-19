import { api, toQueryString, requireData } from '@/lib/api-client'
import type {
  ExpenseDto,
  ExpenseSummaryDto,
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (params: ExpenseFilters) => [...expenseKeys.all, 'list', params] as const,
  summary: (params: ExpenseSummaryFilters) => [...expenseKeys.all, 'summary', params] as const,
  detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
}

export interface ExpenseFilters {
  buildingId?: string
  roomId?: string
  category?: string
  fromDate?: string
  toDate?: string
  sort?: string
  page?: number
  pageSize?: number
}

export interface ExpenseSummaryFilters {
  buildingId?: string
  roomId?: string
  category?: string
  fromDate?: string
  toDate?: string
}

// ─── Queries ────────────────────────────────────────────

export async function fetchExpenses(filters: ExpenseFilters = {}) {
  const qs = toQueryString({
    buildingId: filters.buildingId,
    roomId: filters.roomId,
    category: filters.category,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    sort: filters.sort ?? 'expenseDate:desc',
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  })
  return api.getPaged<ExpenseDto>(`/expenses${qs}`)
}

export async function fetchExpenseSummary(filters: ExpenseSummaryFilters = {}) {
  const qs = toQueryString({
    buildingId: filters.buildingId,
    roomId: filters.roomId,
    category: filters.category,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  })
  const response = await api.get<ExpenseSummaryDto>(`/expenses/summary${qs}`)
  return requireData(response)
}

export async function fetchExpenseById(id: string) {
  const response = await api.get<ExpenseDto>(`/expenses/${id}`)
  return requireData(response)
}

// ─── Mutations ──────────────────────────────────────────

export async function createExpense(data: CreateExpenseRequest) {
  const response = await api.post<ExpenseDto>('/expenses', data)
  return requireData(response)
}

export async function updateExpense(id: string, data: UpdateExpenseRequest) {
  const response = await api.put<ExpenseDto>(`/expenses/${id}`, data)
  return requireData(response)
}

export async function deleteExpense(id: string) {
  await api.delete(`/expenses/${id}`)
}
