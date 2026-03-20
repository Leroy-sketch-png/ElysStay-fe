'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Wrench, Eye, X, Building2 } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { IssueStatusBadge, PriorityBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import {
  issueKeys,
  fetchIssues,
  type IssueFilters,
} from '@/lib/queries/issues'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import { DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import type { MaintenanceIssueDto, IssueStatus, PriorityLevel } from '@/types/api'
import { CreateIssueDialog } from './create-issue-dialog'

// ─── Page ───────────────────────────────────────────────

export default function MaintenanceIssuesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // ─── State ─────────────────────────────────────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | ''>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [createOpen, setCreateOpen] = useState(false)
  const hasActiveFilters = Boolean(selectedBuildingId || statusFilter || priorityFilter)

  // ─── Data: Buildings ───────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  const buildings = buildingsData?.data ?? []

  // ─── Data: Issues ──────────────────────────────────────
  const filters: IssueFilters = {
    buildingId: selectedBuildingId || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    page,
    pageSize,
    sort: 'createdAt:desc',
  }

  const { data: issuesData, isLoading, error } = useQuery({
    queryKey: issueKeys.list(filters),
    queryFn: () => fetchIssues(filters),
  })

  const issues = issuesData?.data ?? []
  const pagination = issuesData?.pagination

  // ─── Columns ───────────────────────────────────────────
  const columns: Column<MaintenanceIssueDto>[] = [
    {
      key: 'title',
      header: 'Vấn đề',
      render: (row) => (
        <div className='max-w-[300px]'>
          <p className='font-medium truncate'>{row.title}</p>
          <p className='text-xs text-muted-foreground truncate'>{row.description}</p>
        </div>
      ),
    },
    {
      key: 'building',
      header: 'Vị trí',
      render: (row) => (
        <div>
          <span className='text-sm'>{row.buildingName}</span>
          {row.roomNumber && (
            <span className='text-xs text-muted-foreground ml-2'>
              Phòng {row.roomNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'reporter',
      header: 'Người báo',
      render: (row) => row.reporterName ?? '—',
    },
    {
      key: 'assignee',
      header: 'Được giao',
      render: (row) => row.assigneeName ?? <span className='text-muted-foreground'>Chưa giao</span>,
    },
    {
      key: 'priority',
      header: 'Độ ưu tiên',
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <IssueStatusBadge status={row.status} />,
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
        <Button
          variant='ghost'
          size='sm'
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/maintenance/${row.id}`)
          }}
          aria-label='Xem vấn đề'
        >
          <Eye className='size-4' />
        </Button>
      ),
    },
  ]

  // ─── No Buildings Prerequisite ─────────────────────────
  if (buildingsData && buildings.length === 0) {
    return (
      <PageTransition>
      <PageContainer title='Bảo trì' description='Theo dõi và quản lý yêu cầu bảo trì.'>
        <EmptyState
          icon={<Building2 className='size-12' />}
          title='Chưa có tòa nhà'
          description='Thêm tòa nhà đầu tiên để theo dõi vấn đề bảo trì.'
          actionLabel='Đến trang Tòa nhà'
          actionHref='/buildings'
        />
      </PageContainer>
      </PageTransition>
    )
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <PageTransition>
    <PageContainer
      title='Bảo trì'
      description='Theo dõi và quản lý yêu cầu bảo trì.'
      actions={
        <div className='flex items-center gap-2'>
          {hasActiveFilters && (
            <Button
              variant='outline'
              onClick={() => {
                setSelectedBuildingId('')
                setStatusFilter('')
                setPriorityFilter('')
                setPage(1)
              }}
            >
              <X className='size-4' />
              Xóa bộ lọc
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className='size-4' />
            Báo vấn đề
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <div className='flex flex-wrap items-end gap-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='iss-building'>Tòa nhà</Label>
          <Select
            id='iss-building'
            value={selectedBuildingId}
            onChange={(e) => { setSelectedBuildingId(e.target.value); setPage(1) }}
          >
            <option value=''>Tất cả tòa nhà</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='iss-status'>Trạng thái</Label>
          <Select
            id='iss-status'
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as IssueStatus | ''); setPage(1) }}
          >
            <option value=''>Tất cả trạng thái</option>
            <option value='New'>Mới</option>
            <option value='InProgress'>Đang xử lý</option>
            <option value='Resolved'>Đã giải quyết</option>
            <option value='Closed'>Đã đóng</option>
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='iss-priority'>Độ ưu tiên</Label>
          <Select
            id='iss-priority'
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value as PriorityLevel | ''); setPage(1) }}
          >
            <option value=''>Tất cả mức ưu tiên</option>
            <option value='Low'>Thấp</option>
            <option value='Medium'>Trung bình</option>
            <option value='High'>Cao</option>
          </Select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className='space-y-3 mt-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-14 w-full' />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <EmptyState
          icon={<Wrench className='size-8' />}
          title='Không thể tải vấn đề bảo trì'
          description={(error as Error).message}
          actionLabel='Thử lại'
          onAction={() => queryClient.invalidateQueries({ queryKey: issueKeys.all })}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && issues.length === 0 && (
        <EmptyState
          icon={<Wrench className='size-8' />}
          title='Không có vấn đề bảo trì'
          description={
            statusFilter || priorityFilter || selectedBuildingId
              ? 'Không có vấn đề phù hợp với bộ lọc.'
              : 'Chưa có vấn đề bảo trì nào được báo cáo.'
          }
          actionLabel={hasActiveFilters ? 'Xóa bộ lọc' : 'Báo vấn đề'}
          onAction={hasActiveFilters ? () => {
            setSelectedBuildingId('')
            setStatusFilter('')
            setPriorityFilter('')
            setPage(1)
          } : () => setCreateOpen(true)}
        />
      )}

      {/* Data Table */}
      {!isLoading && !error && issues.length > 0 && (
        <>
          <DataTable
            columns={columns}
            data={issues}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/maintenance/${row.id}`)}
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

      {/* Create Dialog */}
      <CreateIssueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </PageContainer>
    </PageTransition>
  )
}
