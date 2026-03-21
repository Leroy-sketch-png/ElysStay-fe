'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { ActiveBadge, MeteredBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { formatCurrency } from '@/lib/utils'
import {
  serviceKeys,
  fetchBuildingServices,
  deactivateService,
} from '@/lib/queries/services'
import { roomServiceKeys } from '@/lib/queries/room-services'
import type { ServiceDto } from '@/types/api'
import { ServiceFormDialog } from './service-form-dialog'

interface BuildingServicesTabProps {
  buildingId: string
}

export function BuildingServicesTab({ buildingId }: BuildingServicesTabProps) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ServiceDto | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<ServiceDto | null>(null)

  const { data: services, isLoading, isError } = useQuery({
    queryKey: serviceKeys.byBuilding(buildingId),
    queryFn: () => fetchBuildingServices(buildingId),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateService(id),
    onSuccess: () => {
      toast.success('Đã ngưng dịch vụ')
      queryClient.invalidateQueries({ queryKey: serviceKeys.byBuilding(buildingId) })
      queryClient.invalidateQueries({ queryKey: roomServiceKeys.all })
      setDeactivateTarget(null)
    },
    onError: (error: Error) => {
      toast.error('Ngưng dịch vụ thất bại', error.message)
    },
  })

  const columns: Column<ServiceDto>[] = [
    {
      key: 'name',
      header: 'Dịch vụ',
      render: (row) => (
        <div>
          <p className='font-medium'>{row.name}</p>
          <p className='text-xs text-muted-foreground'>/{row.unit}</p>
        </div>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Đơn giá',
      render: (row) => (
        <div>
          <p className='font-medium'>{formatCurrency(row.unitPrice)}</p>
          {row.previousUnitPrice != null && (
            <p className='text-xs text-muted-foreground line-through'>
              {formatCurrency(row.previousUnitPrice)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Loại',
      render: (row) => <MeteredBadge metered={row.isMetered} />,
    },
    {
      key: 'isActive',
      header: 'Trạng thái',
      render: (row) => <ActiveBadge active={row.isActive} />,
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
              setEditTarget(row)
            }}
          >
            Sửa
          </Button>
          {row.isActive && (
            <Button
              variant='ghost'
              size='sm'
              className='text-destructive hover:text-destructive'
              onClick={(e) => {
                e.stopPropagation()
                setDeactivateTarget(row)
              }}
            >
              Ngưng
            </Button>
          )}
        </div>
      ),
      headerClassName: 'w-[150px]',
    },
  ]

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>
          Cấu hình phí cho tòa nhà. Đây là đơn giá mặc định dùng khi tạo hóa đơn.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='size-4' />
          Thêm dịch vụ
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={services ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        emptyMessage={isError ? 'Đã xảy ra lỗi khi tải danh sách dịch vụ.' : 'Chưa có dịch vụ nào.'}
        emptyIcon={<Settings className='size-10' />}
      />

      {/* Create Service */}
      <ServiceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode='create'
        buildingId={buildingId}
      />

      {/* Edit Service */}
      <ServiceFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        mode='edit'
        buildingId={buildingId}
        service={editTarget ?? undefined}
      />

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title='Ngưng dịch vụ'
        description={`Ngưng "${deactivateTarget?.name}" sẽ không tính vào hóa đơn tương lai. Hóa đơn hiện tại không bị ảnh hưởng.`}
        confirmLabel='Ngưng'
        variant='destructive'
        loading={deactivateMutation.isPending}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
      />
    </div>
  )
}
