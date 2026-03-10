'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  DoorOpen,
  User,
  UserCheck,
  Clock,
  Pencil,
  PlayCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { IssueStatusBadge, PriorityBadge } from '@/components/ui/status-badge'
import { toast } from '@/components/ui/toaster'
import { formatDate, timeAgo } from '@/lib/utils'
import {
  issueKeys,
  fetchIssueById,
  changeIssueStatus,
} from '@/lib/queries/issues'
import type { MaintenanceIssueDto, IssueStatus } from '@/types/api'
import { EditIssueDialog } from './edit-issue-dialog'

// ─── Status Transition Map (SM-13) ──────────────────────

const ALLOWED_TRANSITIONS: Record<IssueStatus, { status: IssueStatus; label: string; icon: typeof PlayCircle; variant?: 'default' | 'outline' | 'destructive' }[]> = {
  New: [
    { status: 'InProgress', label: 'Start Work', icon: PlayCircle, variant: 'default' },
    { status: 'Closed', label: 'Close', icon: XCircle, variant: 'outline' },
  ],
  InProgress: [
    { status: 'Resolved', label: 'Mark Resolved', icon: CheckCircle, variant: 'default' },
  ],
  Resolved: [
    { status: 'Closed', label: 'Close', icon: XCircle, variant: 'outline' },
  ],
  Closed: [],
}

// ─── Page ───────────────────────────────────────────────

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  // Fetch single issue by ID via GET /issues/:id
  const { data: issue, isLoading } = useQuery({
    queryKey: issueKeys.detail(id),
    queryFn: () => fetchIssueById(id),
  })

  // ─── Status Transition ─────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: (newStatus: IssueStatus) =>
      changeIssueStatus(id, { status: newStatus }),
    onSuccess: (updated) => {
      toast.success('Status updated', `Issue is now ${updated?.status ?? 'updated'}.`)
      queryClient.invalidateQueries({ queryKey: issueKeys.all })
    },
    onError: (error: Error) => toast.error('Failed to update status', error.message),
  })

  const availableTransitions = issue ? (ALLOWED_TRANSITIONS[issue.status] ?? []) : []

  // ─── Loading ───────────────────────────────────────────
  if (isLoading) {
    return (
      <PageContainer title='Issue Details'>
        <div className='space-y-4'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-52 w-full' />
        </div>
      </PageContainer>
    )
  }

  if (!issue) {
    return (
      <PageContainer title='Issue Not Found'>
        <div className='py-12 text-center'>
          <p className='text-muted-foreground'>This issue could not be found.</p>
          <Button
            variant='outline'
            className='mt-4'
            onClick={() => router.push('/maintenance')}
          >
            Back to Issues
          </Button>
        </div>
      </PageContainer>
    )
  }

  // ─── Derived ───────────────────────────────────────────

  const isHighPriority = issue.priority === 'High'
  const isOpen = issue.status === 'New' || issue.status === 'InProgress'

  return (
    <PageContainer
      title={issue.title}
      description={`Reported ${timeAgo(issue.createdAt)}`}
      breadcrumbs={<Breadcrumbs items={[{ label: 'Maintenance', href: '/maintenance' }, { label: issue.title }]} />}
      actions={
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => router.push('/maintenance')}>
            <ArrowLeft className='size-4' />
            Back
          </Button>
          {isOpen && (
            <Button variant='outline' onClick={() => setEditOpen(true)}>
              <Pencil className='size-4' />
              Edit
            </Button>
          )}
        </div>
      }
    >
      {/* Priority Warning */}
      {isHighPriority && isOpen && (
        <Card className='border-destructive/50 bg-destructive/5'>
          <CardContent className='flex items-center gap-3 py-3'>
            <AlertTriangle className='size-5 text-destructive' />
            <p className='text-sm font-medium text-destructive'>
              High priority issue — requires immediate attention.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status + Actions Row */}
      <div className='flex flex-wrap items-center gap-3'>
        <IssueStatusBadge status={issue.status} />
        <PriorityBadge priority={issue.priority} />
        <div className='flex-1' />
        {availableTransitions.map((t) => (
          <Button
            key={t.status}
            variant={t.variant ?? 'default'}
            size='sm'
            onClick={() => statusMutation.mutate(t.status)}
            disabled={statusMutation.isPending}
          >
            <t.icon className='size-4' />
            {t.label}
          </Button>
        ))}
      </div>

      {/* Issue Details */}
      <div className='grid gap-6 md:grid-cols-2'>
        {/* Description Card */}
        <Card className='md:col-span-2'>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='whitespace-pre-wrap text-sm leading-relaxed'>
              {issue.description}
            </p>
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center gap-3'>
              <Building2 className='size-4 text-muted-foreground' />
              <div>
                <p className='text-sm font-medium'>{issue.buildingName}</p>
                <p className='text-xs text-muted-foreground'>Building</p>
              </div>
            </div>
            {issue.roomNumber && (
              <div className='flex items-center gap-3'>
                <DoorOpen className='size-4 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>Room {issue.roomNumber}</p>
                  <p className='text-xs text-muted-foreground'>Room</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* People Card */}
        <Card>
          <CardHeader>
            <CardTitle>People</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center gap-3'>
              <User className='size-4 text-muted-foreground' />
              <div>
                <p className='text-sm font-medium'>{issue.reporterName ?? '—'}</p>
                <p className='text-xs text-muted-foreground'>Reported by</p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <UserCheck className='size-4 text-muted-foreground' />
              <div>
                <p className='text-sm font-medium'>
                  {issue.assigneeName ?? (
                    <span className='text-muted-foreground'>Unassigned</span>
                  )}
                </p>
                <p className='text-xs text-muted-foreground'>Assigned to</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card className='md:col-span-2'>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='flex items-center gap-3'>
                <Clock className='size-4 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>{formatDate(issue.createdAt)}</p>
                  <p className='text-xs text-muted-foreground'>Created</p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <Clock className='size-4 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>{formatDate(issue.updatedAt)}</p>
                  <p className='text-xs text-muted-foreground'>Last Updated</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <EditIssueDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        issue={issue}
      />
    </PageContainer>
  )
}
