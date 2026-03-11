'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Building2,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { reportKeys, fetchPnlReport } from '@/lib/queries/reports'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
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
    success: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
    destructive: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',
  }
  return (
    <div className={`rounded-xl border p-5 ${styles[variant]}`}>
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
        <span className={month.netOperational >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
          {formatCurrency(month.netOperational)}
        </span>
      </td>
      <td className='px-4 py-3 text-sm text-right font-semibold'>
        <span className={month.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
          {formatCurrency(month.netCashFlow)}
        </span>
      </td>
    </tr>
  )
}

// ─── Page ───────────────────────────────────────────────

export default function PnlReportPage() {
  const now = new Date()
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const yearOptions = useMemo(getYearOptions, [])

  // ─── Queries ───────────────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: 100 }),
  })

  const { data: report, isLoading } = useQuery({
    queryKey: reportKeys.pnl(selectedBuildingId || undefined, selectedYear),
    queryFn: () => fetchPnlReport(selectedBuildingId || undefined, selectedYear),
  })

  const buildings = buildingsData?.data ?? []
  const months = report?.months ?? []

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

  return (
    <PageTransition>
    <PageContainer
      title='Profit & Loss Report'
      description={`Financial summary for ${selectedYear}`}
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

      {/* Summary cards */}
      {isLoading ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-24 rounded-xl' />
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

      {/* Monthly breakdown table */}
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
                      <span className={totals.netOperational >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                        {formatCurrency(totals.netOperational)}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-sm text-right'>
                      <span className={totals.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
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
    </PageContainer>
    </PageTransition>
  )
}
