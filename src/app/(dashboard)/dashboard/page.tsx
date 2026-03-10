'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers/AuthProvider'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber } from '@/lib/utils'
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
}

function StatCard({ label, value, icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-card',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',
    success: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
    destructive: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md',
        variantStyles[variant],
      )}
    >
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
}

// ─── Owner Dashboard ────────────────────────────────────

function OwnerDashboard({ data }: { data: OwnerDashboardDto }) {
  return (
    <StaggerContainer className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <AnimatedCard>
        <StatCard
          label='Total Buildings'
          value={data.totalBuildings}
          icon={<Building2 className='size-5' />}
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Total Rooms'
          value={data.totalRooms}
          icon={<DoorOpen className='size-5' />}
          trend={`${data.occupiedRooms} occupied`}
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Occupancy Rate'
          value={`${Math.round(data.occupancyRate * 100)}%`}
          icon={<TrendingUp className='size-5' />}
          variant={data.occupancyRate >= 0.8 ? 'success' : data.occupancyRate >= 0.5 ? 'default' : 'warning'}
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Active Contracts'
          value={data.activeContracts}
          icon={<FileText className='size-5' />}
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Monthly Revenue'
          value={formatCurrency(data.monthlyRevenue)}
          icon={<TrendingUp className='size-5' />}
          variant='success'
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Overdue Invoices'
          value={data.overdueInvoiceCount}
          icon={<AlertTriangle className='size-5' />}
          trend={data.overdueAmount > 0 ? `${formatCurrency(data.overdueAmount)} total` : undefined}
          variant={data.overdueInvoiceCount > 0 ? 'destructive' : 'default'}
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
          label='Assigned Buildings'
          value={data.assignedBuildings}
          icon={<Building2 className='size-5' />}
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Pending Issues'
          value={data.pendingIssues}
          icon={<Wrench className='size-5' />}
          variant={data.pendingIssues > 0 ? 'warning' : 'success'}
        />
      </AnimatedCard>
      <AnimatedCard>
        <StatCard
          label='Pending Meter Readings'
          value={data.pendingMeterReadings}
          icon={<Gauge className='size-5' />}
          variant={data.pendingMeterReadings > 0 ? 'warning' : 'success'}
        />
      </AnimatedCard>
    </StaggerContainer>
  )
}

// ─── Tenant Dashboard ───────────────────────────────────

function TenantDashboard({ data }: { data: TenantDashboardDto }) {
  return (
    <div className='space-y-6'>
      {/* Room info card */}
      {data.roomNumber && (
        <div className='rounded-xl border bg-card p-6'>
          <h3 className='text-lg font-semibold'>Your Room</h3>
          <div className='mt-3 grid gap-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Room</span>
              <span className='font-medium'>{data.roomNumber}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Building</span>
              <span className='font-medium'>{data.buildingName}</span>
            </div>
            {data.contractStatus && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Contract</span>
                <span className='font-medium'>{data.contractStatus}</span>
              </div>
            )}
            {data.contractEndDate && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Ends</span>
                <span className='font-medium'>{new Date(data.contractEndDate).toLocaleDateString('vi-VN')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <StaggerContainer className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <AnimatedCard>
          <StatCard
            label='Unpaid Invoices'
            value={data.unpaidInvoiceCount}
            icon={<Receipt className='size-5' />}
            trend={data.unpaidAmount > 0 ? formatCurrency(data.unpaidAmount) : undefined}
            variant={data.unpaidInvoiceCount > 0 ? 'warning' : 'success'}
          />
        </AnimatedCard>
        <AnimatedCard>
          <StatCard
            label='Open Issues'
            value={data.openIssueCount}
            icon={<Wrench className='size-5' />}
            variant={data.openIssueCount > 0 ? 'warning' : 'default'}
          />
        </AnimatedCard>
      </StaggerContainer>
    </div>
  )
}

// ─── Dashboard Page ─────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: profile } = useQuery({
    queryKey: userKeys.me(),
    queryFn: fetchCurrentUser,
  })

  const { data: dashboard, isLoading } = useQuery({
    queryKey: userKeys.dashboard(),
    queryFn: fetchDashboard,
  })

  const greeting = getGreeting()
  const displayName = profile?.fullName || user?.fullName || 'there'

  return (
    <PageTransition>
      <PageContainer
        title={`${greeting}, ${displayName}`}
        description={getRoleDescription(user?.roles || [])}
      >
      {isLoading ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-32 rounded-xl' />
          ))}
        </div>
      ) : dashboard ? (
        <>
          {isOwnerDashboard(dashboard) && <OwnerDashboard data={dashboard} />}
          {isStaffDashboard(dashboard) && <StaffDashboard data={dashboard} />}
          {isTenantDashboard(dashboard) && <TenantDashboard data={dashboard} />}
        </>
      ) : (
        <div className='rounded-xl border bg-card p-12 text-center'>
          <p className='text-muted-foreground'>Unable to load dashboard data.</p>
        </div>
      )}
    </PageContainer>
    </PageTransition>
  )
}

// ─── Helpers ────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getRoleDescription(roles: string[]): string {
  const lowerRoles = roles.map(r => r.toLowerCase())
  if (lowerRoles.includes('owner')) return 'Here\'s your property portfolio overview'
  if (lowerRoles.includes('staff')) return 'Here\'s what needs your attention today'
  if (lowerRoles.includes('tenant')) return 'Here\'s your rental summary'
  return 'Welcome to ElysStay'
}
