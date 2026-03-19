import { ErrorState } from '@/components/ErrorState'

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-background'>
      <ErrorState
        statusCode={404}
        title='Không tìm thấy trang'
        description='Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.'
        showHomeLink
      />
    </div>
  )
}
