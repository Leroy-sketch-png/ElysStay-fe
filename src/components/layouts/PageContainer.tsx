import { cn } from '@/lib/utils'
import { SECTION_SPACING } from '@/lib/layout-constants'
import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  /** Page title shown at the top */
  title?: string
  /** Optional description below the title */
  description?: string
  /** Action buttons area (top-right) */
  actions?: ReactNode
  /** Breadcrumb navigation rendered above the title */
  breadcrumbs?: ReactNode
  /** Additional className */
  className?: string
  /** Use compact spacing */
  compact?: boolean
}

export function PageContainer({
  children,
  title,
  description,
  actions,
  breadcrumbs,
  className,
  compact = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        SECTION_SPACING.pagePadding,
        compact ? 'py-4 md:py-6' : SECTION_SPACING.contentPadding,
        'mx-auto w-full max-w-7xl',
        className,
      )}
    >
      {breadcrumbs}
      {(title || actions) && (
        <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
          <div className='min-w-0'>
            {title && <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>}
            {description && (
              <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
            )}
          </div>
          {actions && <div className='flex flex-wrap items-center gap-2 shrink-0'>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
