'use client'

/**
 * Root-level error boundary for the entire application.
 * This catches errors in the root layout itself.
 * Must render its own <html> and <body> since the root layout may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang='en'>
      <body className='antialiased bg-background text-foreground'>
        <div className='flex min-h-screen flex-col items-center justify-center px-4 py-16'>
          <div className='mx-auto max-w-md text-center'>
            <div className='mb-6 flex justify-center'>
              <div className='rounded-full bg-red-100 p-6 dark:bg-red-950/30'>
                <svg
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth={2}
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='size-10 text-red-600 dark:text-red-400'
                >
                  <path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' />
                  <path d='M12 9v4' />
                  <path d='M12 17h.01' />
                </svg>
              </div>
            </div>

            <h1 className='mb-2 text-xl font-bold tracking-tight'>
              Something went seriously wrong
            </h1>
            <p className='mb-8 text-sm text-muted-foreground'>
              A critical error occurred. Please try refreshing the page.
            </p>

            <div className='flex flex-wrap items-center justify-center gap-3'>
              <button
                onClick={reset}
                className='inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors'
              >
                Try Again
              </button>
              <a
                href='/dashboard'
                className='inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground hover:bg-accent transition-colors'
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
