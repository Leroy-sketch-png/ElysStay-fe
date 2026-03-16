'use client'

/**
 * Root-level error boundary for the entire application.
 * This catches errors in the root layout itself.
 * Must render its own <html> and <body> since the root layout may have failed.
 * CRITICAL: Cannot import globals.css — CSS vars are unavailable here.
 * Uses inline styles to guarantee visibility.
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
      <body style={{
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#0f0f14',
        color: '#e4e4e7',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ maxWidth: 400, textAlign: 'center', padding: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            backgroundColor: 'rgba(239,68,68,0.15)', margin: '0 auto 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='#ef4444'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
              style={{ width: 32, height: 32 }}
            >
              <path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' />
              <path d='M12 9v4' />
              <path d='M12 17h.01' />
            </svg>
          </div>

          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Something went seriously wrong
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '2rem' }}>
            A critical error occurred. Please try refreshing the page.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.25rem', borderRadius: 8,
                backgroundColor: '#6366f1', color: 'white', fontWeight: 600,
                fontSize: '0.875rem', border: 'none', cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <a
              href='/dashboard'
              style={{
                padding: '0.625rem 1.25rem', borderRadius: 8,
                backgroundColor: 'transparent', color: '#e4e4e7', fontWeight: 600,
                fontSize: '0.875rem', border: '1px solid #3f3f46', textDecoration: 'none',
              }}
            >
              Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
