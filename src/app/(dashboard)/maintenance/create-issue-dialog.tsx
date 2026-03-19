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
import { DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import { roomKeys, fetchRooms } from '@/lib/queries/rooms'
import { issueKeys, createIssue } from '@/lib/queries/issues'
import { userKeys } from '@/lib/queries/users'
import { useAuth } from '@/providers/AuthProvider'

// ─── Schema ─────────────────────────────────────────────

const issueSchema = z.object({
  buildingId: z.string().optional().or(z.literal('')),
  roomId: z.string().optional().or(z.literal('')),
  title: z.string().trim().min(1, 'Tiêu đề là bắt buộc').max(200),
  description: z.string().trim().min(1, 'Mô tả là bắt buộc').max(2000),
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
  const { hasRole } = useAuth()
  const isTenant = hasRole('tenant')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
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
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  const { data: roomsData } = useQuery({
    queryKey: roomKeys.list({ buildingId: watchedBuildingId!, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchRooms({ buildingId: watchedBuildingId!, pageSize: DROPDOWN_PAGE_SIZE }),
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

  // Clear room when building changes to avoid submitting a stale hidden roomId.
  useEffect(() => {
    setValue('roomId', '')
  }, [watchedBuildingId, setValue])

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
      toast.success('Vấn đề đã báo cáo', 'Yêu cầu bảo trì đã được tạo.')
      queryClient.invalidateQueries({ queryKey: issueKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Không thể báo vấn đề', error.message),
  })

  const onSubmit = (data: IssueFormData) => {
    if (!isTenant && !data.buildingId) {
      setError('buildingId', {
        type: 'manual',
        message: 'Tòa nhà là bắt buộc với chủ/nhân viên.',
      })
      return
    }

    clearErrors('buildingId')
    mutation.mutate(data)
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Báo vấn đề bảo trì</DialogTitle>
          <DialogDescription>
            Mô tả vấn đề để đội quản lý tòa nhà xử lý.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            {/* Building (optional for tenants — auto-resolved from contract) */}
            <div className='space-y-2'>
              <Label htmlFor='iss-building'>Tòa nhà {isTenant ? '' : '*'}</Label>
              <Select id='iss-building' {...register('buildingId')}>
                <option value=''>{isTenant ? 'Tự phát hiện từ hợp đồng' : 'Chọn tòa nhà…'}</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
              <p className='text-xs text-muted-foreground'>
                {isTenant
                  ? 'Để trống để tự phát hiện từ hợp đồng hiệu lực.'
                  : 'Bắt buộc với chủ/nhân viên.'}
              </p>
              {errors.buildingId && (
                <p className='text-xs text-destructive'>{errors.buildingId.message}</p>
              )}
            </div>

            {/* Room (optional) */}
            {watchedBuildingId && rooms.length > 0 && (
              <div className='space-y-2'>
                <Label htmlFor='iss-room'>Phòng (không bắt buộc)</Label>
                <Select id='iss-room' {...register('roomId')}>
                  <option value=''>Khu vực chung / toàn tòa nhà</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>Phòng {r.roomNumber}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Title */}
            <div className='space-y-2'>
              <Label htmlFor='iss-title'>Tiêu đề *</Label>
              <Input
                id='iss-title'
                placeholder='Ví dụ: Vòi nước bị rỉ trong phòng tắm'
                {...register('title')}
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p className='text-xs text-destructive'>{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label htmlFor='iss-description'>Mô tả *</Label>
              <Textarea
                id='iss-description'
                placeholder='Mô tả chi tiết vấn đề…'
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
              Hủy
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang gửi…' : 'Báo vấn đề'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
