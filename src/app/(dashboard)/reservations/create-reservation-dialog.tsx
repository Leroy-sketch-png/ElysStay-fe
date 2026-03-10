'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import { roomKeys, fetchRooms } from '@/lib/queries/rooms'
import { reservationKeys, createReservation } from '@/lib/queries/reservations'
import { tenantKeys, fetchTenants } from '@/lib/queries/tenants'
import { formatCurrency } from '@/lib/utils'

// ─── Schema ─────────────────────────────────────────────

const reservationSchema = z.object({
  buildingId: z.string().min(1, 'Building is required'),
  roomId: z.string().min(1, 'Room is required'),
  tenantUserId: z.string().min(1, 'Tenant is required'),
  depositAmount: z.number({ error: 'Enter a valid amount' }).min(0).optional(),
  expiresAt: z.string().optional(),
  note: z.string().max(500).optional(),
})

type ReservationFormData = z.infer<typeof reservationSchema>

// ─── Props ──────────────────────────────────────────────

interface CreateReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateReservationDialog({
  open,
  onOpenChange,
}: CreateReservationDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      buildingId: '',
      roomId: '',
      tenantUserId: '',
      expiresAt: (() => {
        const d = new Date()
        d.setDate(d.getDate() + 7)
        return d.toISOString().slice(0, 16)
      })(),
      note: '',
    },
  })

  const watchedBuildingId = watch('buildingId')
  const watchedRoomId = watch('roomId')

  // ─── Data Queries ──────────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: 100 }),
  })

  const { data: roomsData } = useQuery({
    queryKey: roomKeys.list({ buildingId: watchedBuildingId, status: 'Available', pageSize: 200 }),
    queryFn: () => fetchRooms({ buildingId: watchedBuildingId, status: 'Available', pageSize: 200 }),
    enabled: !!watchedBuildingId,
  })

  const { data: tenantsData } = useQuery({
    queryKey: tenantKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => fetchTenants({ page: 1, pageSize: 200 }),
  })

  const buildings = buildingsData?.data ?? []
  const rooms = roomsData?.data ?? []
  const tenants = tenantsData?.data ?? []

  // Auto-populate deposit with 50% of room price
  const selectedRoom = rooms.find((r) => r.id === watchedRoomId)

  // Default expiry is set in form defaultValues to ensure React Hook Form tracks it

  // ─── Reset ─────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      reset({
        buildingId: '',
        roomId: '',
        tenantUserId: '',
        expiresAt: d.toISOString().slice(0, 16),
        note: '',
      })
    }
  }, [open, reset])

  // Clear room selection when building changes
  useEffect(() => {
    setValue('roomId', '')
  }, [watchedBuildingId, setValue])

  // ─── Mutation ──────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data: ReservationFormData) =>
      createReservation({
        roomId: data.roomId,
        tenantUserId: data.tenantUserId,
        depositAmount: data.depositAmount || undefined,
        expiresAt: data.expiresAt || undefined,
        note: data.note || undefined,
      }),
    onSuccess: () => {
      toast.success('Reservation created')
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      queryClient.invalidateQueries({ queryKey: roomKeys.all })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to create reservation', error.message)
    },
  })

  const onSubmit = handleSubmit((data) => mutation.mutate(data))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='lg'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>New Reservation</DialogTitle>
          <DialogDescription>
            Reserve a room for a tenant. The room will be marked as Booked.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <DialogBody className='space-y-4'>
            {/* Building */}
            <div className='space-y-1.5'>
              <Label htmlFor='buildingId'>Building *</Label>
              <Select {...register('buildingId')}>
                <option value=''>Select building…</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              {errors.buildingId && (
                <p className='text-xs text-destructive'>{errors.buildingId.message}</p>
              )}
            </div>

            {/* Room */}
            <div className='space-y-1.5'>
              <Label htmlFor='roomId'>Available Room *</Label>
              <Select {...register('roomId')} disabled={!watchedBuildingId}>
                <option value=''>
                  {watchedBuildingId ? 'Select room…' : 'Select building first'}
                </option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} — {formatCurrency(r.price)}/mo
                  </option>
                ))}
              </Select>
              {errors.roomId && (
                <p className='text-xs text-destructive'>{errors.roomId.message}</p>
              )}
              {selectedRoom && (
                <p className='text-xs text-muted-foreground'>
                  Default deposit: {formatCurrency(selectedRoom.price * 0.5)} (50% of room price)
                </p>
              )}
            </div>

            {/* Tenant */}
            <div className='space-y-1.5'>
              <Label htmlFor='tenantUserId'>Tenant *</Label>
              <Select {...register('tenantUserId')}>
                <option value=''>Select tenant…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.email})
                  </option>
                ))}
              </Select>
              {errors.tenantUserId && (
                <p className='text-xs text-destructive'>{errors.tenantUserId.message}</p>
              )}
            </div>

            <div className='grid grid-cols-2 gap-4'>
              {/* Deposit Amount (optional) */}
              <div className='space-y-1.5'>
                <Label htmlFor='depositAmount'>Deposit Amount</Label>
                <Input
                  type='number'
                  step='1000'
                  min='0'
                  placeholder={selectedRoom ? String(selectedRoom.price * 0.5) : '0'}
                  {...register('depositAmount', { valueAsNumber: true })}
                />
                <p className='text-xs text-muted-foreground'>Leave empty for default (50% room price)</p>
              </div>

              {/* Expiry (optional) */}
              <div className='space-y-1.5'>
                <Label htmlFor='expiresAt'>Expires At</Label>
                <Input
                  type='datetime-local'
                  {...register('expiresAt')}
                />
                <p className='text-xs text-muted-foreground'>Default: 7 days</p>
              </div>
            </div>

            {/* Note */}
            <div className='space-y-1.5'>
              <Label htmlFor='note'>Note</Label>
              <Textarea
                rows={2}
                placeholder='Optional note about this reservation…'
                {...register('note')}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create Reservation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
