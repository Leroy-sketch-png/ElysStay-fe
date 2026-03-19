'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/ErrorState'

/**
 * Dashboard-level error boundary.
 * Catches errors in any dashboard route and renders a recoverable error state
 * within the existing AppShell layout.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <ErrorState
      title='Đã xảy ra lỗi'
      description={
        error.message || 'Đã xảy ra lỗi không mong muốn khi tải trang này.'
      }
      onRetry={reset}
      showHomeLink
    />
  )
}
