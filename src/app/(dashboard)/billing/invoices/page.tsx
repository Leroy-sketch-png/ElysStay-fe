'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, Send, AlertTriangle, Eye, Loader2, Filter,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InvoiceStatusBadge } from '@/components/ui/status-badge'
import { Pagination } from '@/components/ui/pagination'
import { toast } from '@/components/ui/toaster'
import { formatCurrency, formatDate } from '@/lib/utils'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import {
  invoiceKeys,
  fetchInvoices,
  generateInvoices,
  sendInvoice,
  batchSendInvoices,
  voidInvoice,
} from '@/lib/queries/invoices'
import type { InvoiceDto, InvoiceStatus } from '@/types/api'

// ─── Helpers ────────────────────────────────────────────

function getCurrentBillingPeriod() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

function formatBillingPeriod(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })
}

const statusOptions: { label: string; value: InvoiceStatus | '' }[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Sent', value: 'Sent' },
  { label: 'Partially Paid', value: 'PartiallyPaid' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Overdue', value: 'Overdue' },
  { label: 'Void', value: 'Void' },
]

// ─── Page ───────────────────────────────────────────────

export default function InvoicesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const defaultPeriod = getCurrentBillingPeriod()

  // ─── State ─────────────────────────────────────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [billingYear, setBillingYear] = useState(defaultPeriod.year)
  const [billingMonth, setBillingMonth] = useState(defaultPeriod.month)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // ─── Data: Buildings ───────────────────────────────────
  const { data: buildingsData, isLoading: buildingsLoading } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: 100 }),
  })

  // Auto-select first building
  useEffect(() => {
    if (!selectedBuildingId && buildingsData?.data && buildingsData.data.length > 0) {
      setSelectedBuildingId(buildingsData.data[0].id)
    }
  }, [buildingsData, selectedBuildingId])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [selectedBuildingId, billingYear, billingMonth, statusFilter])

  // ─── Data: Invoices ────────────────────────────────────
  const { data: invoicesData, isLoading: invoicesLoading, error } = useQuery({
    queryKey: invoiceKeys.list({
      buildingId: selectedBuildingId,
      billingYear,
      billingMonth,
      status: statusFilter || undefined,
      page,
      pageSize,
    }),
    queryFn: () =>
      fetchInvoices({
        buildingId: selectedBuildingId,
        billingYear,
        billingMonth,
        status: statusFilter || undefined,
        page,
        pageSize,
      }),
    enabled: !!selectedBuildingId,
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
          row.status === 'Draft' ? (
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
          <span className={row.paidAmount < row.totalAmount ? 'text-muted-foreground' : 'text-green-600'}>
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
            {row.status === 'Draft' && (
              <Button
                variant='ghost'
                size='sm'
                onClick={(e) => {
                  e.stopPropagation()
                  sendMutation.mutate(row.id)
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

  // ─── Render ────────────────────────────────────────────

  return (
    <PageContainer
      title='Invoices'
      description='Generate and manage monthly invoices.'
      actions={
        <div className='flex items-center gap-2'>
          {selectedIds.length > 0 && (
            <Button
              variant='outline'
              onClick={() => batchSendMutation.mutate()}
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
        </div>
      }
    >
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
                {[defaultPeriod.year - 1, defaultPeriod.year, defaultPeriod.year + 1].map((y) => (
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
                    {new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}
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
                {statusOptions.map((opt) => (
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
            statusFilter
              ? 'No invoices match your filters.'
              : `No invoices for ${formatBillingPeriod(billingYear, billingMonth)}. Click "Generate Invoices" to create them.`
          }
          action={
            !statusFilter && (
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                <Plus className='size-4' />
                Generate Invoices
              </Button>
            )
          }
        />
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
              />
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
