'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchDashboard, fetchCurrentUser, userKeys } from '@/lib/queries/users'
import {
  Building2,
  DoorOpen,
  FileText,
  Users,
  AlertTriangle,
  TrendingUp,
  Gauge,
  Receipt,
  Wrench,
  Clock,
  CalendarClock,
} from 'lucide-react'
import { cn, formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import { StaggerContainer, AnimatedCard, PageTransition } from '@/components/Motion'
import type {
  OwnerDashboardDto,
  StaffDashboardDto,
  TenantDashboardDto,
} from '@/types/api'

// ─── Type Guards ────────────────────────────────────────

type DashboardDto = OwnerDashboardDto | StaffDashboardDto | TenantDashboardDto

function isOwnerDashboard(d: DashboardDto): d is OwnerDashboardDto {
  return 'totalBuildings' in d && 'occupancyRate' in d
}

function isStaffDashboard(d: DashboardDto): d is StaffDashboardDto {
  return 'assignedBuildings' in d && 'pendingIssues' in d && !('occupancyRate' in d)
}

function isTenantDashboard(d: DashboardDto): d is TenantDashboardDto {
  return 'unpaidInvoiceCount' in d && !('totalBuildings' in d)
}

// ─── Stat Card ──────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  variant?: 'default' | 'warning' | 'success' | 'destructive'
  href?: string
}

function StatCard({ label, value, icon, trend, variant = 'default', href }: StatCardProps) {
  const variantStyles = {
    default: 'bg-card',
    warning: 'bg-warning/5 border-warning/20',
    success: 'bg-success/5 border-success/20',
    destructive: 'bg-destructive/5 border-destructive/20',
  }

  const content = (
    <div className='flex flex-col'>
      <div className='flex items-center justify-between'>
        <p className='text-sm font-medium text-muted-foreground'>{label}</p>
        <div className='text-muted-foreground'>{icon}</div>
      </div>
      <div className='mt-3'>
        <p className='text-2xl font-bold tracking-tight'>{value}</p>
        {trend && <p className='mt-1 text-xs text-muted-foreground'>{trend}</p>}
      </div>
    </div>
  )

  const className = cn(
    'rounded-lg border p-5 transition-colors duration-150 hover:shadow-md',
    variantStyles[variant],
    href && 'cursor-pointer',
  )

  if (href) {
    return (
      <Link href={href} className={cn(className, 'block no-underline')}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}

// ─── Owner Dashboard ────────────────────────────────────

function OwnerDashboard({ data }: { data: OwnerDashboardDto }) {
  return (
    <StaggerContainer className='grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
      <AnimatedCard>
        <StatCard
          label='Tổng tòa nhà'
          value={data.totalBuildings}
          icon={<Building2 className='size-5' />}
          href='/buildings'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Tổng phòng'
          value={data.totalRooms}
          icon={<DoorOpen className='size-5' />}
          trend={`${data.occupiedRooms} đang thuê`}
          href='/rooms'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Tỷ lệ lấp đầy'
          value={`${Math.round(data.occupancyRate * 100)}%`}
          icon={<TrendingUp className='size-5' />}
          variant={data.occupancyRate >= 0.8 ? 'success' : data.occupancyRate >= 0.5 ? 'default' : 'warning'}
          href='/rooms'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Hợp đồng hiệu lực'
          value={data.activeContracts}
          icon={<FileText className='size-5' />}
          href='/contracts'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Sắp hết hạn (30 ngày)'
          value={data.expiringContracts}
          icon={<Clock className='size-5' />}
          trend={data.expiringContracts > 0 ? 'Hợp đồng hết hạn trong 30 ngày tới' : 'Không có hợp đồng sắp hết hạn'}
          variant={data.expiringContracts > 0 ? 'warning' : 'default'}
          href='/contracts'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Đặt cọc chờ duyệt'
          value={data.pendingReservations}
          icon={<CalendarClock className='size-5' />}
          variant={data.pendingReservations > 0 ? 'default' : 'success'}
          href='/reservations'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Doanh thu tháng'
          value={formatCurrency(data.monthlyRevenue)}
          icon={<TrendingUp className='size-5' />}
          variant='success'
          href='/reports/pnl'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Hóa đơn quá hạn'
          value={data.overdueInvoiceCount}
          icon={<AlertTriangle className='size-5' />}
          trend={data.overdueAmount > 0 ? `${formatCurrency(data.overdueAmount)} tổng` : undefined}
          variant={data.overdueInvoiceCount > 0 ? 'destructive' : 'default'}
          href='/billing/invoices'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Ghi chỉ số chờ'
          value={data.pendingMeterReadings}
          icon={<Gauge className='size-5' />}
          trend={data.pendingMeterReadings > 0 ? 'Phòng chưa ghi tháng này' : undefined}
          variant={data.pendingMeterReadings > 0 ? 'warning' : 'success'}
          href='/billing/meter-readings'
        />
      </AnimatedCard>
    </StaggerContainer>
  )
}

// ─── Staff Dashboard ────────────────────────────────────

function StaffDashboard({ data }: { data: StaffDashboardDto }) {
  return (
    <StaggerContainer className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      <AnimatedCard>
        <StatCard
          label='Tòa nhà phụ trách'
          value={data.assignedBuildings}
          icon={<Building2 className='size-5' />}
          href='/buildings'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Yêu cầu chờ xử lý'
          value={data.pendingIssues}
          icon={<Wrench className='size-5' />}
          variant={data.pendingIssues > 0 ? 'warning' : 'success'}
          href='/maintenance'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Ghi chỉ số chờ'
          value={data.pendingMeterReadings}
          icon={<Gauge className='size-5' />}
          variant={data.pendingMeterReadings > 0 ? 'warning' : 'success'}
          href='/billing/meter-readings'
        />
      </AnimatedCard>
    </StaggerContainer>
  )
}

// ─── Tenant Dashboard ───────────────────────────────────

function TenantDashboard({ data }: { data: TenantDashboardDto }) {
  const isExpiringSoon = (() => {
    if (!data.contractEndDate) return false
    const end = new Date(data.contractEndDate)
    const now = new Date()
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysLeft >= 0 && daysLeft <= 30
  })()

  const isExpired = (() => {
    if (!data.contractEndDate) return false
    return new Date(data.contractEndDate) < new Date()
  })()

  return (
    <div className='space-y-6'>
      {/* Contract expiry warning */}
      {isExpired && (
        <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3'>
          <AlertTriangle className='size-5 text-destructive shrink-0' />
          <p className='text-sm text-destructive font-medium'>Hợp đồng của bạn đã hết hạn. Vui lòng liên hệ chủ nhà để gia hạn.</p>
        </div>
      )}
      {isExpiringSoon && !isExpired && (
        <div className='rounded-lg border border-warning/30 bg-warning/5 p-4 flex items-center gap-3'>
          <Clock className='size-5 text-warning shrink-0' />
          <p className='text-sm text-warning font-medium'>Hợp đồng sắp hết hạn vào {formatDate(data.contractEndDate!)}. Vui lòng liên hệ chủ nhà để gia hạn.</p>
        </div>
      )}

      {/* Room info card */}
      {data.roomNumber && (
        <div className='rounded-lg border bg-card p-6'>
          <h3 className='text-lg font-semibold'>Phòng của bạn</h3>
          <div className='mt-3 grid gap-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Phòng</span>
              <span className='font-medium'>{data.roomNumber}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Tòa nhà</span>
              <span className='font-medium'>{data.buildingName}</span>
            </div>
            {data.contractStatus && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Hợp đồng</span>
                <span className={cn('font-medium', data.contractStatus === 'Active' ? 'text-emerald-600' : 'text-muted-foreground')}>
                  {data.contractStatus === 'Active' ? 'Đang hiệu lực' : 'Đã chấm dứt'}
                </span>
              </div>
            )}
            {data.contractEndDate && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Kết thúc</span>
                <span className={cn('font-medium', isExpiringSoon && 'text-warning', isExpired && 'text-destructive')}>
                  {formatDate(data.contractEndDate)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <StaggerContainer className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <AnimatedCard>
          <StatCard
            label='Hóa đơn chưa thanh toán'
            value={data.unpaidInvoiceCount}
            icon={<Receipt className='size-5' />}
            trend={data.unpaidAmount > 0 ? formatCurrency(data.unpaidAmount) : undefined}
            variant={data.unpaidInvoiceCount > 0 ? 'warning' : 'success'}
            href='/billing/invoices'
          />
        </AnimatedCard>
        <AnimatedCard>
          <StatCard
            label='Yêu cầu đang mở'
            value={data.openIssueCount}
            icon={<Wrench className='size-5' />}
            variant={data.openIssueCount > 0 ? 'warning' : 'default'}
            href='/maintenance'
          />
        </AnimatedCard>
      </StaggerContainer>
    </div>
  )
}

// ─── Dashboard Page ─────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: profile, error: profileError } = useQuery({
    queryKey: userKeys.me(),
    queryFn: fetchCurrentUser,
  })

  const { data: dashboard, isLoading, error: dashboardError } = useQuery({
    queryKey: userKeys.dashboard(),
    queryFn: fetchDashboard,
  })

  const loadError = dashboardError || profileError

  const greeting = getGreeting()
  const displayName = profile?.fullName || user?.fullName || 'there'

  return (
    <PageTransition>
      <PageContainer
        title={`${greeting}, ${displayName}`}
        description={getRoleDescription(user?.roles || [])}
      >
      {isLoading ? (
        <div className='grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-32 rounded-lg' />
          ))}
        </div>
      ) : loadError ? (
        <EmptyState
          icon={<AlertTriangle className='size-8' />}
          title='Không thể tải tổng quan'
          description={loadError instanceof Error ? loadError.message : 'Đã xảy ra lỗi không mong muốn khi tải tổng quan.'}
          actionLabel='Thử lại'
          onAction={() => {
            queryClient.invalidateQueries({ queryKey: userKeys.me() })
            queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
          }}
        />
      ) : dashboard ? (
        <>
          {isOwnerDashboard(dashboard) && <OwnerDashboard data={dashboard} />}
          {isStaffDashboard(dashboard) && <StaffDashboard data={dashboard} />}
          {isTenantDashboard(dashboard) && <TenantDashboard data={dashboard} />}
        </>
      ) : (
        <EmptyState
          icon={<AlertTriangle className='size-8' />}
          title='Chưa có dữ liệu tổng quan'
          description='Tổng quan hiện đang trống. Khi vai trò của bạn có dữ liệu, các thẻ thống kê sẽ xuất hiện tại đây.'
        />
      )}
    </PageContainer>
    </PageTransition>
  )
}

// ─── Helpers ────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function getRoleDescription(roles: string[]): string {
  const lowerRoles = roles.map(r => r.toLowerCase())
  if (lowerRoles.includes('owner')) return 'Tổng quan danh mục bất động sản của bạn'
  if (lowerRoles.includes('staff')) return 'Những việc cần bạn chú ý hôm nay'
  if (lowerRoles.includes('tenant')) return 'Tóm tắt tình trạng thuê của bạn'
  return 'Chào mừng đến với ElysStay'
}
