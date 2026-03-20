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
import { DEFAULT_TABLE_PAGE_SIZE } from '@/lib/domain-constants'
import type { UserDto } from '@/types/api'
import { CreateStaffDialog } from './create-staff-dialog'

export default function StaffPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
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
      toast.success('Trạng thái nhân viên đã cập nhật')
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      setStatusTarget(null)
    },
    onError: (error: Error) => {
      toast.error('Không thể thay đổi trạng thái', error.message)
      setStatusTarget(null)
    },
  })

  const columns: Column<UserDto>[] = [
    {
      key: 'fullName',
      header: 'Tên',
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
      header: 'SĐT',
      render: (row) => row.phone ?? '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <UserStatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tham gia',
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
                  Vô hiệu hóa
                </>
              ) : (
                <>
                  <UserCheck className='size-4 mr-1' />
                  Kích hoạt
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
      title='Quản lý nhân viên'
      description='Quản lý tài khoản nhân viên. Giao nhân viên cho tòa nhà từ trang chi tiết tòa nhà.'
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='size-4' />
          Thêm nhân viên
        </Button>
      }
    >
      {/* Error State */}
      {isError && (
        <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center mb-4'>
          <AlertTriangle className='mx-auto size-10 text-destructive mb-3' />
          <p className='font-medium text-destructive'>Không thể tải nhân viên</p>
          <p className='mt-1 text-sm text-muted-foreground'>{error?.message || 'Đã xảy ra lỗi không mong muốn.'}</p>
        </div>
      )}

      {!isError && (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            rowKey={(row) => row.id}
            emptyMessage='Chưa có nhân viên. Tạo nhân viên đầu tiên để bắt đầu.'
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
        title={targetIsActive ? 'Vô hiệu hóa nhân viên' : 'Kích hoạt nhân viên'}
        description={
          targetIsActive
            ? `Vô hiệu hóa "${statusTarget?.fullName}"? Họ sẽ mất quyền truy cập tất cả tòa nhà được giao.`
            : `Kích hoạt lại "${statusTarget?.fullName}"? Họ sẽ lấy lại quyền truy cập tòa nhà được giao.`
        }
        confirmLabel={targetIsActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
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
