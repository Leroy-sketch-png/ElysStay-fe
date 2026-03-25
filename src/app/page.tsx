'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import {
  Building2,
  Shield,
  BarChart3,
  Clock,
  ChevronRight,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Building2,
    title: 'Quản lý tài sản',
    description: 'Quản lý tòa nhà, phòng và dịch vụ với theo dõi công suất thời gian thực.',
  },
  {
    icon: Shield,
    title: 'Bảo mật nhiều lớp',
    description: 'Phân quyền theo vai trò cho chủ nhà, nhân viên và khách thuê với xác thực doanh nghiệp.',
  },
  {
    icon: BarChart3,
    title: 'Báo cáo tài chính',
    description: 'Theo dõi doanh thu, chi phí và lãi lỗ với hóa đơn tự động.',
  },
  {
    icon: Clock,
    title: 'Tự động thông minh',
    description: 'Tự động lập hóa đơn, gia hạn hợp đồng và theo dõi bảo trì.',
  },
]

export default function HomePage() {
  const { initialized, authenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!initialized) return
    if (authenticated) {
      router.replace('/dashboard')
    }
  }, [initialized, authenticated, router])

  if (!initialized) {
    return (
      <div className='flex h-screen items-center justify-center bg-background'>
        <div className='flex flex-col items-center gap-4'>
          <div className='size-12 rounded-full border-4 border-primary border-t-transparent animate-spin motion-reduce:animate-none' />
          <p className='text-sm text-muted-foreground animate-pulse motion-reduce:animate-none'>Đang tải ElysStay…</p>
        </div>
      </div>
    )
  }

  // Not authenticated — show landing page
  return (
    <div className='min-h-screen bg-background'>
      {/* Hero Section */}
      <div className='relative overflow-hidden'>
        {/* Gradient backdrop */}
        <div
          className='absolute inset-0 -z-10'
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, oklch(0.40 0.17 260) 50%, oklch(0.50 0.18 250) 100%)',
          }}
        />
        {/* Subtle pattern overlay */}
        <div
          className='absolute inset-0 -z-10 opacity-10'
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className='mx-auto max-w-6xl px-6 py-20 sm:py-28 lg:py-36'>
          <div className='text-center'>
            {/* Badge */}
            <div className='mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm'>
              <Building2 className='size-4' />
              Quản lý cho thuê thông minh
            </div>

            {/* Title */}
            <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight'>
              Quản lý
              <br />
              <span className='bg-gradient-to-r from-white/90 via-white to-white/70 bg-clip-text text-transparent'>
                Tài sản thông minh hơn
              </span>
            </h1>

            {/* Subtitle */}
            <p className='mx-auto mt-6 max-w-xl text-lg text-white/80 leading-relaxed'>
              Nền tảng toàn diện cho chủ nhà, nhân viên và khách thuê.
              Tự động lập hóa đơn, theo dõi bảo trì và phát triển kinh doanh.
            </p>

            {/* CTA */}
            <div className='mt-10 flex items-center justify-center'>
              <button
                type='button'
                onClick={() => router.push('/login')}
                className='group relative inline-flex items-center gap-2 rounded-md bg-white px-8 py-3.5 text-sm font-semibold text-primary shadow-lg transition-colors duration-150 hover:shadow-xl cursor-pointer'
              >
                Đăng nhập
                <ChevronRight className='size-4 transition-transform motion-reduce:transition-none group-hover:translate-x-0.5' />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className='absolute bottom-0 left-0 right-0'>
          <svg viewBox='0 0 1440 80' fill='none' xmlns='http://www.w3.org/2000/svg' className='w-full'>
            <path d='M0 80L48 74.7C96 69 192 59 288 48C384 37 480 27 576 32C672 37 768 59 864 64C960 69 1056 59 1152 48C1248 37 1344 27 1392 21.3L1440 16V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z' fill='var(--background)' />
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <section className='mx-auto max-w-6xl px-6 py-16 sm:py-24'>
        <div className='text-center mb-12'>
          <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>
            Tất cả những gì bạn cần để
            <span className='text-primary'> vận hành tài sản</span>
          </h2>
          <p className='mt-3 text-muted-foreground max-w-lg mx-auto'>
            Từ tiếp nhận khách thuê đến báo cáo tài chính — một nền tảng cho toàn bộ quy trình.
          </p>
        </div>

        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className='group rounded-lg border bg-card p-6 transition-colors duration-150 hover:shadow-md hover:border-primary/20'
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className='mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary/15 transition-colors'>
                <feature.icon className='size-6' />
              </div>
              <h3 className='text-lg font-semibold mb-2'>{feature.title}</h3>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t bg-card'>
        <div className='mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <Building2 className='size-5 text-primary' />
            <span className='font-semibold'>ElysStay</span>
          </div>
          <p className='text-sm text-muted-foreground'>
            © {new Date().getFullYear()} ElysStay. Quản lý cho thuê thông minh.
          </p>
        </div>
      </footer>
    </div>
  )
}
