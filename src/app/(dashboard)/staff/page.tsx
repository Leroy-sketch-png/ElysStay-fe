'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, UserCheck, UserX, AlertTriangle } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Pagination } from '@/components/ui/pagination'
import { UserStatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import { staffKeys, fetchStaffList, changeUserStatus } from '@/lib/queries/staff'
import type { UserDto } from '@/types/api'
import { CreateStaffDialog } from './create-staff-dialog'

export default function StaffPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [createOpen, setCreateOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<UserDto | null>(null)

  const filters = { page, pageSize }

  const { data, isLoading, error, isError } = useQuery({
    queryKey: staffKeys.list(filters),
    queryFn: () => fetchStaffList(filters),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Deactivated' }) =>
      changeUserStatus(id, { status }),
    onSuccess: () => {
      toast.success('Staff status updated')
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      setStatusTarget(null)
    },
    onError: (error: Error) => {
      toast.error('Failed to change status', error.message)
      setStatusTarget(null)
    },
  })

  const columns: Column<UserDto>[] = [
    {
      key: 'fullName',
      header: 'Name',
      render: (row) => (
        <div className='flex items-center gap-3'>
          <div className='flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium'>
            {row.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className='font-medium'>{row.fullName}</p>
            <p className='text-xs text-muted-foreground'>{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => row.phone ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <UserStatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => {
        const isActive = row.status === 'Active'
        return (
          <div className='flex justify-end'>
            <Button
              variant='ghost'
              size='sm'
              className={isActive ? 'text-destructive hover:text-destructive' : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'}
              onClick={(e) => {
                e.stopPropagation()
                setStatusTarget(row)
              }}
            >
              {isActive ? (
                <>
                  <UserX className='size-4 mr-1' />
                  Deactivate
                </>
              ) : (
                <>
                  <UserCheck className='size-4 mr-1' />
                  Activate
                </>
              )}
            </Button>
          </div>
        )
      },
      headerClassName: 'w-[140px]',
    },
  ]

  const targetIsActive = statusTarget?.status === 'Active'
  const newStatus = targetIsActive ? 'Deactivated' : 'Active'

  return (
    <PageTransition>
    <PageContainer
      title='Staff Management'
      description='Manage staff accounts. Assign staff to buildings from the building detail page.'
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='size-4' />
          Add Staff
        </Button>
      }
    >
      {/* Error State */}
      {isError && (
        <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center mb-4'>
          <AlertTriangle className='mx-auto size-10 text-destructive mb-3' />
          <p className='font-medium text-destructive'>Failed to load staff</p>
          <p className='mt-1 text-sm text-muted-foreground'>{error?.message || 'An unexpected error occurred.'}</p>
        </div>
      )}

      {!isError && (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            rowKey={(row) => row.id}
            emptyMessage='No staff members yet. Create one to get started.'
            emptyIcon={<Users className='size-10' />}
          />

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className='mt-4'>
              <Pagination
                page={data.pagination.page}
                pageSize={data.pagination.pageSize}
                totalItems={data.pagination.totalItems}
                totalPages={data.pagination.totalPages}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
              />
            </div>
          )}
        </>
      )}

      {/* Create Staff Dialog */}
      <CreateStaffDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {/* Status Change Confirmation */}
      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={targetIsActive ? 'Deactivate Staff' : 'Activate Staff'}
        description={
          targetIsActive
            ? `Deactivate "${statusTarget?.fullName}"? They will lose access to all assigned buildings.`
            : `Reactivate "${statusTarget?.fullName}"? They will regain access to their assigned buildings.`
        }
        confirmLabel={targetIsActive ? 'Deactivate' : 'Activate'}
        variant={targetIsActive ? 'destructive' : 'default'}
        loading={statusMutation.isPending}
        onConfirm={() =>
          statusTarget &&
          statusMutation.mutate({ id: statusTarget.id, status: newStatus as 'Active' | 'Deactivated' })
        }
      />
    </PageContainer>
    </PageTransition>
  )
}
