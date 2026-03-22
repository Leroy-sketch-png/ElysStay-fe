import { http, HttpResponse } from 'msw'
import { setTokenAccessor } from '@/lib/api-client'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/queries/notifications'
import { apiPagedSuccess, apiSuccess, apiUrl } from '../fixtures/handlers'
import { server } from '../fixtures/server'

beforeAll(() => setTokenAccessor(() => 'test-jwt-token'))

describe('notifications queries', () => {
  it('fetchNotifications applies default pagination values', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/notifications'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchNotifications()

    expect(capturedUrl).not.toBeNull()
    expect(capturedUrl!.searchParams.get('page')).toBe('1')
    expect(capturedUrl!.searchParams.get('pageSize')).toBe('20')
  })

  it('fetchNotifications includes isRead when provided', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get(apiUrl('/notifications'), ({ request }) => {
        capturedUrl = new URL(request.url)
        return apiPagedSuccess([])
      }),
    )

    await fetchNotifications({ isRead: false, page: 1, pageSize: 1 })

    expect(capturedUrl).not.toBeNull()
    expect(capturedUrl!.searchParams.get('isRead')).toBe('false')
  })

  it('markNotificationRead calls PATCH /notifications/:id/read', async () => {
    let called = false
    server.use(
      http.patch(apiUrl('/notifications/notif-1/read'), () => {
        called = true
        return HttpResponse.json({ success: true })
      }),
    )

    await markNotificationRead('notif-1')
    expect(called).toBe(true)
  })

  it('markAllNotificationsRead returns the number of notifications marked', async () => {
    server.use(
      http.patch(apiUrl('/notifications/mark-all-read'), () => apiSuccess({ markedRead: 4 })),
    )

    const result = await markAllNotificationsRead()
    expect(result.markedRead).toBe(4)
  })
})
