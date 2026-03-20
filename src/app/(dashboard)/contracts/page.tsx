'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, AlertTriangle, Building2 } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { ContractStatusBadge, DepositStatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/EmptyState'
import { toast } from '@/components/ui/toaster'
import { formatCurrency, formatDate, toLocalDateInputValue } from '@/lib/utils'
import {
  contractKeys,
  fetchContracts,
  type ContractFilters,
} from '@/lib/queries/contracts'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import { DROPDOWN_PAGE_SIZE, DEFAULT_TABLE_PAGE_SIZE } from '@/lib/domain-constants'
import type { ContractDto } from '@/types/api'
import { ContractFormDialog } from './contract-form-dialog'

export default function ContractsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // ─── State ──────────────────────────────────────────────
  const [filters, setFilters] = useState<ContractFilters>({ page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE })
  const [buildingFilter, setBuildingFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  // Sync select values into filter state
  const activeFilters: ContractFilters = {
    ...filters,
    buildingId: buildingFilter || undefined,
    status: statusFilter || undefined,
  }

  // ─── Data ───────────────────────────────────────────────
  const { data, isLoading, error, isError } = useQuery({
    queryKey: contractKeys.list(activeFilters),
    queryFn: () => fetchContracts(activeFilters),
  })

  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  // ─── Helpers ────────────────────────────────────────────
  const isExpiringSoon = (endDate: string) => {
    const [year, month, day] = endDate.split('-').map(Number)
    const end = new Date(year, month - 1, day)
    const today = new Date(toLocalDateInputValue())
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysLeft >= 0 && daysLeft <= 30
  }

  // ─── Columns ────────────────────────────────────────────
  const columns: Column<ContractDto>[] = [
    {
      key: 'room',
      header: 'Phòng',
      render: (row) => (
        <div>
          <p className='font-medium'>{row.roomNumber}</p>
          <p className='text-xs text-muted-foreground'>{row.buildingName}</p>
        </div>
      ),
    },
    {
      key: 'tenant',
      header: 'Khách thuê',
      render: (row) => <span className='text-sm'>{row.tenantName}</span>,
    },
    {
      key: 'period',
      header: 'Thời hạn',
      render: (row) => (
        <div>
          <span className='text-sm'>
            {formatDate(row.startDate)} — {formatDate(row.endDate)}
          </span>
          {row.status === 'Active' && isExpiringSoon(row.endDate) && (
            <p className='text-xs text-warning font-medium'>Sắp hết hạn</p>
          )}
        </div>
      ),
    },
    {
      key: 'rent',
      header: 'Giá thuê/tháng',
      render: (row) => formatCurrency(row.monthlyRent),
    },
    {
      key: 'deposit',
      header: 'Tiền cọc',
      render: (row) => (
        <div>
          <p className='text-sm'>{formatCurrency(row.depositAmount)}</p>
          <div className='mt-0.5'><DepositStatusBadge status={row.depositStatus} /></div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <ContractStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button
          variant='ghost'
          size='sm'
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/contracts/${row.id}`)
          }}
        >
          Xem
        </Button>
      ),
      headerClassName: 'w-[80px]',
    },
  ]

  const hasActiveFilters = !!buildingFilter || !!statusFilter

  // ─── No Buildings Prerequisite ─────────────────────────
  if (buildingsData && (buildingsData.data ?? []).length === 0) {
    return (
      <PageTransition>
      <PageContainer title='Hợp đồng' description='Quản lý hợp đồng thuê và thỏa thuận.'>
        <EmptyState
          icon={<Building2 className='size-12' />}
          title='Chưa có tòa nhà'
          description='Thêm tòa nhà đầu tiên để bắt đầu quản lý hợp đồng.'
          actionLabel='Đến trang Tòa nhà'
          actionHref='/buildings'
        />
      </PageContainer>
      </PageTransition>
    )
  }

  // ─── Render ─────────────────────────────────────────────
  return (
    <PageTransition>
    <PageContainer
      title='Hợp đồng'
      description='Quản lý hợp đồng thuê và thỏa thuận.'
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='size-4' />
          Hợp đồng mới
        </Button>
      }
    >
      {/* Filters */}
      <div className='mb-6 flex flex-wrap items-center gap-3'>
        <Select
          value={buildingFilter}
          onChange={(e) => {
            setBuildingFilter(e.target.value)
            setFilters((prev) => ({ ...prev, page: 1 }))
          }}
          className='w-52'
        >
          <option value=''>Tất cả tòa nhà</option>
          {(buildingsData?.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setFilters((prev) => ({ ...prev, page: 1 }))
          }}
          className='w-40'
        >
          <option value=''>Tất cả trạng thái</option>
          <option value='Active'>Hiệu lực</option>
          <option value='Terminated'>Chấm dứt</option>
        </Select>

        {hasActiveFilters && (
          <Button
            variant='ghost'
            onClick={() => {
              setBuildingFilter('')
              setStatusFilter('')
              setFilters({ page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE })
            }}
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center'>
          <AlertTriangle className='mx-auto size-10 text-destructive mb-3' />
          <p className='font-medium text-destructive'>Không thể tải hợp đồng</p>
          <p className='mt-1 text-sm text-muted-foreground'>{error?.message || 'Đã xảy ra lỗi không mong muốn.'}</p>
          <Button variant='outline' className='mt-4' onClick={() => queryClient.invalidateQueries({ queryKey: contractKeys.list(activeFilters) })}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isError && !isLoading && data && data.data.length === 0 && !hasActiveFilters ? (
        <EmptyState
          icon={<FileText className='size-12' />}
          title='Chưa có hợp đồng'
          description='Tạo hợp đồng đầu tiên để quản lý khách thuê và thanh toán.'
          actionLabel='Hợp đồng mới'
          onAction={() => setCreateOpen(true)}
        />
      ) : !isError ? (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/contracts/${row.id}`)}
            emptyMessage='Không có hợp đồng phù hợp với bộ lọc.'
            emptyIcon={<FileText className='size-10' />}
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

      {/* Create Contract Dialog */}
      <ContractFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </PageContainer>
    </PageTransition>
  )
}
