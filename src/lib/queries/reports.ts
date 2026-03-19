import { api, toQueryString, requireData } from '@/lib/api-client'
import type { DashboardStatsDto, PnlReportDto } from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const reportKeys = {
  all: ['reports'] as const,
  dashboardStats: (buildingId?: string) =>
    [...reportKeys.all, 'dashboard-stats', buildingId ?? 'all'] as const,
  pnl: (buildingId?: string, year?: number) =>
    [...reportKeys.all, 'pnl', buildingId ?? 'all', year ?? new Date().getFullYear()] as const,
}

// ─── Queries ────────────────────────────────────────────

export async function fetchDashboardStats(buildingId?: string) {
  const qs = buildingId ? toQueryString({ buildingId }) : ''
  const res = await api.get<DashboardStatsDto>(`/reports/dashboard-stats${qs}`)
  return requireData(res)
}

export async function fetchPnlReport(buildingId?: string, year?: number) {
  const qs = toQueryString({
    buildingId,
    year: year ?? new Date().getFullYear(),
  })
  const res = await api.get<PnlReportDto>(`/reports/pnl${qs}`)
  return requireData(res)
}
