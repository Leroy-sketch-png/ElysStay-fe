import { ErrorState } from '@/components/ErrorState'

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-background'>
      <ErrorState
        statusCode={404}
        title='Page not found'
        description="The page you're looking for doesn't exist or has been moved."
        showHomeLink
      />
    </div>
  )
}
