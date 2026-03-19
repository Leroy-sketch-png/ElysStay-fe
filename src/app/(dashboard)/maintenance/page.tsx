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
      header: 'Issue',
      render: (row) => (
        <div className='max-w-[300px]'>
          <p className='font-medium truncate'>{row.title}</p>
          <p className='text-xs text-muted-foreground truncate'>{row.description}</p>
        </div>
      ),
    },
    {
      key: 'building',
      header: 'Location',
      render: (row) => (
        <div>
          <span className='text-sm'>{row.buildingName}</span>
          {row.roomNumber && (
            <span className='text-xs text-muted-foreground ml-2'>
              Room {row.roomNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'reporter',
      header: 'Reported By',
      render: (row) => row.reporterName ?? '—',
    },
    {
      key: 'assignee',
      header: 'Assigned To',
      render: (row) => row.assigneeName ?? <span className='text-muted-foreground'>Unassigned</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <IssueStatusBadge status={row.status} />,
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
        <Button
          variant='ghost'
          size='sm'
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/maintenance/${row.id}`)
          }}
          aria-label='View issue'
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
      <PageContainer title='Maintenance Issues' description='Track and manage building maintenance requests.'>
        <EmptyState
          icon={<Building2 className='size-12' />}
          title='No buildings yet'
          description='Add your first building to track maintenance issues.'
          actionLabel='Go to Buildings'
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
      title='Maintenance Issues'
      description='Track and manage building maintenance requests.'
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
              Clear filters
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className='size-4' />
            Report Issue
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <div className='flex flex-wrap items-end gap-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='iss-building'>Building</Label>
          <Select
            id='iss-building'
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
          <Label htmlFor='iss-status'>Status</Label>
          <Select
            id='iss-status'
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as IssueStatus | ''); setPage(1) }}
          >
            <option value=''>All Statuses</option>
            <option value='New'>New</option>
            <option value='InProgress'>In Progress</option>
            <option value='Resolved'>Resolved</option>
            <option value='Closed'>Closed</option>
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='iss-priority'>Priority</Label>
          <Select
            id='iss-priority'
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value as PriorityLevel | ''); setPage(1) }}
          >
            <option value=''>All Priorities</option>
            <option value='Low'>Low</option>
            <option value='Medium'>Medium</option>
            <option value='High'>High</option>
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
          title='Unable to load maintenance issues'
          description={(error as Error).message}
          actionLabel='Retry'
          onAction={() => queryClient.invalidateQueries({ queryKey: issueKeys.all })}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && issues.length === 0 && (
        <EmptyState
          icon={<Wrench className='size-8' />}
          title='No maintenance issues'
          description={
            statusFilter || priorityFilter || selectedBuildingId
              ? 'No issues match your filters.'
              : 'No maintenance issues have been reported yet.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={hasActiveFilters ? () => {
            setSelectedBuildingId('')
            setStatusFilter('')
            setPriorityFilter('')
            setPage(1)
          } : undefined}
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
