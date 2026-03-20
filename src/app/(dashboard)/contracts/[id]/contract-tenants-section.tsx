'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { mapApiErrorsToForm } from '@/lib/form-utils'
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
import { formatDate, toLocalDateInputValue } from '@/lib/utils'
import { contractKeys, addContractTenant, removeContractTenant } from '@/lib/queries/contracts'
import { tenantKeys, fetchTenants } from '@/lib/queries/tenants'
import { userKeys } from '@/lib/queries/users'
import { DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import type { ContractTenantDto, AddContractTenantRequest } from '@/types/api'

// ─── Add Roommate Schema ────────────────────────────────

const addRoommateSchema = z.object({
  tenantUserId: z.string().min(1, 'Chọn một khách thuê'),
  moveInDate: z.string().min(1, 'Ngày dọn vào là bắt buộc'),
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
      toast.success('Đã xóa người ở cùng')
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) })
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      setRemovingTenant(null)
    },
    onError: (error: Error) => {
      toast.error('Xóa người ở cùng thất bại', error.message)
      setRemovingTenant(null)
    },
  })

  const handleRemove = (tenant: ContractTenantDto) => {
    if (tenant.isMainTenant) {
      toast.error('Không thể xóa khách chính', 'Chấm dứt hợp đồng để xóa khách chính.')
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
              Khách thuê ({activeTenants.length})
            </CardTitle>
            <CardDescription>
              Những người đang sống trong phòng theo hợp đồng hiện tại.
            </CardDescription>
          </div>
          {isActive && (
            <Button size='sm' onClick={() => setAddOpen(true)}>
              <Plus className='size-4' />
              Thêm người ở
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activeTenants.length === 0 ? (
            <p className='text-sm text-muted-foreground py-4 text-center'>
              Chưa có khách thuê.
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
                          Chính
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                      {tenant.tenantEmail && <span>{tenant.tenantEmail}</span>}
                      {tenant.tenantPhone && <span>{tenant.tenantPhone}</span>}
                      <span>Dọn vào {formatDate(tenant.moveInDate)}</span>
                    </div>
                  </div>
                  {isActive && !tenant.isMainTenant && (
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-destructive hover:text-destructive'
                      onClick={() => handleRemove(tenant)}
                      disabled={removeMutation.isPending}
                      aria-label={`Xóa ${tenant.tenantName}`}
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
                Đã từng ở đây
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
        title='Xóa người ở cùng'
        description={
          removingTenant
            ? `Xóa ${removingTenant.tenantName} khỏi hợp đồng? Họ sẽ được ghi nhận là đã dọn ra.`
            : ''
        }
        confirmLabel='Xóa'
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
    setError,
    formState: { errors },
  } = useForm<AddRoommateFormData>({
    resolver: zodResolver(addRoommateSchema),
    defaultValues: { tenantUserId: '', moveInDate: toLocalDateInputValue() },
  })

  // Fetch available tenants
  const { data: tenantsData } = useQuery({
    queryKey: tenantKeys.list({ pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchTenants({ pageSize: DROPDOWN_PAGE_SIZE }),
    enabled: open,
  })

  // Filter out already-active tenants in this contract
  const availableTenants = (tenantsData?.data ?? []).filter(
    (t) => t.status === 'Active' && !existingTenantIds.includes(t.id),
  )

  const mutation = useMutation({
    mutationFn: (data: AddContractTenantRequest) => addContractTenant(contractId, data),
    onSuccess: () => {
      toast.success('Đã thêm người ở cùng')
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) })
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      reset({ tenantUserId: '', moveInDate: toLocalDateInputValue() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      if (!mapApiErrorsToForm(error, setError)) {
        toast.error('Thêm người ở cùng thất bại', error.message)
      }
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
          <DialogTitle>Thêm người ở cùng</DialogTitle>
          <DialogDescription>
            Thêm khách thuê hiện có vào hợp đồng này.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          onReset={() => {
            reset({ tenantUserId: '', moveInDate: toLocalDateInputValue() })
            onOpenChange(false)
          }}
        >
          <DialogBody className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='roommate-tenant'>Khách thuê *</Label>
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
                        ? 'Không có khách thuê'
                        : 'Chọn khách thuê…'
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
              {availableTenants.length === 0 && (
                <p className='text-xs text-muted-foreground'>Không còn khách thuê đủ điều kiện để thêm vào hợp đồng.</p>
              )}
              {errors.tenantUserId && (
                <p className='text-xs text-destructive'>{errors.tenantUserId.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='roommate-movein'>Ngày dọn vào *</Label>
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
              Hủy
            </Button>
            <Button type='submit' disabled={mutation.isPending || availableTenants.length === 0}>
              {mutation.isPending ? 'Đang thêm…' : 'Thêm người ở'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
