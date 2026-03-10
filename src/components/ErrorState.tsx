'use client'

import { AlertTriangle, Home, RefreshCw, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  /** Title displayed prominently */
  title?: string
  /** Description text below the title */
  description?: string
  /** Status code to display (e.g. 404, 500) */
  statusCode?: number
  /** Called when the user clicks "Try Again" */
  onRetry?: () => void
  /** Called when the user clicks "Go Back" */
  onBack?: () => void
  /** Whether to show a "Go Home" link */
  showHomeLink?: boolean
  /** Additional className for the outer wrapper */
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  statusCode,
  onRetry,
  onBack,
  showHomeLink = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[60vh] flex-col items-center justify-center px-4 py-16',
        className,
      )}
    >
      <div className='mx-auto max-w-md text-center'>
        {/* Icon */}
        <div className='mb-6 flex justify-center'>
          <div className='rounded-full bg-destructive/10 p-6'>
            <AlertTriangle className='size-10 text-destructive' />
          </div>
        </div>

        {/* Status code */}
        {statusCode && (
          <p className='mb-2 text-5xl font-black tracking-tighter text-muted-foreground/40'>
            {statusCode}
          </p>
        )}

        {/* Text */}
        <h2 className='mb-2 text-xl font-bold tracking-tight'>{title}</h2>
        <p className='mb-8 text-sm leading-relaxed text-muted-foreground'>
          {description}
        </p>

        {/* Actions */}
        <div className='flex flex-wrap items-center justify-center gap-3'>
          {onRetry && (
            <Button onClick={onRetry} size='sm'>
              <RefreshCw className='size-4' />
              Try Again
            </Button>
          )}
          {onBack && (
            <Button variant='outline' size='sm' onClick={onBack}>
              <ArrowLeft className='size-4' />
              Go Back
            </Button>
          )}
          {showHomeLink && (
            <Button variant='ghost' size='sm' asChild>
              <a href='/dashboard'>
                <Home className='size-4' />
                Dashboard
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
