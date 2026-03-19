'use client'

import { useEffect } from 'react'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorState } from '@/components/ErrorState'

/**
 * Dashboard-level error boundary.
 * Catches errors in any dashboard route and renders a recoverable error state
 * within the existing AppShell layout.
 * Integrates with TanStack Query's reset boundary so "Try Again" also
 * clears stale query errors.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { reset: resetQueries } = useQueryErrorResetBoundary()

  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <ErrorState
      title='Đã xảy ra lỗi'
      description={
        error.message || 'Đã xảy ra lỗi không mong muốn khi tải trang này.'
      }
      onRetry={() => {
        resetQueries()
        reset()
      }}
      showHomeLink
    />
  )
}
