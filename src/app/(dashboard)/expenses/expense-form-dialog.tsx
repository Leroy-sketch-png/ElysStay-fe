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
import { expenseKeys, createExpense, updateExpense } from '@/lib/queries/expenses'
import type { ExpenseDto } from '@/types/api'

// ─── Categories ─────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'Repair',
  'Cleaning',
  'Utilities',
  'Equipment',
  'Supplies',
  'Insurance',
  'Tax',
  'Legal',
  'Marketing',
  'Other',
]

// ─── Schema ─────────────────────────────────────────────

const expenseSchema = z.object({
  buildingId: z.string().min(1, 'Building is required'),
  roomId: z.string().optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().positive('Amount must be positive'),
  expenseDate: z.string().min(1, 'Date is required'),
})

type ExpenseFormData = z.infer<typeof expenseSchema>

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
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      buildingId: '',
      roomId: '',
      category: '',
      description: '',
      amount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
    },
  })

  const watchedBuildingId = watch('buildingId')

  // ─── Data ──────────────────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: 100 }),
  })

  const { data: roomsData } = useQuery({
    queryKey: roomKeys.list({ buildingId: watchedBuildingId, pageSize: 200 }),
    queryFn: () => fetchRooms({ buildingId: watchedBuildingId, pageSize: 200 }),
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
          expenseDate: expense.expenseDate,
        })
      } else {
        reset({
          buildingId: '',
          roomId: '',
          category: '',
          description: '',
          amount: 0,
          expenseDate: new Date().toISOString().split('T')[0],
        })
      }
    }
  }, [open, expense, reset])

  // ─── Mutations ─────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) =>
      createExpense({
        buildingId: data.buildingId,
        roomId: data.roomId || undefined,
        category: data.category,
        description: data.description,
        amount: data.amount,
        expenseDate: data.expenseDate,
      }),
    onSuccess: () => {
      toast.success('Expense created')
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Failed to create expense', error.message),
  })

  const updateMutation = useMutation({
    mutationFn: (data: ExpenseFormData) =>
      updateExpense(expense!.id, {
        category: data.category,
        description: data.description,
        amount: data.amount,
        expenseDate: data.expenseDate,
      }),
    onSuccess: () => {
      toast.success('Expense updated')
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Failed to update expense', error.message),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const onSubmit = (data: ExpenseFormData) => {
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
          <DialogTitle>{isEdit ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the expense details.'
              : 'Record a new building expense.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            {/* Building */}
            <div className='space-y-2'>
              <Label htmlFor='exp-building'>Building *</Label>
              <Select
                id='exp-building'
                {...register('buildingId')}
                disabled={isEdit}
                aria-invalid={!!errors.buildingId}
              >
                <option value=''>Select building…</option>
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
                <Label htmlFor='exp-room'>Room (optional)</Label>
                <Select id='exp-room' {...register('roomId')}>
                  <option value=''>Building-level expense</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>Room {r.roomNumber}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Category */}
            <div className='space-y-2'>
              <Label htmlFor='exp-category'>Category *</Label>
              <Select
                id='exp-category'
                {...register('category')}
                aria-invalid={!!errors.category}
              >
                <option value=''>Select category…</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
              {errors.category && (
                <p className='text-xs text-destructive'>{errors.category.message}</p>
              )}
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label htmlFor='exp-description'>Description *</Label>
              <Textarea
                id='exp-description'
                placeholder='What was the expense for?'
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
              <Label htmlFor='exp-amount'>Amount (VND) *</Label>
              <Input
                id='exp-amount'
                type='number'
                min={1}
                step={1000}
                {...register('amount', { valueAsNumber: true })}
                aria-invalid={!!errors.amount}
              />
              {errors.amount && (
                <p className='text-xs text-destructive'>{errors.amount.message}</p>
              )}
            </div>

            {/* Date */}
            <div className='space-y-2'>
              <Label htmlFor='exp-date'>Expense Date *</Label>
              <Input
                id='exp-date'
                type='date'
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
              Cancel
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending
                ? isEdit ? 'Saving…' : 'Creating…'
                : isEdit ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
