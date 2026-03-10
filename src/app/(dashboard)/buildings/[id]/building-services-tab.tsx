'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings, Zap, Droplet } from 'lucide-react'
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

  const { data: services, isLoading } = useQuery({
    queryKey: serviceKeys.byBuilding(buildingId),
    queryFn: () => fetchBuildingServices(buildingId),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateService(id),
    onSuccess: () => {
      toast.success('Service deactivated')
      queryClient.invalidateQueries({ queryKey: serviceKeys.byBuilding(buildingId) })
      setDeactivateTarget(null)
    },
    onError: (error: Error) => {
      toast.error('Failed to deactivate service', error.message)
    },
  })

  const columns: Column<ServiceDto>[] = [
    {
      key: 'name',
      header: 'Service',
      render: (row) => (
        <div>
          <p className='font-medium'>{row.name}</p>
          <p className='text-xs text-muted-foreground'>per {row.unit}</p>
        </div>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
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
      header: 'Type',
      render: (row) => <MeteredBadge metered={row.isMetered} />,
    },
    {
      key: 'isActive',
      header: 'Status',
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
            Edit
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
              Deactivate
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
          Fee configuration for this building. These are the default prices used in invoice generation.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='size-4' />
          Add Service
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={services ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        emptyMessage='No services configured for this building.'
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
        title='Deactivate Service'
        description={`Deactivating "${deactivateTarget?.name}" will exclude it from future invoices. Existing invoices are not affected.`}
        confirmLabel='Deactivate'
        variant='destructive'
        loading={deactivateMutation.isPending}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
      />
    </div>
  )
}
