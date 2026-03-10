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
      toast.success('Staff unassigned from building')
      queryClient.invalidateQueries({ queryKey: staffKeys.byBuilding(buildingId) })
      setRemoveTarget(null)
    },
    onError: (error: Error) => {
      toast.error('Failed to unassign staff', error.message)
    },
  })

  const columns: Column<StaffAssignmentDto>[] = [
    {
      key: 'staffFullName',
      header: 'Name',
      render: (row) => (
        <div>
          <p className='font-medium'>{row.staffFullName}</p>
          <p className='text-xs text-muted-foreground'>{row.staffEmail}</p>
        </div>
      ),
    },
    {
      key: 'staffPhone',
      header: 'Phone',
      render: (row) => row.staffPhone ?? '—',
    },
    {
      key: 'assignedAt',
      header: 'Assigned',
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
            Unassign
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
          Staff members assigned to manage this building.
        </p>
        <Button onClick={() => setAssignOpen(true)}>
          <Plus className='size-4' />
          Assign Staff
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={staff ?? []}
        loading={isLoading}
        rowKey={(row) => row.staffId}
        emptyMessage='No staff assigned to this building.'
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
        title='Unassign Staff'
        description={`Remove "${removeTarget?.staffFullName}" from this building? They will no longer have access to manage it.`}
        confirmLabel='Unassign'
        variant='destructive'
        loading={unassignMutation.isPending}
        onConfirm={() => removeTarget && unassignMutation.mutate(removeTarget.staffId)}
      />
    </div>
  )
}
