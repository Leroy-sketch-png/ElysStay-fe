'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ApiError } from '@/lib/api-client'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry on 4xx client errors (auth, validation, not-found)
          // except 429 Too Many Requests which should be retried with backoff
          if (error instanceof ApiError) {
            const { status } = error
            if (status === 429) return failureCount < 3
            if (status >= 400 && status < 500) return false
          }
          // Retry up to 3 times for server/network errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex, error) => {
          if (error instanceof ApiError && typeof error.retryAfterMs === 'number') {
            return error.retryAfterMs
          }

          return Math.min(1000 * 2 ** attemptIndex, 10000)
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always new client
    return makeQueryClient()
  }
  // Browser: singleton
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient)
  const showDevtools = process.env.NODE_ENV === 'development'

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition='bottom-left' />
      ) : null}
    </QueryClientProvider>
  )
}
