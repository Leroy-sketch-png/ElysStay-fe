'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { mapApiErrorsToForm } from '@/lib/form-utils'
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
import { reportKeys } from '@/lib/queries/reports'
import { roomKeys, fetchRooms } from '@/lib/queries/rooms'
import { expenseKeys, createExpense, updateExpense } from '@/lib/queries/expenses'
import { userKeys } from '@/lib/queries/users'
import { EXPENSE_CATEGORIES, DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import { toLocalDateInputValue } from '@/lib/utils'
import type { ExpenseDto } from '@/types/api'

// ─── Schema ─────────────────────────────────────────────

function getTodayDate(): string {
  return toLocalDateInputValue()
}

function normalizeDateInputValue(value: string): string {
  return value.includes('T') ? value.split('T')[0] : value
}

const expenseSchema = z.object({
  buildingId: z.string().min(1, 'Vui lòng chọn tòa nhà'),
  roomId: z.string().optional().or(z.literal('')),
  category: z.string().min(1, 'Vui lòng chọn danh mục').max(100),
  description: z.string().trim().min(1, 'Mô tả là bắt buộc').max(500),
  amount: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined
      if (typeof value === 'number' && Number.isNaN(value)) return undefined
      return value
    },
    z.number({ error: 'Nhập số tiền hợp lệ' }).positive('Số tiền phải lớn hơn 0'),
  ),
  expenseDate: z.string().min(1, 'Ngày là bắt buộc'),
}).refine((data) => data.expenseDate <= getTodayDate(), {
  message: 'Ngày chi phí không được ở tương lai',
  path: ['expenseDate'],
})

type ExpenseFormData = z.input<typeof expenseSchema>
type ExpenseFormOutput = z.output<typeof expenseSchema>

// ─── Props ──────────────────────────────────────────────

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseDto | null // null = create mode
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
}: ExpenseFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!expense

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<ExpenseFormData, unknown, ExpenseFormOutput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      buildingId: '',
      roomId: '',
      category: '',
      description: '',
      amount: 0,
      expenseDate: getTodayDate(),
    },
  })

  const watchedBuildingId = watch('buildingId')

  // ─── Data ──────────────────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  const { data: roomsData } = useQuery({
    queryKey: roomKeys.list({ buildingId: watchedBuildingId, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchRooms({ buildingId: watchedBuildingId, pageSize: DROPDOWN_PAGE_SIZE }),
    enabled: !!watchedBuildingId,
  })

  const buildings = buildingsData?.data ?? []
  const rooms = roomsData?.data ?? []

  // ─── Reset form on open ────────────────────────────────
  useEffect(() => {
    if (open) {
      if (expense) {
        reset({
          buildingId: expense.buildingId,
          roomId: expense.roomId ?? '',
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          expenseDate: normalizeDateInputValue(expense.expenseDate),
        })
      } else {
        reset({
          buildingId: '',
          roomId: '',
          category: '',
          description: '',
          amount: 0,
          expenseDate: getTodayDate(),
        })
      }
    }
  }, [open, expense, reset])

  // ─── Mutations ─────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormOutput) =>
      createExpense({
        buildingId: data.buildingId,
        roomId: data.roomId || undefined,
        category: data.category,
        description: data.description,
        amount: data.amount,
        expenseDate: data.expenseDate,
      }),
    onSuccess: () => {
      toast.success('Chi phí đã tạo')
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      if (!mapApiErrorsToForm(error, setError)) {
        toast.error('Không thể tạo chi phí', error.message)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ExpenseFormOutput) =>
      updateExpense(expense!.id, {
        category: data.category,
        description: data.description,
        amount: data.amount,
        expenseDate: data.expenseDate,
      }),
    onSuccess: () => {
      toast.success('Chi phí đã cập nhật')
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      if (!mapApiErrorsToForm(error, setError)) {
        toast.error('Không thể cập nhật chi phí', error.message)
      }
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const onSubmit = (data: ExpenseFormOutput) => {
    if (isEdit) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa chi phí' : 'Thêm chi phí'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Cập nhật thông tin chi phí.'
              : 'Ghi nhận chi phí mới cho tòa nhà.'}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            {/* Building */}
            <div className='space-y-2'>
              <Label htmlFor='exp-building'>Tòa nhà *</Label>
              <Select
                id='exp-building'
                {...register('buildingId')}
                disabled={isEdit}
                aria-invalid={!!errors.buildingId}
              >
                <option value=''>Chọn tòa nhà…</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
              {errors.buildingId && (
                <p className='text-xs text-destructive'>{errors.buildingId.message}</p>
              )}
            </div>

            {/* Room (optional) */}
            {watchedBuildingId && rooms.length > 0 && !isEdit && (
              <div className='space-y-2'>
                <Label htmlFor='exp-room'>Phòng (không bắt buộc)</Label>
                <Select id='exp-room' {...register('roomId')}>
                  <option value=''>Chi phí cấp tòa nhà</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>Phòng {r.roomNumber}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Category */}
            <div className='space-y-2'>
              <Label htmlFor='exp-category'>Danh mục *</Label>
              <Select
                id='exp-category'
                {...register('category')}
                aria-invalid={!!errors.category}
              >
                <option value=''>Chọn danh mục…</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </Select>
              {errors.category && (
                <p className='text-xs text-destructive'>{errors.category.message}</p>
              )}
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label htmlFor='exp-description'>Mô tả *</Label>
              <Textarea
                id='exp-description'
                placeholder='Chi phí này dùng cho việc gì?'
                rows={3}
                {...register('description')}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className='text-xs text-destructive'>{errors.description.message}</p>
              )}
            </div>

            {/* Amount */}
            <div className='space-y-2'>
              <Label htmlFor='exp-amount'>Số tiền (VND) *</Label>
              <Input
                id='exp-amount'
                type='number'
                min={1}
                step={1000}
                {...register('amount', {
                  setValueAs: (value) => value === '' ? undefined : Number(value),
                })}
                aria-invalid={!!errors.amount}
              />
              {errors.amount && (
                <p className='text-xs text-destructive'>{errors.amount.message}</p>
              )}
            </div>

            {/* Date */}
            <div className='space-y-2'>
              <Label htmlFor='exp-date'>Ngày chi *</Label>
              <Input
                id='exp-date'
                type='date'
                max={getTodayDate()}
                {...register('expenseDate')}
                aria-invalid={!!errors.expenseDate}
              />
              {errors.expenseDate && (
                <p className='text-xs text-destructive'>{errors.expenseDate.message}</p>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending
                ? isEdit ? 'Đang lưu…' : 'Đang tạo…'
                : isEdit ? 'Lưu thay đổi' : 'Thêm chi phí'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
