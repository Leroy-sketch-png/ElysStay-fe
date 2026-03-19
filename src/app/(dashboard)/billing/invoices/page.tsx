'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, Send, AlertTriangle, Eye, Loader2, Filter, Building2,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/EmptyState'
import { InvoiceStatusBadge } from '@/components/ui/status-badge'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { INVOICE_STATUS_OPTIONS, canSendInvoice, DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import { formatCurrency, formatDate, formatBillingPeriod, getCurrentBillingPeriod } from '@/lib/utils'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import {
  invoiceKeys,
  fetchInvoices,
  generateInvoices,
  sendInvoice,
  batchSendInvoices,
  voidInvoice,
} from '@/lib/queries/invoices'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import type { InvoiceDto, InvoiceStatus } from '@/types/api'

// ─── Page ───────────────────────────────────────────────

export default function InvoicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const defaultPeriod = getCurrentBillingPeriod()

  // Support pre-filtering by contractId from URL (e.g. from contract detail page)
  const contractIdParam = searchParams.get('contractId') ?? undefined

  // ─── State ─────────────────────────────────────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [billingYear, setBillingYear] = useState(defaultPeriod.year)
  const [billingMonth, setBillingMonth] = useState(defaultPeriod.month)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchSendOpen, setBatchSendOpen] = useState(false)
  const [sendTarget, setSendTarget] = useState<string | null>(null)
  const hasActiveFilters = Boolean(
    contractIdParam
      || selectedBuildingId
      || billingYear !== defaultPeriod.year
      || billingMonth !== defaultPeriod.month
      || statusFilter,
  )

  // ─── Data: Buildings ───────────────────────────────────
  const { data: buildingsData, isLoading: buildingsLoading } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [selectedBuildingId, billingYear, billingMonth, statusFilter])

  // ─── Data: Invoices ────────────────────────────────────
  const { data: invoicesData, isLoading: invoicesLoading, error } = useQuery({
    queryKey: invoiceKeys.list({
      buildingId: selectedBuildingId || undefined,
      contractId: contractIdParam,
      billingYear: contractIdParam ? undefined : billingYear,
      billingMonth: contractIdParam ? undefined : billingMonth,
      status: statusFilter || undefined,
      page,
      pageSize,
    }),
    queryFn: () =>
      fetchInvoices({
        buildingId: selectedBuildingId || undefined,
        contractId: contractIdParam,
        billingYear: contractIdParam ? undefined : billingYear,
        billingMonth: contractIdParam ? undefined : billingMonth,
        status: statusFilter || undefined,
        page,
        pageSize,
      }),
  })

  const invoices = invoicesData?.data ?? []
  const pagination = invoicesData?.pagination

  // ─── Mutations ─────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: () =>
      generateInvoices({
        buildingId: selectedBuildingId,
        billingYear,
        billingMonth,
      }),
    onSuccess: (result) => {
      const genCount = result?.generated?.length ?? 0
      const skipCount = result?.skipped?.length ?? 0
      const warnCount = result?.warnings?.length ?? 0

      if (genCount > 0) {
        toast.success(
          `${genCount} invoice(s) generated`,
          skipCount > 0 || warnCount > 0
            ? `${skipCount} skipped, ${warnCount} warnings`
            : undefined,
        )
      } else if (skipCount > 0) {
        toast.info('No new invoices', 'All contracts already have invoices for this period.')
      } else {
        toast.info('No invoices to generate', 'No active contracts found.')
      }
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
    },
    onError: (error: Error) => {
      toast.error('Failed to generate invoices', error.message)
    },
  })

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendInvoice(id),
    onSuccess: () => {
      toast.success('Invoice sent')
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
    },
    onError: (error: Error) => {
      toast.error('Failed to send invoice', error.message)
    },
  })

  const batchSendMutation = useMutation({
    mutationFn: () => batchSendInvoices({ invoiceIds: selectedIds }),
    onSuccess: (result) => {
      toast.success(`${result?.sentCount ?? 0} invoice(s) sent`)
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      setSelectedIds([])
    },
    onError: (error: Error) => {
      toast.error('Failed to send invoices', error.message)
    },
  })

  // ─── Columns ───────────────────────────────────────────

  const columns: Column<InvoiceDto>[] = useMemo(
    () => [
      {
        key: 'select',
        header: '',
        render: (row) =>
          canSendInvoice(row.status) ? (
            <input
              type='checkbox'
              className='size-4 cursor-pointer'
              checked={selectedIds.includes(row.id)}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedIds((prev) =>
                  prev.includes(row.id)
                    ? prev.filter((id) => id !== row.id)
                    : [...prev, row.id],
                )
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : null,
      },
      {
        key: 'roomNumber',
        header: 'Room',
        render: (row) => (
          <div>
            <span className='font-medium'>{row.roomNumber}</span>
            <span className='text-xs text-muted-foreground ml-2'>{row.buildingName}</span>
          </div>
        ),
      },
      {
        key: 'tenantName',
        header: 'Tenant',
        render: (row) => row.tenantName,
      },
      {
        key: 'totalAmount',
        header: 'Total',
        render: (row) => formatCurrency(row.totalAmount),
      },
      {
        key: 'paidAmount',
        header: 'Paid',
        render: (row) => (
          <span className={row.paidAmount < row.totalAmount ? 'text-muted-foreground' : 'text-success'}>
            {formatCurrency(row.paidAmount)}
          </span>
        ),
      },
      {
        key: 'dueDate',
        header: 'Due',
        render: (row) => formatDate(row.dueDate),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <InvoiceStatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        header: '',
        render: (row) => (
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='sm'
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/billing/invoices/${row.id}`)
              }}
              aria-label='View invoice'
            >
              <Eye className='size-4' />
            </Button>
            {canSendInvoice(row.status) && (
              <Button
                variant='ghost'
                size='sm'
                onClick={(e) => {
                  e.stopPropagation()
                  setSendTarget(row.id)
                }}
                disabled={sendMutation.isPending}
                aria-label='Send invoice'
              >
                <Send className='size-4' />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [router, sendMutation, selectedIds],
  )

  // Count drafts for batch send
  const draftInvoiceIds = useMemo(
    () => invoices.filter((i) => i.status === 'Draft').map((i) => i.id),
    [invoices],
  )

  function clearFilters() {
    // Clear the contractId from URL if present
    if (contractIdParam) {
      router.replace('/billing/invoices')
    }
    setSelectedBuildingId('')
    setBillingYear(defaultPeriod.year)
    setBillingMonth(defaultPeriod.month)
    setStatusFilter('')
    setPage(1)
    setSelectedIds([])
  }

  // ─── No Buildings Prerequisite ─────────────────────────
  if (buildingsData && (buildingsData.data ?? []).length === 0) {
    return (
      <PageTransition>
      <PageContainer title='Invoices' description='Generate and manage monthly invoices.'>
        <EmptyState
          icon={<Building2 className='size-12' />}
          title='No buildings yet'
          description='Add your first building to start managing invoices.'
          actionLabel='Go to Buildings'
          actionHref='/buildings'
        />
      {/* Batch Send Confirm Dialog */}
      <ConfirmDialog
        open={batchSendOpen}
        onOpenChange={setBatchSendOpen}
        title='Send Selected Invoices'
        description={`Are you sure you want to send ${selectedIds.length} selected invoice${selectedIds.length > 1 ? 's' : ''} to tenants?`}
        confirmLabel='Send All'
        loading={batchSendMutation.isPending}
        onConfirm={() => {
          batchSendMutation.mutate(undefined, { onSettled: () => setBatchSendOpen(false) })
        }}
      />

      {/* Single Send Confirm Dialog */}
      <ConfirmDialog
        open={!!sendTarget}
        onOpenChange={(open) => { if (!open) setSendTarget(null) }}
        title='Send Invoice'
        description='This will mark the invoice as Sent and notify the tenant. Continue?'
        confirmLabel='Send'
        loading={sendMutation.isPending}
        onConfirm={() => {
          if (sendTarget) {
            sendMutation.mutate(sendTarget, { onSettled: () => setSendTarget(null) })
          }
        }}
      />
    </PageContainer>
      </PageTransition>
    )
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <PageTransition>
    <PageContainer
      title='Invoices'
      description='Generate and manage monthly invoices.'
      actions={
        <div className='flex items-center gap-2'>
          {hasActiveFilters && (
            <Button variant='outline' onClick={clearFilters}>
              <Filter className='size-4' />
              Reset Filters
            </Button>
          )}
          {selectedIds.length > 0 && (
            <Button
              variant='outline'
              onClick={() => setBatchSendOpen(true)}
              disabled={batchSendMutation.isPending}
            >
              {batchSendMutation.isPending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Send className='size-4' />
              )}
              Send Selected ({selectedIds.length})
            </Button>
          )}
          <div className='relative group'>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !selectedBuildingId}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className='size-4 animate-spin' />
                  Generating…
                </>
              ) : (
                <>
                  <Plus className='size-4' />
                  Generate Invoices
                </>
              )}
            </Button>
            {!selectedBuildingId && (
              <span className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md border'>
                Select a building first
              </span>
            )}
          </div>
        </div>
      }
    >
      {/* Contract Filter Banner */}
      {contractIdParam && (
        <div className='mb-4 flex items-center gap-3 rounded-lg border border-info/20 bg-info/5 p-3'>
          <FileText className='size-4 text-info shrink-0' />
          <p className='text-sm'>
            Showing invoices for a specific contract.{' '}
            <button
              type='button'
              className='text-primary underline cursor-pointer'
              onClick={clearFilters}
            >
              Show all invoices
            </button>
          </p>
        </div>
      )}

      {/* Filters */}
      <Card className='mb-6'>
        <CardContent className='pt-6'>
          <div className='grid gap-4 sm:grid-cols-4'>
            {/* Building */}
            <div className='space-y-2'>
              <Label htmlFor='inv-building'>Building</Label>
              {buildingsLoading ? (
                <Skeleton className='h-10' />
              ) : (
                <Select
                  id='inv-building'
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                >
                  <option value=''>All buildings</option>
                  {(buildingsData?.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              )}
            </div>

            {/* Year */}
            <div className='space-y-2'>
              <Label htmlFor='inv-year'>Year</Label>
              <Select
                id='inv-year'
                value={billingYear}
                onChange={(e) => setBillingYear(Number(e.target.value))}
              >
                {Array.from({ length: 7 }, (_, i) => defaultPeriod.year - 5 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>

            {/* Month */}
            <div className='space-y-2'>
              <Label htmlFor='inv-month'>Month</Label>
              <Select
                id='inv-month'
                value={billingMonth}
                onChange={(e) => setBillingMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleDateString('vi-VN', { month: 'long' })}
                  </option>
                ))}
              </Select>
            </div>

            {/* Status */}
            <div className='space-y-2'>
              <Label htmlFor='inv-status'>Status</Label>
              <Select
                id='inv-status'
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
              >
                {INVOICE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Info */}
      <div className='mb-4 text-sm text-muted-foreground'>
        Billing Period: <span className='font-medium'>{formatBillingPeriod(billingYear, billingMonth)}</span>
      </div>

      {/* Error State */}
      {error && (
        <Card className='mb-6 border-destructive/50'>
          <CardContent className='py-6 text-center'>
            <AlertTriangle className='size-8 text-destructive mx-auto mb-2' />
            <p className='font-medium text-destructive'>Failed to load invoices</p>
            <p className='text-sm text-muted-foreground'>{(error as Error).message}</p>
            <Button
              variant='outline'
              className='mt-4'
              onClick={() => queryClient.invalidateQueries({ queryKey: invoiceKeys.all })}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {invoicesLoading && (
        <Card>
          <CardContent className='py-8 space-y-3'>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className='h-14' />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!invoicesLoading && !error && invoices.length === 0 && (
        <EmptyState
          icon={<FileText className='size-6' />}
          title='No invoices found'
          description={
            hasActiveFilters
              ? 'No invoices match the current building, period, or status filters.'
              : `No invoices for ${formatBillingPeriod(billingYear, billingMonth)}. Click "Generate Invoices" to create them.`
          }
        >
          {!hasActiveFilters && (
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              <Plus className='size-4' />
              Generate Invoices
            </Button>
          )}
          {hasActiveFilters && (
            <Button variant='outline' onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </EmptyState>
      )}

      {/* Data Table */}
      {!invoicesLoading && !error && invoices.length > 0 && (
        <>
          <DataTable
            columns={columns}
            data={invoices}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/billing/invoices/${row.id}`)}
          />
          {pagination && pagination.totalPages > 1 && (
            <div className='mt-4'>
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
              />
            </div>
          )}
        </>
      )}
    </PageContainer>
    </PageTransition>
  )
}
