import { api } from '@/lib/api-client'
import type {
  TenantProfileDto,
  UpdateTenantProfileRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const tenantProfileKeys = {
  all: ['tenant-profiles'] as const,
  detail: (userId: string) => [...tenantProfileKeys.all, userId] as const,
}

// ─── Queries ────────────────────────────────────────────

export async function fetchTenantProfile(userId: string): Promise<TenantProfileDto> {
  const res = await api.get<TenantProfileDto>(`/tenant-profiles/${userId}`)
  return res.data!
}

// ─── Mutations ──────────────────────────────────────────

export async function updateTenantProfile(
  userId: string,
  data: UpdateTenantProfileRequest,
): Promise<TenantProfileDto> {
  const res = await api.put<TenantProfileDto>(`/tenant-profiles/${userId}`, data)
  return res.data!
}
