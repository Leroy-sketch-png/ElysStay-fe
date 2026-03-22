import { http } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationBell } from '@/components/layouts/NotificationBell'
import { apiPagedSuccess, apiSuccess, apiUrl } from '../fixtures/handlers'
import { server } from '../fixtures/server'

function renderNotificationBell() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationBell />
    </QueryClientProvider>,
  )
}

describe('NotificationBell', () => {
  it('shows the unread badge count from the unread query', async () => {
    server.use(
      http.get(apiUrl('/notifications'), ({ request }) => {
        const url = new URL(request.url)
        const isUnreadOnly = url.searchParams.get('isRead') === 'false'

        if (isUnreadOnly) {
          return apiPagedSuccess([{ id: 'n1' }], 1, 1, 2)
        }

        return apiPagedSuccess([
          {
            id: 'n1',
            type: 'ISSUE',
            title: 'Sự cố mới',
            message: 'Có sự cố cần xử lý',
            referenceId: 'issue-1',
            isRead: false,
            createdAt: '2026-03-22T00:00:00Z',
          },
        ])
      }),
    )

    renderNotificationBell()

    const bellButton = await screen.findByRole('button', { name: /thông báo/i })

    await waitFor(() => {
      expect(bellButton).toHaveAttribute('aria-label', '2 thông báo chưa đọc')
    })

    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  it('opens the dropdown and renders notifications', async () => {
    server.use(
      http.get(apiUrl('/notifications'), ({ request }) => {
        const url = new URL(request.url)
        const isUnreadOnly = url.searchParams.get('isRead') === 'false'

        if (isUnreadOnly) {
          return apiPagedSuccess([{ id: 'n1' }], 1, 1, 1)
        }

        return apiPagedSuccess([
          {
            id: 'n1',
            type: 'ISSUE',
            title: 'Sự cố mới',
            message: 'Có sự cố cần xử lý',
            referenceId: 'issue-1',
            isRead: false,
            createdAt: '2026-03-22T00:00:00Z',
          },
        ])
      }),
    )

    renderNotificationBell()
    await userEvent.click(await screen.findByRole('button', { name: /1 thông báo chưa đọc/i }))

    expect(await screen.findByRole('dialog', { name: 'Thông báo' })).toBeInTheDocument()
    expect(screen.getByText('Sự cố mới')).toBeInTheDocument()
  })

  it('shows the empty state when there are no notifications', async () => {
    server.use(
      http.get(apiUrl('/notifications'), () => apiPagedSuccess([], 1, 20, 0)),
    )

    renderNotificationBell()
    await userEvent.click(await screen.findByRole('button', { name: 'Thông báo' }))

    expect(await screen.findByText('Chưa có thông báo nào')).toBeInTheDocument()
  })

  it('marks all notifications as read from the dropdown action', async () => {
    let unreadCount = 2

    server.use(
      http.get(apiUrl('/notifications'), ({ request }) => {
        const url = new URL(request.url)
        const isUnreadOnly = url.searchParams.get('isRead') === 'false'

        if (isUnreadOnly) {
          return apiPagedSuccess(unreadCount > 0 ? [{ id: 'n1' }] : [], 1, 1, unreadCount)
        }

        return apiPagedSuccess(
          unreadCount > 0
            ? [{
                id: 'n1',
                type: 'ISSUE',
                title: 'Sự cố mới',
                message: 'Có sự cố cần xử lý',
                referenceId: 'issue-1',
                isRead: false,
                createdAt: '2026-03-22T00:00:00Z',
              }]
            : [],
          1,
          20,
          unreadCount,
        )
      }),
      http.patch(apiUrl('/notifications/mark-all-read'), () => {
        unreadCount = 0
        return apiSuccess({ markedRead: 2 })
      }),
    )

    renderNotificationBell()
    await userEvent.click(await screen.findByRole('button', { name: /2 thông báo chưa đọc/i }))
    await userEvent.click(await screen.findByRole('button', { name: /Đánh dấu tất cả đã đọc/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Thông báo' })).toBeInTheDocument()
    })
  })
})
