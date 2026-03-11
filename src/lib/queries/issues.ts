import { api, toQueryString } from '@/lib/api-client'
import type {
  MaintenanceIssueDto,
  CreateIssueRequest,
  UpdateIssueRequest,
  ChangeIssueStatusRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const issueKeys = {
  all: ['issues'] as const,
  list: (params: IssueFilters) => [...issueKeys.all, 'list', params] as const,
  detail: (id: string) => [...issueKeys.all, 'detail', id] as const,
}

export interface IssueFilters {
  buildingId?: string
  status?: string
  priority?: string
  sort?: string
  page?: number
  pageSize?: number
}

// ─── Queries ────────────────────────────────────────────

export async function fetchIssues(filters: IssueFilters = {}) {
  const qs = toQueryString({
    buildingId: filters.buildingId,
    status: filters.status,
    priority: filters.priority,
    sort: filters.sort ?? 'createdAt:desc',
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  })
  return api.getPaged<MaintenanceIssueDto>(`/issues${qs}`)
}

export async function fetchIssueById(id: string) {
  const response = await api.get<MaintenanceIssueDto>(`/issues/${id}`)
  return response.data!
}

// ─── Mutations ──────────────────────────────────────────

export async function createIssue(data: CreateIssueRequest) {
  const response = await api.post<MaintenanceIssueDto>('/issues', data)
  return response.data!
}

export async function updateIssue(id: string, data: UpdateIssueRequest) {
  const response = await api.put<MaintenanceIssueDto>(`/issues/${id}`, data)
  return response.data!
}

export async function changeIssueStatus(id: string, data: ChangeIssueStatusRequest) {
  const response = await api.patch<MaintenanceIssueDto>(`/issues/${id}/status`, data)
  return response.data!
}
