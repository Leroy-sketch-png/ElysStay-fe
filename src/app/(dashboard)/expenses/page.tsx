'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Receipt,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { toast } from '@/components/ui/toaster'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import { EXPENSE_CATEGORIES, DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  expenseKeys,
  fetchExpenses,
  fetchExpenseSummary,
  deleteExpense,
  type ExpenseFilters,
  type ExpenseSummaryFilters,
} from '@/lib/queries/expenses'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import type { ExpenseDto } from '@/types/api'
import { ExpenseFormDialog } from './expense-form-dialog'

// ─── Page ───────────────────────────────────────────────

export default function ExpensesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // ─── State ─────────────────────────────────────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseDto | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<ExpenseDto | null>(null)
  const hasInvalidDateRange = Boolean(fromDate && toDate && fromDate > toDate)
  const hasActiveFilters = Boolean(selectedBuildingId || categoryFilter || fromDate || toDate)

  // ─── Data: Buildings ───────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  const buildings = buildingsData?.data ?? []
  const canCreateExpense = buildings.length > 0

  // ─── Data: Expenses ────────────────────────────────────
  const filters: ExpenseFilters = {
    buildingId: selectedBuildingId || undefined,
    category: categoryFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page,
    pageSize,
    sort: 'expenseDate:desc',
  }

  const summaryFilters: ExpenseSummaryFilters = {
    buildingId: selectedBuildingId || undefined,
    category: categoryFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }

  const { data: expensesData, isLoading, error } = useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: () => fetchExpenses(filters),
    enabled: !hasInvalidDateRange,
  })

  const { data: expenseSummary } = useQuery({
    queryKey: expenseKeys.summary(summaryFilters),
    queryFn: () => fetchExpenseSummary(summaryFilters),
    enabled: !hasInvalidDateRange,
  })

  const expenses = expensesData?.data ?? []
  const pagination = expensesData?.pagination

  function clearFilters() {
    setSelectedBuildingId('')
    setCategoryFilter('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  // ─── Mutations ─────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      toast.success('Expense deleted')
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      setDeletingExpense(null)
    },
    onError: (error: Error) => {
      toast.error('Failed to delete expense', error.message)
    },
  })

  // ─── Columns ───────────────────────────────────────────
  const columns: Column<ExpenseDto>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => formatDate(row.expenseDate),
    },
    {
      key: 'building',
      header: 'Building',
      render: (row) => (
        <div>
          <span className='font-medium'>{row.buildingName}</span>
          {row.roomNumber && (
            <span className='text-xs text-muted-foreground ml-2'>
              Room {row.roomNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className='inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium'>
          {row.category}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className='text-sm text-muted-foreground line-clamp-1 max-w-[200px]'>
          {row.description}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className='font-semibold tabular-nums'>{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: 'recordedBy',
      header: 'Recorded By',
      render: (row) => row.recorderName ?? '—',
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
              setEditingExpense(row)
              setDialogOpen(true)
            }}
            aria-label='Edit expense'
          >
            <Pencil className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={(e) => {
              e.stopPropagation()
              setDeletingExpense(row)
            }}
            disabled={deleteMutation.isPending}
            aria-label='Delete expense'
          >
            <Trash2 className='size-4 text-destructive' />
          </Button>
        </div>
      ),
    },
  ]

  // ─── Render ────────────────────────────────────────────

  return (
    <PageTransition>
    <PageContainer
      title='Expenses'
      description='Track building operating costs and expenses.'
      actions={
        <div className='flex items-center gap-2'>
          {hasActiveFilters && (
            <Button variant='outline' onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
          {canCreateExpense && (
            <Button onClick={() => { setEditingExpense(null); setDialogOpen(true) }}>
              <Plus className='size-4' />
              Add Expense
            </Button>
          )}
        </div>
      }
    >
      {/* Filters */}
      <div className='flex flex-wrap items-end gap-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='exp-building'>Building</Label>
          <Select
            id='exp-building'
            value={selectedBuildingId}
            onChange={(e) => { setSelectedBuildingId(e.target.value); setPage(1) }}
          >
            <option value=''>All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='exp-category'>Category</Label>
          <Select
            id='exp-category'
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          >
            <option value=''>All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='exp-from'>From</Label>
          <Input
            id='exp-from'
            type='date'
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
            aria-invalid={hasInvalidDateRange}
          />
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='exp-to'>To</Label>
          <Input
            id='exp-to'
            type='date'
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1) }}
            aria-invalid={hasInvalidDateRange}
          />
        </div>
      </div>

      {hasInvalidDateRange && (
        <Card className='mt-4 border-warning/30 bg-warning/5'>
          <CardContent className='flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-warning'>
            <span>The date range is invalid. “From” must be on or before “To”.</span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setFromDate('')
                setToDate('')
                setPage(1)
              }}
            >
              Reset Dates
            </Button>
          </CardContent>
        </Card>
      )}

      {!hasInvalidDateRange && buildings.length === 0 && !isLoading && !error && (
        <EmptyState
          icon={<Receipt className='size-8' />}
          title='No buildings to assign expenses to'
          description='Expenses only make sense after at least one building exists. Create a building first, then record costs against it.'
          actionLabel='Go to Buildings'
          onAction={() => router.push('/buildings')}
        />
      )}

      {/* Summary Card */}
      {!hasInvalidDateRange && buildings.length > 0 && expenseSummary && expenseSummary.expenseCount > 0 && (
        <Card className='mt-4'>
          <CardContent className='flex items-center justify-between py-4'>
            <span className='text-sm text-muted-foreground'>
              Showing {expenses.length} expense(s)
              {pagination && ` of ${pagination.totalItems}`}
            </span>
            <span className='text-lg font-bold tabular-nums'>
              Filtered Total: {formatCurrency(expenseSummary.totalAmount)}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className='space-y-3 mt-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !hasInvalidDateRange && (
        <Card className='mt-4 border-destructive'>
          <CardContent className='py-4 text-center'>
            <p className='text-sm text-destructive'>Failed to load expenses. {(error as Error).message}</p>
            <Button
              variant='outline'
              className='mt-3'
              onClick={() => queryClient.invalidateQueries({ queryKey: expenseKeys.all })}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && !hasInvalidDateRange && buildings.length > 0 && expenses.length === 0 && (
        <EmptyState
          icon={<Receipt className='size-8' />}
          title='No expenses found'
          description={
            hasActiveFilters
              ? 'No expenses match your filters. Try adjusting them.'
              : 'Start tracking expenses by clicking "Add Expense" above.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      )}

      {/* Data Table */}
      {!isLoading && !error && !hasInvalidDateRange && expenses.length > 0 && (
        <>
          <DataTable
            columns={columns}
            data={expenses}
            rowKey={(row) => row.id}
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

      {/* Form Dialog */}
      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editingExpense}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingExpense}
        onOpenChange={(open) => { if (!open) setDeletingExpense(null) }}
        title='Delete Expense'
        description={
          deletingExpense
            ? `Delete this ${deletingExpense.category} expense (${formatCurrency(deletingExpense.amount)})? This cannot be undone.`
            : ''
        }
        confirmLabel='Delete'
        variant='destructive'
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingExpense) deleteMutation.mutate(deletingExpense.id)
        }}
      />
    </PageContainer>
    </PageTransition>
  )
}
