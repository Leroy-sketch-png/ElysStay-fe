'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, Search, MapPin, AlertTriangle } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/EmptyState'
import { PageTransition } from '@/components/Motion'
import { toast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import {
  buildingKeys,
  fetchBuildings,
  deleteBuilding,
  type BuildingFilters,
} from '@/lib/queries/buildings'
import type { BuildingDto } from '@/types/api'
import { BuildingFormDialog } from './building-form-dialog'
import { ConfirmDialog } from '@/components/ui/dialog'

export default function BuildingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // ─── State ──────────────────────────────────────────────
  const [filters, setFilters] = useState<BuildingFilters>({ page: 1, pageSize: 20 })
  const [searchName, setSearchName] = useState('')
  const [searchAddress, setSearchAddress] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BuildingDto | null>(null)

  // ─── Data ───────────────────────────────────────────────
  const { data, isLoading, error, isError } = useQuery({
    queryKey: buildingKeys.list(filters),
    queryFn: () => fetchBuildings(filters),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBuilding(id),
    onSuccess: () => {
      toast.success('Building deleted successfully')
      queryClient.invalidateQueries({ queryKey: buildingKeys.all })
      setDeleteTarget(null)
    },
    onError: (error: Error & { status?: number }) => {
      if ((error as { status?: number }).status === 409) {
        toast.error('Cannot delete building', 'Building has active contracts.')
      } else {
        toast.error('Failed to delete building', error.message)
      }
    },
  })

  // ─── Search Handler ─────────────────────────────────────
  const handleSearch = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      name: searchName || undefined,
      address: searchAddress || undefined,
      page: 1,
    }))
  }, [searchName, searchAddress])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch()
    },
    [handleSearch],
  )

  const handleClearFilters = useCallback(() => {
    setSearchName('')
    setSearchAddress('')
    setFilters({ page: 1, pageSize: 20 })
  }, [])

  // ─── Columns ────────────────────────────────────────────
  const columns: Column<BuildingDto>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <p className='font-medium'>{row.name}</p>
          <p className='text-xs text-muted-foreground'>{row.address}</p>
        </div>
      ),
    },
    {
      key: 'totalFloors',
      header: 'Floors',
      render: (row) => row.totalFloors,
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'invoiceDueDay',
      header: 'Due Day',
      render: (row) => `Day ${row.invoiceDueDay}`,
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className='flex items-center justify-end gap-1'>
          <Button
            variant='ghost'
            size='sm'
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/buildings/${row.id}`)
            }}
          >
            View
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='text-destructive hover:text-destructive'
            onClick={(e) => {
              e.stopPropagation()
              setDeleteTarget(row)
            }}
          >
            Delete
          </Button>
        </div>
      ),
      headerClassName: 'w-[120px]',
    },
  ]

  const hasActiveFilters = !!filters.name || !!filters.address

  // ─── Render ─────────────────────────────────────────────
  return (
    <PageTransition>
    <PageContainer
      title='Buildings'
      description='Manage your rental properties'
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='size-4' />
          Add Building
        </Button>
      }
    >
      {/* Filter Bar */}
      <div className='mb-6 flex flex-wrap items-center gap-3'>
        <div className='relative flex-1 min-w-[200px] max-w-xs'>
          <Search className='absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search by name…'
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={handleKeyDown}
            className='pl-9'
          />
        </div>
        <div className='relative flex-1 min-w-[200px] max-w-xs'>
          <MapPin className='absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search by address…'
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            className='pl-9'
          />
        </div>
        <Button variant='secondary' onClick={handleSearch}>
          Search
        </Button>
        {hasActiveFilters && (
          <Button variant='ghost' onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center'>
          <AlertTriangle className='mx-auto size-10 text-destructive mb-3' />
          <p className='font-medium text-destructive'>Failed to load buildings</p>
          <p className='mt-1 text-sm text-muted-foreground'>{error?.message || 'An unexpected error occurred.'}</p>
          <Button variant='outline' className='mt-4' onClick={() => queryClient.invalidateQueries({ queryKey: buildingKeys.list(filters) })}>
            Try Again
          </Button>
        </div>
      )}

      {/* Table or Empty State */}
      {!isError && !isLoading && data && data.data.length === 0 && !hasActiveFilters ? (
        <EmptyState
          icon={<Building2 className='size-12' />}
          title='No buildings yet'
          description='Create your first building to start managing your rental properties.'
          actionLabel='Add Building'
          onAction={() => setCreateOpen(true)}
        />
      ) : !isError ? (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/buildings/${row.id}`)}
            emptyMessage='No buildings match your search.'
            emptyIcon={<Building2 className='size-10' />}
          />
          {data?.pagination && (
            <Pagination
              className='mt-4'
              page={data.pagination.page}
              pageSize={data.pagination.pageSize}
              totalItems={data.pagination.totalItems}
              totalPages={data.pagination.totalPages}
              onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
              onPageSizeChange={(ps) => setFilters((prev) => ({ ...prev, pageSize: ps, page: 1 }))}
            />
          )}
        </>
      ) : null}

      {/* Create Dialog */}
      <BuildingFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode='create'
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='Delete Building'
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel='Delete'
        variant='destructive'
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </PageContainer>
    </PageTransition>
  )
}
