import { api, toQueryString } from '@/lib/api-client'
import type { NotificationDto } from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters: object) => [...notificationKeys.all, 'list', filters] as const,
}

// ─── Queries ────────────────────────────────────────────

export interface NotificationFilters {
  page?: number
  pageSize?: number
  isRead?: boolean
}

export async function fetchNotifications(filters: NotificationFilters = {}) {
  const qs = toQueryString({
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    isRead: filters.isRead,
  })
  return api.getPaged<NotificationDto>(`/notifications${qs}`)
}

// ─── Mutations ──────────────────────────────────────────

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${id}/read`, {})
}

export async function markAllNotificationsRead() {
  const res = await api.patch<{ markedRead: number }>('/notifications/mark-all-read', {})
  return res.data!
}
