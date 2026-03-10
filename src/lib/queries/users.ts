import { api, type ApiResponse } from '@/lib/api-client'
import type {
  UserProfileDto,
  OwnerDashboardDto,
  StaffDashboardDto,
  TenantDashboardDto,
} from '@/types/api'

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  dashboard: () => [...userKeys.all, 'dashboard'] as const,
  detail: (id: string) => [...userKeys.all, id] as const,
  list: (filters: object) => [...userKeys.all, 'list', filters] as const,
}

export async function fetchCurrentUser() {
  const res = await api.get<UserProfileDto>('/users/me')
  return res.data!
}

export async function fetchDashboard() {
  const res = await api.get<OwnerDashboardDto | StaffDashboardDto | TenantDashboardDto>('/users/me/dashboard')
  return res.data!
}

export async function updateProfile(body: { fullName?: string; phone?: string }) {
  const res = await api.put<UserProfileDto>('/users/me', body)
  return res.data!
}

export async function changePassword(body: { currentPassword: string; newPassword: string }) {
  await api.put('/users/me/password', body)
}
