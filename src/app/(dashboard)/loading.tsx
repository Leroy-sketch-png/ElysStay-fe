import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className='p-6 space-y-6'>
      {/* Page header skeleton */}
      <div className='space-y-2'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-4 w-72' />
      </div>

      {/* Stats grid skeleton */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-28 rounded-lg' />
        ))}
      </div>

      {/* Content area skeleton */}
      <div className='space-y-3'>
        <Skeleton className='h-10 w-full' />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className='h-14 w-full' />
        ))}
      </div>
    </div>
  )
}
