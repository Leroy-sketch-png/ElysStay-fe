'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, Search, AlertTriangle } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { UserStatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import {
  tenantKeys,
  fetchTenants,
  changeTenantStatus,
  type TenantFilters,
} from '@/lib/queries/tenants'
import { DEFAULT_TABLE_PAGE_SIZE } from '@/lib/domain-constants'
import type { UserDto, ChangeUserStatusRequest } from '@/types/api'
import { CreateTenantDialog } from './create-tenant-dialog'

export default function TenantsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // ─── State ──────────────────────────────────────────────
  const [filters, setFilters] = useState<TenantFilters>({ page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE })
  const [searchValue, setSearchValue] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<UserDto | null>(null)

  // ─── Data ───────────────────────────────────────────────
  const { data, isLoading, error, isError } = useQuery({
    queryKey: tenantKeys.list(filters),
    queryFn: () => fetchTenants(filters),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChangeUserStatusRequest }) =>
      changeTenantStatus(id, data),
    onSuccess: () => {
      const action = statusTarget?.status === 'Active' ? 'vô hiệu hóa' : 'kích hoạt'
      toast.success(`Khách thuê đã được ${action}`)
      queryClient.invalidateQueries({ queryKey: tenantKeys.all })
      setStatusTarget(null)
    },
    onError: (error: Error) => toast.error('Không thể cập nhật trạng thái', error.message),
  })

  // ─── Search Handler ─────────────────────────────────────
  const handleSearch = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchValue || undefined,
      page: 1,
    }))
  }, [searchValue])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch()
    },
    [handleSearch],
  )

  const handleClearSearch = useCallback(() => {
    setSearchValue('')
    setFilters({ page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE })
  }, [])

  // ─── Columns ────────────────────────────────────────────
  const columns: Column<UserDto>[] = [
    {
      key: 'name',
      header: 'Khách thuê',
      render: (row) => (
        <div>
          <p className='font-medium'>{row.fullName}</p>
          <p className='text-xs text-muted-foreground'>{row.email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'SĐT',
      render: (row) => row.phone || <span className='text-muted-foreground'>—</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <UserStatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
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
              router.push(`/tenants/${row.id}`)
            }}
          >
            Xem
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className={row.status === 'Active' ? 'text-destructive hover:text-destructive' : 'text-success hover:text-success'}
            onClick={(e) => {
              e.stopPropagation()
              setStatusTarget(row)
            }}
          >
            {row.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
          </Button>
        </div>
      ),
      headerClassName: 'w-[160px]',
    },
  ]

  const hasActiveSearch = !!filters.search

  // ─── Render ─────────────────────────────────────────────
  return (
    <PageTransition>
    <PageContainer
      title='Khách thuê'
      description='Quản lý tài khoản và hồ sơ khách thuê.'
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='size-4' />
          Thêm khách thuê
        </Button>
      }
    >
      {/* Search Bar */}
      <div className='mb-6 flex flex-wrap items-center gap-3'>
        <div className='relative flex-1 min-w-[200px] max-w-md'>
          <Search className='absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Tìm theo tên hoặc email…'
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className='pl-9'
            aria-label='Tìm khách thuê theo tên hoặc email'
          />
        </div>
        <Button variant='secondary' onClick={handleSearch}>
          Tìm kiếm
        </Button>
        {hasActiveSearch && (
          <Button variant='ghost' onClick={handleClearSearch}>
            Xóa
          </Button>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center'>
          <AlertTriangle className='mx-auto size-10 text-destructive mb-3' />
          <p className='font-medium text-destructive'>Không thể tải khách thuê</p>
          <p className='mt-1 text-sm text-muted-foreground'>{error?.message || 'Đã xảy ra lỗi không mong muốn.'}</p>
          <Button variant='outline' className='mt-4' onClick={() => queryClient.invalidateQueries({ queryKey: tenantKeys.list(filters) })}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Empty State (no tenants at all, no active search) */}
      {!isError && !isLoading && data && data.data.length === 0 && !hasActiveSearch ? (
        <EmptyState
          icon={<Users className='size-12' />}
          title='Chưa có khách thuê'
          description='Thêm khách thuê đầu tiên để quản lý hợp đồng và thanh toán.'
          actionLabel='Thêm khách thuê'
          onAction={() => setCreateOpen(true)}
        />
      ) : !isError ? (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/tenants/${row.id}`)}
            emptyMessage='Không tìm thấy khách thuê phù hợp.'
            emptyIcon={<Users className='size-10' />}
          />
          {data?.pagination && data.pagination.totalPages > 1 && (
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
      <CreateTenantDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {/* Status Confirmation */}
      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.status === 'Active' ? 'Vô hiệu hóa khách thuê' : 'Kích hoạt khách thuê'}
        description={
          statusTarget?.status === 'Active'
            ? `Bạn có chắc muốn vô hiệu hóa "${statusTarget?.fullName}"? Họ sẽ không thể đăng nhập.`
            : `Kích hoạt lại "${statusTarget?.fullName}"? Họ sẽ có thể đăng nhập lại.`
        }
        confirmLabel={statusTarget?.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
        variant={statusTarget?.status === 'Active' ? 'destructive' : 'default'}
        loading={statusMutation.isPending}
        onConfirm={() =>
          statusTarget &&
          statusMutation.mutate({
            id: statusTarget.id,
            data: { status: statusTarget.status === 'Active' ? 'Deactivated' : 'Active' },
          })
        }
      />
    </PageContainer>
    </PageTransition>
  )
}
