'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  CreditCard,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/EmptyState'
import { PaymentTypeBadge } from '@/components/ui/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { paymentKeys, fetchPayments, type PaymentFilters } from '@/lib/queries/payments'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import type { PaymentDto, PaymentType } from '@/types/api'

// ─── Type filter options ────────────────────────────────

const TYPE_OPTIONS: { label: string; value: PaymentType | '' }[] = [
  { label: 'All types', value: '' },
  { label: 'Rent Payment', value: 'RentPayment' },
  { label: 'Deposit In', value: 'DepositIn' },
  { label: 'Deposit Refund', value: 'DepositRefund' },
]

// ─── Page ───────────────────────────────────────────────

export default function PaymentsPage() {
  // ─── State ─────────────────────────────────────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // ─── Filters ───────────────────────────────────────────
  const filters: PaymentFilters = useMemo(
    () => ({
      buildingId: selectedBuildingId || undefined,
      type: typeFilter || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page,
      pageSize,
    }),
    [selectedBuildingId, typeFilter, fromDate, toDate, page, pageSize],
  )

  // ─── Queries ───────────────────────────────────────────
  const { data: buildings } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: 100 }),
  })

  const { data: paymentsData, isLoading, isError, error } = useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: () => fetchPayments(filters),
  })

  const payments = paymentsData?.data ?? []
  const pagination = paymentsData?.pagination

  // ─── Summary ───────────────────────────────────────────
  const summary = useMemo(() => {
    if (!payments.length) return { total: 0, rentPayments: 0, depositsIn: 0, depositsOut: 0 }
    return payments.reduce(
      (acc, p) => {
        acc.total += p.amount
        if (p.type === 'RentPayment') acc.rentPayments += p.amount
        else if (p.type === 'DepositIn') acc.depositsIn += p.amount
        else if (p.type === 'DepositRefund') acc.depositsOut += p.amount
        return acc
      },
      { total: 0, rentPayments: 0, depositsIn: 0, depositsOut: 0 },
    )
  }, [payments])

  // ─── Columns ───────────────────────────────────────────
  const columns: Column<PaymentDto>[] = [
    {
      key: 'paidAt',
      header: 'Date',
      render: (p) => <span className='text-sm'>{formatDate(p.paidAt)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => <PaymentTypeBadge type={p.type} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (p) => (
        <span
          className={
            p.type === 'DepositRefund' ? 'font-medium text-destructive' : 'font-medium text-green-600'
          }
        >
          {p.type === 'DepositRefund' ? '-' : '+'}
          {formatCurrency(p.amount)}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (p) => (
        <span className='text-sm text-muted-foreground capitalize'>
          {p.paymentMethod || 'Cash'}
        </span>
      ),
    },
    {
      key: 'recorder',
      header: 'Recorded By',
      render: (p) => <span className='text-sm'>{p.recorderName || '—'}</span>,
    },
    {
      key: 'note',
      header: 'Note',
      render: (p) => (
        <span className='text-sm text-muted-foreground truncate max-w-[200px] block'>
          {p.note || '—'}
        </span>
      ),
    },
    {
      key: 'invoice',
      header: '',
      render: (p) =>
        p.invoiceId ? (
          <Link
            href={`/billing/invoices/${p.invoiceId}`}
            className='text-primary hover:underline text-sm flex items-center gap-1'
            onClick={(e) => e.stopPropagation()}
          >
            Invoice
            <ExternalLink className='size-3' />
          </Link>
        ) : null,
      className: 'w-20',
    },
  ]

  return (
    <PageTransition>
    <PageContainer title='Payments' description='Payment history across all buildings'>
      {/* Filters */}
      <div className='flex flex-wrap items-end gap-4'>
        <div className='w-56'>
          <Select
            value={selectedBuildingId}
            onChange={(e) => {
              setSelectedBuildingId(e.target.value)
              setPage(1)
            }}
          >
            <option value=''>All buildings</option>
            {buildings?.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div className='w-44'>
          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className='flex items-end gap-2'>
          <div className='w-36'>
            <Label className='text-xs'>From</Label>
            <Input
              type='date'
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className='w-36'>
            <Label className='text-xs'>To</Label>
            <Input
              type='date'
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center'>
          <AlertTriangle className='mx-auto size-10 text-destructive mb-3' />
          <p className='font-medium text-destructive'>Failed to load payments</p>
          <p className='mt-1 text-sm text-muted-foreground'>{error?.message || 'An unexpected error occurred.'}</p>
        </div>
      )}

      {/* Summary Cards */}
      {!isError && pagination && pagination.totalItems > 0 && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardContent className='p-4'>
              <p className='text-sm text-muted-foreground'>Page Total</p>
              <p className='text-xl font-bold'>{formatCurrency(summary.total)}</p>
            </CardContent>
          </Card>
          <Card className='border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-800'>
            <CardContent className='p-4'>
              <p className='text-sm text-muted-foreground'>Rent Payments</p>
              <p className='text-xl font-bold text-green-600'>{formatCurrency(summary.rentPayments)}</p>
            </CardContent>
          </Card>
          <Card className='border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 dark:border-blue-800'>
            <CardContent className='p-4'>
              <p className='text-sm text-muted-foreground'>Deposits In</p>
              <p className='text-xl font-bold text-blue-600'>{formatCurrency(summary.depositsIn)}</p>
            </CardContent>
          </Card>
          <Card className='border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800'>
            <CardContent className='p-4'>
              <p className='text-sm text-muted-foreground'>Deposits Refunded</p>
              <p className='text-xl font-bold text-amber-600'>{formatCurrency(summary.depositsOut)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      {!isError && (
        <>
      <DataTable
        columns={columns}
        data={payments}
        rowKey={(p) => p.id}
        loading={isLoading}
        emptyMessage='No payments found.'
        emptyIcon={<CreditCard className='size-6' />}
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      )}
        </>
      )}
    </PageContainer>
    </PageTransition>
  )
}
