'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import {
  staffKeys,
  fetchBuildingStaff,
  unassignStaff,
} from '@/lib/queries/staff'
import type { StaffAssignmentDto } from '@/types/api'
import { AssignStaffDialog } from './assign-staff-dialog'

interface BuildingStaffTabProps {
  buildingId: string
}

export function BuildingStaffTab({ buildingId }: BuildingStaffTabProps) {
  const queryClient = useQueryClient()
  const [assignOpen, setAssignOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<StaffAssignmentDto | null>(null)

  const { data: staff, isLoading } = useQuery({
    queryKey: staffKeys.byBuilding(buildingId),
    queryFn: () => fetchBuildingStaff(buildingId),
  })

  const unassignMutation = useMutation({
    mutationFn: (staffId: string) => unassignStaff(buildingId, staffId),
    onSuccess: () => {
      toast.success('Đã gỡ nhân viên khỏi tòa nhà')
      queryClient.invalidateQueries({ queryKey: staffKeys.byBuilding(buildingId) })
      setRemoveTarget(null)
    },
    onError: (error: Error) => {
      toast.error('Gỡ nhân viên thất bại', error.message)
    },
  })

  const columns: Column<StaffAssignmentDto>[] = [
    {
      key: 'fullName',
      header: 'Tên',
      render: (row) => (
        <div>
          <p className='font-medium'>{row.fullName}</p>
          <p className='text-xs text-muted-foreground'>{row.email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Điện thoại',
      render: (row) => row.phone ?? '—',
    },
    {
      key: 'assignedAt',
      header: 'Ngày giao',
      render: (row) => formatDate(row.assignedAt),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className='flex justify-end'>
          <Button
            variant='ghost'
            size='sm'
            className='text-destructive hover:text-destructive'
            onClick={(e) => {
              e.stopPropagation()
              setRemoveTarget(row)
            }}
          >
            <UserMinus className='size-4 mr-1' />
            Gỡ
          </Button>
        </div>
      ),
      headerClassName: 'w-[120px]',
    },
  ]

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>
          Nhân viên được phân công quản lý tòa nhà.
        </p>
        <Button onClick={() => setAssignOpen(true)}>
          <Plus className='size-4' />
          Phân công
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={staff ?? []}
        loading={isLoading}
        rowKey={(row) => row.staffId}
        emptyMessage='Tòa nhà chưa có nhân viên nào.'
        emptyIcon={<Users className='size-10' />}
      />

      {/* Assign Dialog */}
      <AssignStaffDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        buildingId={buildingId}
        assignedStaffIds={(staff ?? []).map((s) => s.staffId)}
      />

      {/* Unassign Confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title='Gỡ nhân viên'
        description={`Gỡ "${removeTarget?.fullName}" khỏi tòa nhà? Họ sẽ không còn quyền quản lý tòa nhà này.`}
        confirmLabel='Gỡ'
        variant='destructive'
        loading={unassignMutation.isPending}
        onConfirm={() => removeTarget && unassignMutation.mutate(removeTarget.staffId)}
      />
    </div>
  )
}
