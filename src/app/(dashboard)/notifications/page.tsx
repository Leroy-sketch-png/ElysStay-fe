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
import Link from 'next/link'
import {
  notificationKeys,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationFilters,
} from '@/lib/queries/notifications'
import type { NotificationDto, NotificationType } from '@/types/api'

// ─── Types ──────────────────────────────────────────────

type ReadFilter = 'all' | 'unread' | 'read'

// ─── Notification type icon/label mapping ───────────────

function getNotificationTypeLabel(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    INVOICE_SENT: 'Hóa đơn',
    INVOICE_VOIDED: 'Hóa đơn',
    PAYMENT_RECORDED: 'Thanh toán',
    ISSUE: 'Bảo trì',
    InvoiceGenerated: 'Hóa đơn',
    PaymentReceived: 'Thanh toán',
    ContractExpiring: 'Hợp đồng',
    MaintenanceUpdate: 'Bảo trì',
    ReservationUpdate: 'Đặt cọc',
    SystemAlert: 'Hệ thống',
  }
  return map[type]
}

function getNotificationTypeColor(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    INVOICE_SENT: 'bg-info/10 text-info',
    INVOICE_VOIDED: 'bg-destructive/10 text-destructive',
    PAYMENT_RECORDED: 'bg-success/10 text-success',
    ISSUE: 'bg-warning/10 text-warning',
    InvoiceGenerated: 'bg-info/10 text-info',
    PaymentReceived: 'bg-success/10 text-success',
    ContractExpiring: 'bg-warning/10 text-warning',
    MaintenanceUpdate: 'bg-warning/10 text-warning',
    ReservationUpdate: 'bg-info/10 text-info',
    SystemAlert: 'bg-destructive/10 text-destructive',
  }
  return map[type]
}

// ─── Notification type → detail page mapping ────────────

function getNotificationHref(type: NotificationType, referenceId?: string | null): string | null {
  if (!referenceId) return null
  const map: Partial<Record<NotificationType, string>> = {
    INVOICE_SENT: `/billing/invoices/${referenceId}`,
    INVOICE_VOIDED: `/billing/invoices/${referenceId}`,
    PAYMENT_RECORDED: `/billing/invoices/${referenceId}`,
    ISSUE: `/maintenance/${referenceId}`,
    InvoiceGenerated: `/billing/invoices/${referenceId}`,
    MaintenanceUpdate: `/maintenance/${referenceId}`,
  }
  return map[type] ?? null
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
  const href = getNotificationHref(notification.type, notification.referenceId)

  const content = (
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
              type='button'
              aria-label={`Mark ${notification.title} as read`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onMarkRead(notification.id)
              }}
              disabled={isMarking}
              className='shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer disabled:opacity-50'
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

  if (href) {
    return (
      <Link
        href={href}
        className='block no-underline text-inherit'
        onClick={() => {
          if (!notification.isRead && !isMarking) {
            onMarkRead(notification.id)
          }
        }}
      >
        {content}
      </Link>
    )
  }

  return content
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
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc', count: unreadCount },
    { key: 'read', label: 'Đã đọc' },
  ]

  return (
    <div className='flex items-center gap-1 rounded-lg bg-muted p-1'>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type='button'
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

  const currentFilters = {
    ...filters,
    isRead: readFilter === 'all' ? undefined : readFilter === 'read',
  }

  // ─── Query ──────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: notificationKeys.list(currentFilters),
    queryFn: () => fetchNotifications(currentFilters),
  })

  const { data: unreadSummary } = useQuery({
    queryKey: notificationKeys.list({ page: 1, pageSize: 1, isRead: false }),
    queryFn: () => fetchNotifications({ page: 1, pageSize: 1, isRead: false }),
  })

  const notifications = data?.data ?? []
  const pagination = data?.pagination

  const unreadCount = unreadSummary?.pagination.totalItems ?? notifications.filter((n) => !n.isRead).length

  // ─── Mutations ──────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: (id) => setMarkingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: () => {
      toast.error('Không thể đánh dấu thông báo đã đọc')
    },
    onSettled: () => setMarkingId(null),
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      toast.success(`Đã đánh dấu ${result.markedRead} thông báo là đã đọc`)
    },
    onError: () => {
      toast.error('Không thể đánh dấu tất cả đã đọc')
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
      title='Thông báo'
      description='Cập nhật từ các tòa nhà của bạn'
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
            Đánh dấu tất cả đã đọc
          </Button>
        ) : undefined
      }
    >
      {/* Filter tabs */}
      <div className='mb-6'>
        <FilterTabs
          value={readFilter}
            onChange={(nextFilter) => {
              setReadFilter(nextFilter)
              setFilters((prev) => ({ ...prev, page: 1 }))
            }}
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
          title='Không thể tải thông báo'
          description='Đã xảy ra lỗi khi tải thông báo của bạn.'
          actionLabel='Thử lại'
          onAction={() =>
            queryClient.invalidateQueries({ queryKey: notificationKeys.all })
          }
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Inbox className='size-8 text-muted-foreground' />}
          title={
            readFilter === 'unread'
              ? 'Đã đọc hết!'
              : readFilter === 'read'
                ? 'Không có thông báo đã đọc'
                : 'Chưa có thông báo'
          }
          description={
            readFilter === 'unread'
              ? 'Bạn đã đọc hết tất cả thông báo. Tuyệt vời!'
              : readFilter === 'read'
                ? 'Bạn chưa đánh dấu thông báo nào là đã đọc.'
                : 'Khi có sự kiện mới từ các tòa nhà, bạn sẽ thấy tại đây.'
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
