'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Plus, UserMinus, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
  ConfirmDialog,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import { contractKeys, addContractTenant, removeContractTenant } from '@/lib/queries/contracts'
import { tenantKeys, fetchTenants } from '@/lib/queries/tenants'
import type { ContractTenantDto, AddContractTenantRequest } from '@/types/api'

// ─── Add Roommate Schema ────────────────────────────────

const addRoommateSchema = z.object({
  tenantUserId: z.string().min(1, 'Select a tenant'),
  moveInDate: z.string().min(1, 'Move-in date is required'),
})

type AddRoommateFormData = z.infer<typeof addRoommateSchema>

// ─── Props ──────────────────────────────────────────────

interface ContractTenantsSectionProps {
  contractId: string
  tenants: ContractTenantDto[]
  isActive: boolean
}

export function ContractTenantsSection({
  contractId,
  tenants,
  isActive,
}: ContractTenantsSectionProps) {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [removingTenant, setRemovingTenant] = useState<ContractTenantDto | null>(null)

  // ─── Remove Mutation ────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: (tenantId: string) => removeContractTenant(contractId, tenantId),
    onSuccess: () => {
      toast.success('Roommate removed')
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) })
      setRemovingTenant(null)
    },
    onError: (error: Error) => {
      toast.error('Failed to remove roommate', error.message)
      setRemovingTenant(null)
    },
  })

  const handleRemove = (tenant: ContractTenantDto) => {
    if (tenant.isMainTenant) {
      toast.error('Cannot remove main tenant', 'Terminate the contract to remove the main tenant.')
      return
    }
    setRemovingTenant(tenant)
  }

  const activeTenants = tenants.filter((t) => !t.moveOutDate)
  const movedOutTenants = tenants.filter((t) => !!t.moveOutDate)

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0'>
          <div>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Users className='size-4' />
              Tenants ({activeTenants.length})
            </CardTitle>
            <CardDescription>
              People living in this room under the current contract.
            </CardDescription>
          </div>
          {isActive && (
            <Button size='sm' onClick={() => setAddOpen(true)}>
              <Plus className='size-4' />
              Add Roommate
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activeTenants.length === 0 ? (
            <p className='text-sm text-muted-foreground py-4 text-center'>
              No active tenants found.
            </p>
          ) : (
            <div className='divide-y'>
              {activeTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className='flex items-center justify-between py-3 first:pt-0 last:pb-0'
                >
                  <div className='space-y-0.5'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-medium'>{tenant.tenantName}</span>
                      {tenant.isMainTenant && (
                        <span className='text-[10px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded'>
                          Main
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                      {tenant.tenantEmail && <span>{tenant.tenantEmail}</span>}
                      {tenant.tenantPhone && <span>{tenant.tenantPhone}</span>}
                      <span>Moved in {formatDate(tenant.moveInDate)}</span>
                    </div>
                  </div>
                  {isActive && !tenant.isMainTenant && (
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-destructive hover:text-destructive'
                      onClick={() => handleRemove(tenant)}
                      disabled={removeMutation.isPending}
                      aria-label={`Remove ${tenant.tenantName}`}
                    >
                      <UserMinus className='size-4' />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Moved-out tenants */}
          {movedOutTenants.length > 0 && (
            <div className='mt-4 pt-4 border-t'>
              <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3'>
                Previously lived here
              </p>
              <div className='space-y-2'>
                {movedOutTenants.map((tenant) => (
                  <div key={tenant.id} className='flex items-center justify-between text-sm text-muted-foreground'>
                    <span>{tenant.tenantName}</span>
                    <span className='text-xs'>
                      {formatDate(tenant.moveInDate)} — {formatDate(tenant.moveOutDate ?? '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Roommate Dialog */}
      <AddRoommateDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        contractId={contractId}
        existingTenantIds={tenants.filter((t) => !t.moveOutDate).map((t) => t.tenantUserId)}
      />

      {/* Remove Roommate Confirmation */}
      <ConfirmDialog
        open={!!removingTenant}
        onOpenChange={(open) => { if (!open) setRemovingTenant(null) }}
        title='Remove Roommate'
        description={
          removingTenant
            ? `Remove ${removingTenant.tenantName} from this contract? They will be recorded as moved out.`
            : ''
        }
        confirmLabel='Remove'
        variant='destructive'
        loading={removeMutation.isPending}
        onConfirm={() => {
          if (removingTenant) removeMutation.mutate(removingTenant.id)
        }}
      />
    </>
  )
}

// ─── Add Roommate Dialog ────────────────────────────────

function AddRoommateDialog({
  open,
  onOpenChange,
  contractId,
  existingTenantIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  existingTenantIds: string[]
}) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AddRoommateFormData>({
    resolver: zodResolver(addRoommateSchema),
    defaultValues: { tenantUserId: '', moveInDate: new Date().toISOString().split('T')[0] },
  })

  // Fetch available tenants
  const { data: tenantsData } = useQuery({
    queryKey: tenantKeys.list({ pageSize: 200 }),
    queryFn: () => fetchTenants({ pageSize: 200 }),
    enabled: open,
  })

  // Filter out already-active tenants in this contract
  const availableTenants = (tenantsData?.data ?? []).filter(
    (t) => t.status === 'Active' && !existingTenantIds.includes(t.id),
  )

  const mutation = useMutation({
    mutationFn: (data: AddContractTenantRequest) => addContractTenant(contractId, data),
    onSuccess: () => {
      toast.success('Roommate added')
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to add roommate', error.message)
    },
  })

  const onSubmit = (data: AddRoommateFormData) => {
    mutation.mutate({
      tenantUserId: data.tenantUserId,
      moveInDate: data.moveInDate,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Add Roommate</DialogTitle>
          <DialogDescription>
            Add an existing tenant as a roommate to this contract.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          onReset={() => {
            reset()
            onOpenChange(false)
          }}
        >
          <DialogBody className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='roommate-tenant'>Tenant *</Label>
              <Controller
                name='tenantUserId'
                control={control}
                render={({ field }) => (
                  <Select
                    id='roommate-tenant'
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={!!errors.tenantUserId}
                  >
                    <option value=''>
                      {availableTenants.length === 0
                        ? 'No available tenants'
                        : 'Select tenant…'
                      }
                    </option>
                    {availableTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} — {t.email}
                      </option>
                    ))}
                  </Select>
                )}
              />
              {errors.tenantUserId && (
                <p className='text-xs text-destructive'>{errors.tenantUserId.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='roommate-movein'>Move-in Date *</Label>
              <Input
                id='roommate-movein'
                type='date'
                {...register('moveInDate')}
                aria-invalid={!!errors.moveInDate}
              />
              {errors.moveInDate && (
                <p className='text-xs text-destructive'>{errors.moveInDate.message}</p>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='reset' variant='outline' disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding…' : 'Add Roommate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
