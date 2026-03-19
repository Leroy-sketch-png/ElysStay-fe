'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import {
  notificationKeys,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/queries/notifications'
import type { NotificationDto } from '@/types/api'

// ─── Notification Item ──────────────────────────────────

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationDto
  onMarkRead: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 border-b last:border-b-0 transition-colors',
        !notification.isRead && 'bg-primary/5',
      )}
    >
      {/* Unread dot */}
      <div className='mt-1.5 shrink-0'>
        {!notification.isRead ? (
          <div className='size-2 rounded-full bg-primary' />
        ) : (
          <div className='size-2' />
        )}
      </div>

      <div className='flex-1 min-w-0'>
        <p className={cn('text-sm', !notification.isRead && 'font-semibold')}>
          {notification.title}
        </p>
        <p className='text-xs text-muted-foreground mt-0.5 line-clamp-2'>
          {notification.message}
        </p>
        <p className='text-xs text-muted-foreground mt-1'>{timeAgo(notification.createdAt)}</p>
      </div>

      {!notification.isRead && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMarkRead(notification.id)
          }}
          className='shrink-0 p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer'
          title='Mark as read'
        >
          <Check className='size-3.5' />
        </button>
      )}
    </div>
  )
}

// ─── NotificationBell ───────────────────────────────────

export function NotificationBell() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // ─── Query ──────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: notificationKeys.list({ page: 1, pageSize: 20 }),
    queryFn: () => fetchNotifications({ page: 1, pageSize: 20 }),
    refetchInterval: 30_000, // poll every 30s
  })

  // Separate query for unread count — not bounded by page size
  const { data: unreadData } = useQuery({
    queryKey: notificationKeys.list({ page: 1, pageSize: 1, isRead: false }),
    queryFn: () => fetchNotifications({ page: 1, pageSize: 1, isRead: false }),
    refetchInterval: 30_000,
  })

  const notifications = data?.data ?? []
  const unreadCount = unreadData?.pagination?.totalItems ?? notifications.filter((n) => !n.isRead).length

  // ─── Mutations ──────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })

  // ─── Click outside ─────────────────────────────────────
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node) &&
      !buttonRef.current?.contains(e.target as Node)
    ) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  // ─── Keyboard ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div className='relative'>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className='relative p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-haspopup='true'
        aria-expanded={open}
      >
        <Bell className='size-5' />
        {unreadCount > 0 && (
          <span className='absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          role='dialog'
          aria-label='Notifications'
          className='absolute right-0 top-full mt-2 w-80 rounded-lg border bg-popover shadow-lg overflow-hidden'
          style={{ zIndex: 50 }}
        >
          {/* Header */}
          <div className='flex items-center justify-between border-b px-4 py-3'>
            <h3 className='text-sm font-semibold'>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className='flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer disabled:opacity-50'
              >
                <CheckCheck className='size-3.5' />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className='max-h-80 overflow-y-auto'>
            {isLoading ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2 className='size-5 animate-spin text-muted-foreground' />
              </div>
            ) : notifications.length === 0 ? (
              <div className='py-8 text-center'>
                <Bell className='mx-auto size-6 text-muted-foreground/50' />
                <p className='mt-2 text-sm text-muted-foreground'>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className='border-t px-4 py-2 text-center'>
              <Link
                href='/notifications'
                onClick={() => setOpen(false)}
                className='text-xs font-medium text-primary hover:underline'
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
