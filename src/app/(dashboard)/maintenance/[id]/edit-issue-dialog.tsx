'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { issueKeys, updateIssue } from '@/lib/queries/issues'
import type { MaintenanceIssueDto } from '@/types/api'

// ─── Schema ─────────────────────────────────────────────

const editIssueSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(2000),
})

type EditIssueFormData = z.infer<typeof editIssueSchema>

// ─── Props ──────────────────────────────────────────────

interface EditIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  issue: MaintenanceIssueDto
}

export function EditIssueDialog({
  open,
  onOpenChange,
  issue,
}: EditIssueDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditIssueFormData>({
    resolver: zodResolver(editIssueSchema),
    defaultValues: {
      title: issue.title,
      description: issue.description,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: issue.title,
        description: issue.description,
      })
    }
  }, [open, issue, reset])

  const mutation = useMutation({
    mutationFn: (data: EditIssueFormData) =>
      updateIssue(issue.id, {
        title: data.title,
        description: data.description,
      }),
    onSuccess: () => {
      toast.success('Issue updated')
      queryClient.invalidateQueries({ queryKey: issueKeys.all })
      queryClient.invalidateQueries({ queryKey: issueKeys.detail(issue.id) })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error('Failed to update issue', error.message),
  })

  const onSubmit = (data: EditIssueFormData) => mutation.mutate(data)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Edit Issue</DialogTitle>
          <DialogDescription>Update the issue title or description.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='edit-title'>Title *</Label>
              <Input
                id='edit-title'
                {...register('title')}
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p className='text-xs text-destructive'>{errors.title.message}</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='edit-desc'>Description *</Label>
              <Textarea
                id='edit-desc'
                rows={5}
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
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
