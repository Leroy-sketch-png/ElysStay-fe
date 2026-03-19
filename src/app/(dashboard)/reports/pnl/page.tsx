'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Building2,
  AlertTriangle,
  Download,
} from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { reportKeys, fetchPnlReport } from '@/lib/queries/reports'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import { DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import type { PnlMonthDto } from '@/types/api'

// ─── Month names ────────────────────────────────────────

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Year options ───────────────────────────────────────

function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y)
  }
  return years
}

// ─── Stat Card ──────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string
  value: string
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'destructive' | 'warning'
}) {
  const styles = {
    default: 'bg-card',
    success: 'bg-success/5 border-success/20',
    destructive: 'bg-destructive/5 border-destructive/20',
    warning: 'bg-warning/5 border-warning/20',
  }
  return (
    <div className={`rounded-lg border p-5 ${styles[variant]}`}>
      <div className='flex items-center justify-between'>
        <p className='text-sm font-medium text-muted-foreground'>{label}</p>
        <div className='text-muted-foreground'>{icon}</div>
      </div>
      <p className='mt-2 text-2xl font-bold tracking-tight'>{value}</p>
    </div>
  )
}

// ─── Month Row ──────────────────────────────────────────

function MonthRow({ month, now, selectedYear }: { month: PnlMonthDto; now: Date; selectedYear: number }) {
  const isCurrentYear = selectedYear === now.getFullYear()
  const isCurrent = isCurrentYear && month.month === now.getMonth() + 1
  const isFuture = selectedYear > now.getFullYear() || (isCurrentYear && month.month > now.getMonth() + 1)
  const isEmpty = month.operationalIncome === 0 && month.expenses === 0 && month.depositsReceived === 0

  return (
    <tr
      className={
        isCurrent
          ? 'bg-primary/5 font-medium'
          : isFuture && isEmpty
            ? 'text-muted-foreground/50'
            : ''
      }
    >
      <td className='px-4 py-3 text-sm font-medium'>
        {MONTH_FULL[month.month - 1]}
        {isCurrent && (
          <span className='ml-2 text-xs text-primary'>(current)</span>
        )}
      </td>
      <td className='px-4 py-3 text-sm text-right'>{formatCurrency(month.operationalIncome)}</td>
      <td className='px-4 py-3 text-sm text-right'>{formatCurrency(month.depositsReceived)}</td>
      <td className='px-4 py-3 text-sm text-right'>{formatCurrency(month.depositsRefunded)}</td>
      <td className='px-4 py-3 text-sm text-right text-destructive'>{formatCurrency(month.expenses)}</td>
      <td className='px-4 py-3 text-sm text-right font-medium'>
        <span className={month.netOperational >= 0 ? 'text-success' : 'text-destructive'}>
          {formatCurrency(month.netOperational)}
        </span>
      </td>
      <td className='px-4 py-3 text-sm text-right font-semibold'>
        <span className={month.netCashFlow >= 0 ? 'text-success' : 'text-destructive'}>
          {formatCurrency(month.netCashFlow)}
        </span>
      </td>
    </tr>
  )
}

// ─── Page ───────────────────────────────────────────────

export default function PnlReportPage() {
  const now = new Date()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const yearOptions = useMemo(getYearOptions, [])

  // ─── Queries ───────────────────────────────────────────
  const { data: buildingsData, error: buildingsError } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  const { data: report, isLoading, error: reportError } = useQuery({
    queryKey: reportKeys.pnl(selectedBuildingId || undefined, selectedYear),
    queryFn: () => fetchPnlReport(selectedBuildingId || undefined, selectedYear),
  })

  const buildings = buildingsData?.data ?? []
  const months = report?.months ?? []
  const loadError = buildingsError || reportError

  // ─── Totals ────────────────────────────────────────────
  const totals = useMemo(() => {
    return months.reduce(
      (acc, m) => ({
        operationalIncome: acc.operationalIncome + m.operationalIncome,
        depositsReceived: acc.depositsReceived + m.depositsReceived,
        depositsRefunded: acc.depositsRefunded + m.depositsRefunded,
        expenses: acc.expenses + m.expenses,
        netOperational: acc.netOperational + m.netOperational,
        netCashFlow: acc.netCashFlow + m.netCashFlow,
      }),
      {
        operationalIncome: 0,
        depositsReceived: 0,
        depositsRefunded: 0,
        expenses: 0,
        netOperational: 0,
        netCashFlow: 0,
      },
    )
  }, [months])

  // ─── CSV Export ─────────────────────────────────────────
  const handleExportCsv = useCallback(() => {
    if (months.length === 0) return

    const buildingLabel = selectedBuildingId
      ? buildings.find((b) => b.id === selectedBuildingId)?.name ?? 'Unknown'
      : 'All Buildings'

    // Escape CSV values: wrap in quotes if contains comma, quote, or newline
    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }

    const header = ['Month', 'Income', 'Deposits In', 'Deposits Out', 'Expenses', 'Net Operational', 'Net Cash Flow']
    const rows = months.map((m) => [
      escapeCsv(MONTH_FULL[m.month - 1]),
      m.operationalIncome.toFixed(2),
      m.depositsReceived.toFixed(2),
      m.depositsRefunded.toFixed(2),
      m.expenses.toFixed(2),
      m.netOperational.toFixed(2),
      m.netCashFlow.toFixed(2),
    ])
    rows.push([
      'Total',
      totals.operationalIncome.toFixed(2),
      totals.depositsReceived.toFixed(2),
      totals.depositsRefunded.toFixed(2),
      totals.expenses.toFixed(2),
      totals.netOperational.toFixed(2),
      totals.netCashFlow.toFixed(2),
    ])

    const csvContent = [header.map(escapeCsv), ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pnl-${buildingLabel.replace(/\s+/g, '-').toLowerCase()}-${selectedYear}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [months, totals, selectedYear, selectedBuildingId, buildings])

  return (
    <PageTransition>
    <PageContainer
      title='Profit & Loss Report'
      description={`Financial summary for ${selectedYear}`}
      actions={
        months.length > 0 ? (
          <Button variant='outline' size='sm' onClick={handleExportCsv}>
            <Download className='size-4' />
            Export CSV
          </Button>
        ) : undefined
      }
    >
      {/* Filters */}
      <div className='flex flex-wrap items-end gap-4'>
        <div className='w-56'>
          <Select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
          >
            <option value=''>All buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div className='w-32'>
          <Select
            value={String(selectedYear)}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loadError ? (
        <EmptyState
          icon={<AlertTriangle className='size-8' />}
          title='Unable to load P&L report'
          description={loadError instanceof Error ? loadError.message : 'An unexpected error occurred while loading the report.'}
          actionLabel='Retry'
          onAction={() => {
            queryClient.invalidateQueries({ queryKey: buildingKeys.all })
            queryClient.invalidateQueries({ queryKey: reportKeys.all })
          }}
        />
      ) : buildings.length === 0 && !isLoading ? (
        <EmptyState
          icon={<Building2 className='size-8' />}
          title='No buildings available'
          description='Create a building before relying on owner-level profit and loss reporting.'
          actionLabel='Go to Buildings'
          onAction={() => router.push('/buildings')}
        />
      ) : isLoading ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-24 rounded-lg' />
          ))}
        </div>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <SummaryCard
            label='Operational Income'
            value={formatCurrency(totals.operationalIncome)}
            icon={<TrendingUp className='size-5' />}
            variant='success'
          />
          <SummaryCard
            label='Total Expenses'
            value={formatCurrency(totals.expenses)}
            icon={<TrendingDown className='size-5' />}
            variant='destructive'
          />
          <SummaryCard
            label='Net Operational'
            value={formatCurrency(totals.netOperational)}
            icon={<ArrowUpDown className='size-5' />}
            variant={totals.netOperational >= 0 ? 'success' : 'destructive'}
          />
          <SummaryCard
            label='Net Cash Flow'
            value={formatCurrency(totals.netCashFlow)}
            icon={<ArrowUpDown className='size-5' />}
            variant={totals.netCashFlow >= 0 ? 'success' : 'destructive'}
          />
        </div>
      )}

      {!loadError && buildings.length > 0 && !isLoading && months.length === 0 ? (
        <EmptyState
          icon={<TrendingDown className='size-8' />}
          title='No P&L activity for this selection'
          description='There is no income, deposit, or expense data for the selected building and year yet.'
        />
      ) : !loadError && buildings.length > 0 ? (
      <Card>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b bg-muted/50'>
                  <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Month
                  </th>
                  <th className='px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Income
                  </th>
                  <th className='px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Deposits In
                  </th>
                  <th className='px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Deposits Out
                  </th>
                  <th className='px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Expenses
                  </th>
                  <th className='px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Net Op.
                  </th>
                  <th className='px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Cash Flow
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {isLoading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className='px-4 py-3'>
                          <Skeleton className='h-4 w-16' />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  months.map((m) => <MonthRow key={m.month} month={m} now={now} selectedYear={selectedYear} />)
                )}
              </tbody>
              {!isLoading && months.length > 0 && (
                <tfoot>
                  <tr className='border-t-2 bg-muted/30 font-semibold'>
                    <td className='px-4 py-3 text-sm'>Total</td>
                    <td className='px-4 py-3 text-sm text-right'>
                      {formatCurrency(totals.operationalIncome)}
                    </td>
                    <td className='px-4 py-3 text-sm text-right'>
                      {formatCurrency(totals.depositsReceived)}
                    </td>
                    <td className='px-4 py-3 text-sm text-right'>
                      {formatCurrency(totals.depositsRefunded)}
                    </td>
                    <td className='px-4 py-3 text-sm text-right text-destructive'>
                      {formatCurrency(totals.expenses)}
                    </td>
                    <td className='px-4 py-3 text-sm text-right'>
                      <span className={totals.netOperational >= 0 ? 'text-success' : 'text-destructive'}>
                        {formatCurrency(totals.netOperational)}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-sm text-right'>
                      <span className={totals.netCashFlow >= 0 ? 'text-success' : 'text-destructive'}>
                        {formatCurrency(totals.netCashFlow)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
      ) : null}
    </PageContainer>
    </PageTransition>
  )
}
