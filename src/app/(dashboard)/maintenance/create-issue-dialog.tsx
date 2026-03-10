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
import { issueKeys, createIssue } from '@/lib/queries/issues'

// ─── Schema ─────────────────────────────────────────────

const issueSchema = z.object({
  buildingId: z.string().optional().or(z.literal('')),
  roomId: z.string().optional().or(z.literal('')),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(2000),
})

type IssueFormData = z.infer<typeof issueSchema>

// ─── Props ──────────────────────────────────────────────

interface CreateIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateIssueDialog({
  open,
  onOpenChange,
}: CreateIssueDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      buildingId: '',
      roomId: '',
      title: '',
      description: '',
    },
  })

  const watchedBuildingId = watch('buildingId')

  // ─── Data ──────────────────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: 100 }),
  })

  const { data: roomsData } = useQuery({
    queryKey: roomKeys.list({ buildingId: watchedBuildingId!, pageSize: 200 }),
    queryFn: () => fetchRooms({ buildingId: watchedBuildingId!, pageSize: 200 }),
    enabled: !!watchedBuildingId,
  })

  const buildings = buildingsData?.data ?? []
  const rooms = roomsData?.data ?? []

  // ─── Reset on open ────────────────────────────────────
  useEffect(() => {
    if (open) {
      reset({ buildingId: '', roomId: '', title: '', description: '' })
    }
  }, [open, reset])

  // ─── Mutation ──────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data: IssueFormData) =>
      createIssue({
        buildingId: data.buildingId || undefined,
        roomId: data.roomId || undefined,
        title: data.title,
        description: data.description,
      }),
    onSuccess: () => {
      toast.success('Issue reported', 'Maintenance issue has been created.')
      queryClient.invalidateQueries({ queryKey: issueKeys.all })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Failed to report issue', error.message),
  })

  const onSubmit = (data: IssueFormData) => mutation.mutate(data)

  // ─── Render ────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Report Maintenance Issue</DialogTitle>
          <DialogDescription>
            Describe the problem so the building team can address it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            {/* Building (optional for tenants — auto-resolved from contract) */}
            <div className='space-y-2'>
              <Label htmlFor='iss-building'>Building</Label>
              <Select id='iss-building' {...register('buildingId')}>
                <option value=''>Auto-detect from contract</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
              <p className='text-xs text-muted-foreground'>
                Tenants: leave blank to auto-detect from your active contract.
              </p>
            </div>

            {/* Room (optional) */}
            {watchedBuildingId && rooms.length > 0 && (
              <div className='space-y-2'>
                <Label htmlFor='iss-room'>Room (optional)</Label>
                <Select id='iss-room' {...register('roomId')}>
                  <option value=''>Common area / building-wide</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>Room {r.roomNumber}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Title */}
            <div className='space-y-2'>
              <Label htmlFor='iss-title'>Title *</Label>
              <Input
                id='iss-title'
                placeholder='e.g., Leaking faucet in bathroom'
                {...register('title')}
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p className='text-xs text-destructive'>{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label htmlFor='iss-description'>Description *</Label>
              <Textarea
                id='iss-description'
                placeholder='Describe the issue in detail…'
                rows={4}
                {...register('description')}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className='text-xs text-destructive'>{errors.description.message}</p>
              )}
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
              {mutation.isPending ? 'Submitting…' : 'Report Issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
