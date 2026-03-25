import { AlertTriangle, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-background'>
      <div className='mx-auto max-w-md text-center px-4'>
        <div className='mb-6 flex justify-center'>
          <div className='rounded-full bg-destructive/10 p-6'>
            <AlertTriangle className='size-10 text-destructive' />
          </div>
        </div>
        <p className='mb-2 text-5xl font-black tracking-tighter text-muted-foreground/40'>
          404
        </p>
        <h1 className='mb-2 text-xl font-bold tracking-tight'>Không tìm thấy trang</h1>
        <p className='mb-8 text-sm leading-relaxed text-muted-foreground'>
          Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
        </p>
        <a
          href='/dashboard'
          className='inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
        >
          <Home className='size-4' />
          Tổng quan
        </a>
      </div>
    </div>
  )
}
