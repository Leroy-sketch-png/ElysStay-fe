'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

/**
 * Breadcrumb navigation with proper ARIA markup.
 * The last item is always the current page (no link).
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label='Breadcrumb' className={cn('mb-4', className)}>
      <ol className='flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground'>
        {/* Home */}
        <li className='flex items-center'>
          <Link
            href='/dashboard'
            className='flex items-center hover:text-foreground transition-colors'
          >
            <Home className='size-3.5' />
            <span className='sr-only'>Trang chủ</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className='flex items-center gap-1.5'>
              <ChevronRight className='size-3 text-muted-foreground/50' aria-hidden='true' />
              {isLast || !item.href ? (
                <span
                  className='font-medium text-foreground truncate max-w-[200px]'
                  aria-current='page'
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className='hover:text-foreground transition-colors truncate max-w-[200px]'
                  title={item.label}
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
