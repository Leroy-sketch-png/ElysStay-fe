'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  className?: string
  pageSizeOptions?: number[]
}

function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  className,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  if (totalItems === 0) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className='flex items-center gap-4'>
        <p className='text-sm text-muted-foreground'>
          Hiển thị <span className='font-medium text-foreground'>{start}</span>
          {' '}đến{' '}
          <span className='font-medium text-foreground'>{end}</span>
          {' '}trong{' '}
          <span className='font-medium text-foreground'>{totalItems}</span> kết quả
        </p>
        {onPageSizeChange && (
          <div className='flex items-center gap-2'>
            <span className='text-sm text-muted-foreground'>mỗi trang</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className='h-8 rounded-md border border-input bg-transparent px-2 text-sm'
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className='flex items-center gap-1'>
        <Button
          variant='outline'
          size='icon'
          className='size-8'
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          aria-label='Trang đầu'
        >
          <ChevronsLeft className='size-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          className='size-8'
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label='Trang trước'
        >
          <ChevronLeft className='size-4' />
        </Button>

        {getPageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className='px-1 text-sm text-muted-foreground'>
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size='icon'
              className='size-8'
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant='outline'
          size='icon'
          className='size-8'
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label='Trang sau'
        >
          <ChevronRight className='size-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          className='size-8'
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          aria-label='Trang cuối'
        >
          <ChevronsRight className='size-4' />
        </Button>
      </div>
    </div>
  )
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = []

  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total)
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }

  return pages
}

export { Pagination }
