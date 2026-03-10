import { api, toQueryString } from '@/lib/api-client'
import type {
  ExpenseDto,
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (params: ExpenseFilters) => [...expenseKeys.all, 'list', params] as const,
}

export interface ExpenseFilters {
  buildingId?: string
  roomId?: string
  category?: string
  fromDate?: string
  toDate?: string
  sortBy?: string
  sortDesc?: boolean
  page?: number
  pageSize?: number
}

// ─── Queries ────────────────────────────────────────────

export async function fetchExpenses(filters: ExpenseFilters = {}) {
  const qs = toQueryString({
    buildingId: filters.buildingId,
    roomId: filters.roomId,
    category: filters.category,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    sortBy: filters.sortBy,
    sortDesc: filters.sortDesc,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  })
  return api.getPaged<ExpenseDto>(`/expenses${qs}`)
}

// ─── Mutations ──────────────────────────────────────────

export async function createExpense(data: CreateExpenseRequest) {
  const response = await api.post<ExpenseDto>('/expenses', data)
  return response.data!
}

export async function updateExpense(id: string, data: UpdateExpenseRequest) {
  const response = await api.put<ExpenseDto>(`/expenses/${id}`, data)
  return response.data!
}

export async function deleteExpense(id: string) {
  await api.delete(`/expenses/${id}`)
}
