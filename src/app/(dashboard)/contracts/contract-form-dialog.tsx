'use client'

import { useEffect, useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { formatCurrency } from '@/lib/utils'
import { contractKeys, createContract } from '@/lib/queries/contracts'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import { DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import { roomKeys, fetchRooms } from '@/lib/queries/rooms'
import { tenantKeys, fetchTenants } from '@/lib/queries/tenants'
import { paymentKeys } from '@/lib/queries/payments'
import { invoiceKeys } from '@/lib/queries/invoices'
import { userKeys } from '@/lib/queries/users'
import type { CreateContractRequest } from '@/types/api'

// ─── Validation ─────────────────────────────────────────

const contractSchema = z.object({
  buildingId: z.string().min(1, 'Select a building'),
  roomId: z.string().min(1, 'Select a room'),
  tenantUserId: z.string().min(1, 'Select a tenant'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  moveInDate: z.string().min(1, 'Move-in date is required'),
  monthlyRent: z.number({ error: 'Monthly rent is required' }).positive('Rent must be positive'),
  depositAmount: z.number({ error: 'Deposit amount is required' }).min(0, 'Deposit cannot be negative'),
  note: z.string().max(500).optional().or(z.literal('')),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine((data) => !data.moveInDate || !data.startDate || data.moveInDate >= data.startDate, {
  message: 'Move-in date cannot be before start date',
  path: ['moveInDate'],
}).refine((data) => !data.moveInDate || !data.endDate || data.moveInDate <= data.endDate, {
  message: 'Move-in date cannot be after end date',
  path: ['moveInDate'],
})

type ContractFormData = z.input<typeof contractSchema>
type ContractFormOutput = z.output<typeof contractSchema>

// ─── Props ──────────────────────────────────────────────

interface ContractFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContractFormDialog({ open, onOpenChange }: ContractFormDialogProps) {
  const queryClient = useQueryClient()
  const [selectedBuildingId, setSelectedBuildingId] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContractFormData, unknown, ContractFormOutput>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      buildingId: '',
      roomId: '',
      tenantUserId: '',
      startDate: '',
      endDate: '',
      moveInDate: '',
      monthlyRent: 0,
      depositAmount: 0,
      note: '',
    },
  })

  const watchedBuildingId = watch('buildingId')

  // Reset form on open
  useEffect(() => {
    if (open) {
      reset()
      setSelectedBuildingId('')
    }
  }, [open, reset])

  // When building changes, reset room selection
  useEffect(() => {
    if (watchedBuildingId !== selectedBuildingId) {
      setSelectedBuildingId(watchedBuildingId)
      setValue('roomId', '')
    }
  }, [watchedBuildingId, selectedBuildingId, setValue])

  // ─── Data: Buildings ──────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    enabled: open,
  })

  // ─── Data: Available Rooms ────────────────────────────
  const { data: roomsData } = useQuery({
    queryKey: roomKeys.list({ buildingId: selectedBuildingId, status: 'Available', pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchRooms({ buildingId: selectedBuildingId, status: 'Available', pageSize: DROPDOWN_PAGE_SIZE }),
    enabled: open && !!selectedBuildingId,
  })

  // ─── Data: Active Tenants ─────────────────────────────
  const { data: tenantsData } = useQuery({
    queryKey: tenantKeys.list({ pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchTenants({ pageSize: DROPDOWN_PAGE_SIZE }),
    enabled: open,
  })

  const activeTenants = useMemo(
    () => (tenantsData?.data ?? []).filter((t) => t.status === 'Active'),
    [tenantsData],
  )

  const availableRooms = roomsData?.data ?? []

  // Auto-fill rent when room is selected
  const watchedRoomId = watch('roomId')
  useEffect(() => {
    if (watchedRoomId && availableRooms.length > 0) {
      const room = availableRooms.find((r) => r.id === watchedRoomId)
      if (room) {
        setValue('monthlyRent', room.price)
      }
    }
  }, [watchedRoomId, availableRooms, setValue])

  // ─── Mutation ─────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: CreateContractRequest) => createContract(data),
    onSuccess: () => {
      toast.success('Contract created', 'Deposit payment has been recorded automatically.')
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error & { status?: number }) => {
      if ((error as { status?: number }).status === 409) {
        toast.error('Room already has an active contract', 'Only one active contract per room is allowed.')
      } else {
        toast.error('Failed to create contract', error.message)
      }
    },
  })

  const onSubmit = (data: ContractFormOutput) => {
    createMutation.mutate({
      roomId: data.roomId,
      tenantUserId: data.tenantUserId,
      startDate: data.startDate,
      endDate: data.endDate,
      moveInDate: data.moveInDate,
      monthlyRent: data.monthlyRent,
      depositAmount: data.depositAmount,
      note: data.note || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='lg'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>New Rental Contract</DialogTitle>
          <DialogDescription>
            Create a contract to assign a tenant to a room. The room status will change to Occupied and a deposit
            payment will be recorded automatically.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-5'>
            {/* Building + Room Selection */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='contract-building'>Building *</Label>
                <Controller
                  name='buildingId'
                  control={control}
                  render={({ field }) => (
                    <Select
                      id='contract-building'
                      value={field.value}
                      onChange={field.onChange}
                      aria-invalid={!!errors.buildingId}
                    >
                      <option value=''>Select building…</option>
                      {(buildingsData?.data ?? []).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </Select>
                  )}
                />
                {errors.buildingId && <p className='text-xs text-destructive'>{errors.buildingId.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='contract-room'>Room *</Label>
                <Controller
                  name='roomId'
                  control={control}
                  render={({ field }) => (
                    <Select
                      id='contract-room'
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!selectedBuildingId}
                      aria-invalid={!!errors.roomId}
                    >
                      <option value=''>
                        {!selectedBuildingId
                          ? 'Select building first'
                          : availableRooms.length === 0
                            ? 'No available rooms'
                            : 'Select room…'
                        }
                      </option>
                      {availableRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roomNumber} — Floor {r.floor} — {formatCurrency(r.price)}/mo
                        </option>
                      ))}
                    </Select>
                  )}
                />
                {errors.roomId && <p className='text-xs text-destructive'>{errors.roomId.message}</p>}
              </div>
            </div>

            {/* Tenant Selection */}
            <div className='space-y-2'>
              <Label htmlFor='contract-tenant'>Tenant *</Label>
              <Controller
                name='tenantUserId'
                control={control}
                render={({ field }) => (
                  <Select
                    id='contract-tenant'
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={!!errors.tenantUserId}
                  >
                    <option value=''>Select tenant…</option>
                    {activeTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} — {t.email}
                      </option>
                    ))}
                  </Select>
                )}
              />
              {errors.tenantUserId && <p className='text-xs text-destructive'>{errors.tenantUserId.message}</p>}
            </div>

            {/* Dates */}
            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='space-y-2'>
                <Label htmlFor='contract-start'>Start Date *</Label>
                <Input
                  id='contract-start'
                  type='date'
                  {...register('startDate')}
                  aria-invalid={!!errors.startDate}
                />
                {errors.startDate && <p className='text-xs text-destructive'>{errors.startDate.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contract-end'>End Date *</Label>
                <Input
                  id='contract-end'
                  type='date'
                  {...register('endDate')}
                  aria-invalid={!!errors.endDate}
                />
                {errors.endDate && <p className='text-xs text-destructive'>{errors.endDate.message}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contract-movein'>Move-in Date *</Label>
                <Input
                  id='contract-movein'
                  type='date'
                  {...register('moveInDate')}
                  aria-invalid={!!errors.moveInDate}
                />
                {errors.moveInDate && <p className='text-xs text-destructive'>{errors.moveInDate.message}</p>}
              </div>
            </div>

            {/* Pricing */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='contract-rent'>Monthly Rent (VND) *</Label>
                <Input
                  id='contract-rent'
                  type='number'
                  min={0}
                  step={100000}
                  {...register('monthlyRent', {
                    setValueAs: (value) => value === '' ? undefined : Number(value),
                  })}
                  aria-invalid={!!errors.monthlyRent}
                />
                {errors.monthlyRent && <p className='text-xs text-destructive'>{errors.monthlyRent.message}</p>}
                <p className='text-xs text-muted-foreground'>
                  Locked at signing — won&apos;t change if room price changes later.
                </p>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contract-deposit'>Deposit Amount (VND) *</Label>
                <Input
                  id='contract-deposit'
                  type='number'
                  min={0}
                  step={100000}
                  {...register('depositAmount', {
                    setValueAs: (value) => value === '' ? undefined : Number(value),
                  })}
                  aria-invalid={!!errors.depositAmount}
                />
                {errors.depositAmount && <p className='text-xs text-destructive'>{errors.depositAmount.message}</p>}
                <p className='text-xs text-muted-foreground'>
                  A deposit-in payment will be recorded automatically.
                </p>
              </div>
            </div>

            {/* Note */}
            <div className='space-y-2'>
              <Label htmlFor='contract-note'>Note</Label>
              <Textarea
                id='contract-note'
                placeholder='Any additional notes about this contract…'
                rows={2}
                {...register('note')}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type='submit' disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
