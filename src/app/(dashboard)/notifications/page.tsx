'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Loader2,
  Inbox,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/EmptyState'
import { cn, timeAgo } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import {
  notificationKeys,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationFilters,
} from '@/lib/queries/notifications'
import type { NotificationDto } from '@/types/api'

// ─── Types ──────────────────────────────────────────────

type ReadFilter = 'all' | 'unread' | 'read'

// ─── Notification type icon/label mapping ───────────────

function getNotificationTypeLabel(type: string): string {
  const map: Record<string, string> = {
    InvoiceGenerated: 'Invoice',
    PaymentReceived: 'Payment',
    ContractExpiring: 'Contract',
    MaintenanceUpdate: 'Maintenance',
    ReservationUpdate: 'Reservation',
    SystemAlert: 'System',
  }
  return map[type] || type
}

function getNotificationTypeColor(type: string): string {
  const map: Record<string, string> = {
    InvoiceGenerated: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    PaymentReceived: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    ContractExpiring: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    MaintenanceUpdate: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
    ReservationUpdate: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
    SystemAlert: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  }
  return map[type] || 'bg-muted text-muted-foreground'
}

// ─── Notification Row ───────────────────────────────────

function NotificationRow({
  notification,
  onMarkRead,
  isMarking,
}: {
  notification: NotificationDto
  onMarkRead: (id: string) => void
  isMarking: boolean
}) {
  return (
    <div
      className={cn(
        'group flex gap-4 rounded-lg border p-4 transition-colors',
        !notification.isRead
          ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
          : 'bg-card hover:bg-accent/50',
      )}
    >
      {/* Unread indicator */}
      <div className='mt-1 shrink-0'>
        {!notification.isRead ? (
          <div className='size-2.5 rounded-full bg-primary animate-pulse' />
        ) : (
          <div className='size-2.5 rounded-full bg-muted-foreground/20' />
        )}
      </div>

      {/* Content */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 mb-1'>
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  getNotificationTypeColor(notification.type),
                )}
              >
                {getNotificationTypeLabel(notification.type)}
              </span>
              <span className='text-xs text-muted-foreground'>
                {timeAgo(notification.createdAt)}
              </span>
            </div>
            <h3
              className={cn(
                'text-sm leading-snug',
                !notification.isRead ? 'font-semibold' : 'font-medium',
              )}
            >
              {notification.title}
            </h3>
            <p className='mt-1 text-sm text-muted-foreground line-clamp-2'>
              {notification.message}
            </p>
          </div>

          {/* Mark read button */}
          {!notification.isRead && (
            <button
              onClick={() => onMarkRead(notification.id)}
              disabled={isMarking}
              className='shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer disabled:opacity-50'
              title='Mark as read'
            >
              {isMarking ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Check className='size-4' />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Filter Tabs ────────────────────────────────────────

function FilterTabs({
  value,
  onChange,
  unreadCount,
}: {
  value: ReadFilter
  onChange: (v: ReadFilter) => void
  unreadCount: number
}) {
  const tabs: { key: ReadFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'read', label: 'Read' },
  ]

  return (
    <div className='flex items-center gap-1 rounded-lg bg-muted p-1'>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
            value === tab.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className='flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground'>
              {tab.count > 99 ? '99+' : tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    pageSize: 20,
  })
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [markingId, setMarkingId] = useState<string | null>(null)

  // ─── Query ──────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => fetchNotifications(filters),
  })

  const allNotifications = data?.data ?? []
  const pagination = data?.pagination

  // Client-side filter for read/unread
  const notifications =
    readFilter === 'all'
      ? allNotifications
      : allNotifications.filter((n) =>
          readFilter === 'unread' ? !n.isRead : n.isRead,
        )

  const unreadCount = allNotifications.filter((n) => !n.isRead).length

  // ─── Mutations ──────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: (id) => setMarkingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onSettled: () => setMarkingId(null),
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      toast.success(`Marked ${result.markedRead} notification(s) as read`)
    },
    onError: () => {
      toast.error('Failed to mark all as read')
    },
  })

  const handleMarkRead = useCallback(
    (id: string) => markReadMutation.mutate(id),
    [markReadMutation],
  )

  const handleMarkAllRead = useCallback(
    () => markAllReadMutation.mutate(),
    [markAllReadMutation],
  )

  // ─── Render ─────────────────────────────────────────────
  return (
    <PageTransition>
    <PageContainer
      title='Notifications'
      description='Stay on top of updates across your properties'
      actions={
        unreadCount > 0 ? (
          <Button
            variant='outline'
            size='sm'
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <CheckCheck className='size-4' />
            )}
            Mark all read
          </Button>
        ) : undefined
      }
    >
      {/* Filter tabs */}
      <div className='mb-6'>
        <FilterTabs
          value={readFilter}
          onChange={setReadFilter}
          unreadCount={unreadCount}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className='space-y-3'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-24 rounded-lg' />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<BellOff className='size-8 text-destructive' />}
          title='Failed to load notifications'
          description='An error occurred while fetching your notifications.'
          actionLabel='Retry'
          onAction={() =>
            queryClient.invalidateQueries({ queryKey: notificationKeys.all })
          }
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Inbox className='size-8 text-muted-foreground' />}
          title={
            readFilter === 'unread'
              ? 'All caught up!'
              : readFilter === 'read'
                ? 'No read notifications'
                : 'No notifications yet'
          }
          description={
            readFilter === 'unread'
              ? "You've read all your notifications. Nice work."
              : readFilter === 'read'
                ? "You haven't marked any notifications as read yet."
                : "When something happens across your properties, you'll see it here."
          }
        />
      ) : (
        <div className='space-y-3'>
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              isMarking={markingId === notification.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className='mt-6'>
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={(page) =>
              setFilters((prev) => ({ ...prev, page }))
            }
          />
        </div>
      )}
    </PageContainer>
    </PageTransition>
  )
}
