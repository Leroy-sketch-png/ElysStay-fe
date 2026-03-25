'use client'

import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Zap, Crown, Shield, User } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { cn } from '@/lib/utils'

const RETURN_TO_KEY = '__elysstay_return_to__'

function consumeReturnTo(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_TO_KEY)
    sessionStorage.removeItem(RETURN_TO_KEY)
    return path
  } catch {
    return null
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Dev Quick Login ────────────────────────────────────

const DEV_ACCOUNTS = [
  { email: 'demo-owner@elysstay.com', label: 'Chủ nhà', name: 'Nguyễn Văn An', icon: Crown, color: 'text-amber-500' },
  { email: 'demo-staff@elysstay.com', label: 'Nhân viên', name: 'Trần Thị Bình', icon: Shield, color: 'text-blue-500' },
  { email: 'demo-tenant1@elysstay.com', label: 'Khách thuê', name: 'Lê Hoàng Cường', icon: User, color: 'text-emerald-500' },
] as const

const DEV_PASSWORD = 'Demo@123'

function DevQuickLogin({ onLogin, disabled }: { onLogin: (email: string, password: string) => void; disabled: boolean }) {
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null)

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className='space-y-3'
    >
      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs'>
          <span className='bg-background px-3 text-muted-foreground flex items-center gap-1.5'>
            <Zap className='size-3' />
            Dev Quick Login
          </span>
        </div>
      </div>

      <div className='grid gap-2'>
        {DEV_ACCOUNTS.map((account) => {
          const Icon = account.icon
          const isLogging = loggingInAs === account.email
          return (
            <button
              key={account.email}
              type='button'
              disabled={disabled || loggingInAs !== null}
              onClick={() => {
                setLoggingInAs(account.email)
                onLogin(account.email, DEV_PASSWORD)
              }}
              className={cn(
                'group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                'hover:bg-accent/50 hover:border-border/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-50',
                'cursor-pointer',
              )}
            >
              <div className={cn('flex size-8 items-center justify-center rounded-full bg-muted', account.color)}>
                {isLogging ? (
                  <div className='size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin' />
                ) : (
                  <Icon className='size-3.5' />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='font-medium truncate'>{account.name}</div>
                <div className='text-xs text-muted-foreground truncate'>{account.label} · {account.email}</div>
              </div>
              <ArrowRight className='size-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0' />
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

export default function LoginPage() {
  const { initialized, authenticated, loginWithPassword, authError: providerError } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  // Redirect to dashboard (or return-to path) if already authenticated
  useEffect(() => {
    if (initialized && authenticated) {
      const returnTo = consumeReturnTo()
      router.replace(returnTo || '/dashboard')
    }
  }, [initialized, authenticated, router])

  // Auto-focus email input
  useEffect(() => {
    if (initialized && !authenticated) {
      emailRef.current?.focus()
    }
  }, [initialized, authenticated])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Địa chỉ email không hợp lệ.')
      return
    }

    setLoading(true)
    try {
      const result = await loginWithPassword(trimmedEmail, password)
      if (!result.success) {
        setError(result.error)
      }
      // On success, AuthProvider will set authenticated=true → useEffect redirects  
    } finally {
      setLoading(false)
    }
  }

  // Show full-screen loader while auth is initializing
  if (!initialized) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <motion.div
          className='flex flex-col items-center gap-4'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className='size-10 rounded-full border-[3px] border-primary border-t-transparent animate-spin motion-reduce:animate-none' />
          <p className='text-sm text-muted-foreground'>Đang kiểm tra xác thực...</p>
        </motion.div>
      </div>
    )
  }

  // Already authenticated — redirecting
  if (authenticated) return null

  const displayError = error || providerError

  return (
    <div className='flex min-h-screen'>
      {/* ─── Left: Login Form ──────────────────────────────── */}
      <div className='flex w-full items-center justify-center px-6 py-12 md:w-1/2'>
        <motion.div
          className='w-full max-w-[420px] space-y-8'
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Brand */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2.5 mb-8'>
              <div className='flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
                <Building2 className='size-5' />
              </div>
              <span className='text-xl font-bold tracking-tight'>ElysStay</span>
            </div>

            <h1 className='text-2xl font-bold tracking-tight'>Đăng nhập</h1>
            <p className='text-sm text-muted-foreground'>
              Nhập thông tin đăng nhập để truy cập hệ thống quản lý.
            </p>
          </div>

          {/* Error Alert */}
          <AnimatePresence mode='wait'>
            {displayError && (
              <motion.div
                id='login-error'
                role='alert'
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2 }}
                className='flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3'
              >
                <AlertCircle className='mt-0.5 size-4 shrink-0 text-destructive' />
                <p className='text-sm text-destructive'>{displayError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className='space-y-5' noValidate>
            {/* Email */}
            <div className='space-y-2'>
              <label htmlFor='email' className='text-sm font-medium leading-none'>
                Email
              </label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                <input
                  ref={emailRef}
                  id='email'
                  name='email'
                  type='email'
                  autoComplete='email'
                  required
                  aria-required='true'
                  aria-describedby={displayError ? 'login-error' : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='name@example.com'
                  disabled={loading}
                  className={cn(
                    'flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-sm shadow-sm transition-colors',
                    'placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className='space-y-2'>
              <label htmlFor='password' className='text-sm font-medium leading-none'>
                Mật khẩu
              </label>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                <input
                  id='password'
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='current-password'
                  required
                  aria-required='true'
                  aria-describedby={displayError ? 'login-error' : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='••••••••'
                  disabled={loading}
                  className={cn(
                    'flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-10 py-2 text-sm shadow-sm transition-colors',
                    'placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground hover:scale-110 transition-all cursor-pointer'
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type='submit'
              disabled={loading}
              aria-busy={loading || undefined}
              className={cn(
                'group relative flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-all duration-150',
                'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-60',
                loading ? 'cursor-not-allowed' : 'cursor-pointer',
              )}
            >
              {loading ? (
                <>
                  <div className='size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin motion-reduce:animate-none' aria-hidden='true' />
                  <span className='sr-only'>Đang đăng nhập</span>
                  <span>Đang đăng nhập…</span>
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className='size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none' />
                </>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className='text-center text-xs text-muted-foreground'>
            Liên hệ quản trị viên nếu bạn chưa có tài khoản.
          </p>

          {/* Dev-only quick login */}
          <DevQuickLogin
            onLogin={async (email, password) => {
              setError(null)
              setLoading(true)
              setEmail(email)
              setPassword('')
              try {
                const result = await loginWithPassword(email, password)
                if (!result.success) setError(result.error)
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
          />
        </motion.div>
      </div>

      {/* ─── Right: Decorative Panel ──────────────────────── */}
      <div className='hidden md:block md:w-1/2'>
        <div className='relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70'>
          {/* Geometric pattern */}
          <div className='absolute inset-0 opacity-[0.07]' aria-hidden='true'>
            <svg className='size-full' xmlns='http://www.w3.org/2000/svg'>
              <defs>
                <pattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'>
                  <circle cx='20' cy='20' r='1.5' fill='white' />
                </pattern>
              </defs>
              <rect width='100%' height='100%' fill='url(#grid)' />
            </svg>
          </div>

          {/* Floating orbs */}
          <div className='absolute -top-20 -right-20 size-64 rounded-full bg-white/10 blur-3xl' />
          <div className='absolute -bottom-32 -left-16 size-80 rounded-full bg-white/5 blur-3xl' />

          {/* Content */}
          <motion.div
            className='relative z-10 max-w-md px-12 text-center text-white'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className='mx-auto mb-8 flex size-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm'>
              <Building2 className='size-10' />
            </div>

            <h2 className='text-3xl font-bold tracking-tight leading-tight'>
              Quản lý tài sản<br />thông minh hơn
            </h2>

            <p className='mt-4 text-base text-white/80 leading-relaxed'>
              Nền tảng toàn diện cho chủ nhà, nhân viên và khách thuê.
              Tự động hoá quy trình — từ hóa đơn đến bảo trì.
            </p>

            {/* Stats row */}
            <div className='mt-10 grid grid-cols-3 gap-4'>
              {[
                { value: '17', label: 'Tòa nhà' },
                { value: '99%', label: 'Uptime' },
                { value: '24/7', label: 'Hỗ trợ' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className='rounded-xl bg-white/10 px-3 py-4 backdrop-blur-sm'
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                >
                  <div className='text-2xl font-bold'>{stat.value}</div>
                  <div className='mt-1 text-xs text-white/70'>{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
