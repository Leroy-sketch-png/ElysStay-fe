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
    // TODO: report to error tracking service (e.g. Sentry)
  }, [error])

  return (
    <ErrorState
      title='Something went wrong'
      description={
        error.message || 'An unexpected error occurred while loading this page.'
      }
      onRetry={reset}
      showHomeLink
    />
  )
}
