'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, FileText, CalendarDays, DollarSign, Users, BadgeCheck, Clock,
  AlertTriangle, Pencil, Ban, RefreshCw, Building2, Receipt,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ContractStatusBadge, DepositStatusBadge } from '@/components/ui/status-badge'
import { formatDate, formatCurrency, toLocalDateInputValue } from '@/lib/utils'
import { contractKeys, fetchContractById } from '@/lib/queries/contracts'
import { ContractTenantsSection } from './contract-tenants-section'
import { EditContractDialog } from './edit-contract-dialog'
import { TerminateContractDialog } from './terminate-contract-dialog'
import { RenewContractDialog } from './renew-contract-dialog'

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [terminateOpen, setTerminateOpen] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)

  const { data: contract, isLoading, error } = useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: () => fetchContractById(id),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <PageContainer>
        <div className='space-y-6'>
          <Skeleton className='h-8 w-64' />
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <Skeleton className='h-24 rounded-lg' />
            <Skeleton className='h-24 rounded-lg' />
            <Skeleton className='h-24 rounded-lg' />
            <Skeleton className='h-24 rounded-lg' />
          </div>
          <Skeleton className='h-48 rounded-lg' />
        </div>
      </PageContainer>
    )
  }

  if (error || !contract) {
    return (
      <PageContainer>
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <FileText className='size-12 text-muted-foreground mb-4' />
          <h2 className='text-lg font-semibold'>Không tìm thấy hợp đồng</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Hợp đồng này có thể đã bị xóa hoặc bạn không có quyền truy cập.
          </p>
          <Button variant='outline' className='mt-4' onClick={() => router.push('/contracts')}>
            <ArrowLeft className='size-4' />
            Quay lại Hợp đồng
          </Button>
        </div>
      </PageContainer>
    )
  }

  const isActive = contract.status === 'Active'
  const [endYear, endMonth, endDay] = contract.endDate.split('-').map(Number)
  const contractEndDate = new Date(endYear, endMonth - 1, endDay)
  const today = new Date(toLocalDateInputValue())
  const daysUntilEnd = Math.ceil(
    (contractEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )
  const isExpiringSoon = isActive && daysUntilEnd <= 30 && daysUntilEnd > 0
  const isExpired = isActive && daysUntilEnd <= 0

  return (
    <PageContainer
      title={`Hợp đồng — Phòng ${contract.roomNumber}`}
      description={`${contract.buildingName} • ${contract.tenantName}`}
      breadcrumbs={<Breadcrumbs items={[{ label: 'Hợp đồng', href: '/contracts' }, { label: `Phòng ${contract.roomNumber}` }]} />}
      actions={
        <div className='flex items-center gap-2 flex-wrap'>
          <Button variant='outline' onClick={() => router.push('/contracts')}>
            <ArrowLeft className='size-4' />
            Quay lại
          </Button>
          {isActive && (
            <>
              <Button variant='outline' onClick={() => setEditOpen(true)}>
                <Pencil className='size-4' />
                Sửa
              </Button>
              <Button variant='outline' onClick={() => setRenewOpen(true)}>
                <RefreshCw className='size-4' />
                Gia hạn
              </Button>
              <Button variant='destructive' onClick={() => setTerminateOpen(true)}>
                <Ban className='size-4' />
                Chấm dứt
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* Expiry Warning */}
      {isExpiringSoon && (
        <div className='mb-6 flex items-center gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4'>
          <AlertTriangle className='size-5 text-warning shrink-0' />
          <p className='text-sm font-medium text-warning'>
            Hợp đồng sẽ hết hạn sau {daysUntilEnd} ngày{daysUntilEnd !== 1 ? '' : ''}.
            Hãy cân nhắc gia hạn hoặc chấm dứt hợp đồng.
          </p>
        </div>
      )}

      {isExpired && isActive && (
        <div className='mb-6 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4'>
          <AlertTriangle className='size-5 text-destructive shrink-0' />
          <p className='text-sm font-medium text-destructive'>
            Hợp đồng đã quá ngày kết thúc. Vui lòng gia hạn hoặc chấm dứt.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-primary/10 p-2.5'>
              <BadgeCheck className='size-5 text-primary' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Trạng thái</p>
              <div className='mt-0.5'><ContractStatusBadge status={contract.status} /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-success/10 p-2.5'>
              <DollarSign className='size-5 text-success' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Tiền thuê/tháng</p>
              <p className='text-xl font-bold'>{formatCurrency(contract.monthlyRent)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-info/10 p-2.5'>
              <DollarSign className='size-5 text-info' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Tiền cọc</p>
              <div>
                <p className='text-xl font-bold'>{formatCurrency(contract.depositAmount)}</p>
                <DepositStatusBadge status={contract.depositStatus} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-warning/10 p-2.5'>
              <CalendarDays className='size-5 text-warning' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Thời hạn hợp đồng</p>
              <p className='text-sm font-semibold'>
                {formatDate(contract.startDate)} — {formatDate(contract.endDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Info Grid */}
      <div className='grid gap-6 lg:grid-cols-2 mb-6'>
        {/* Property & Tenant */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Building2 className='size-4' />
              Tài sản & Khách thuê
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <InfoRow label='Tòa nhà'>
              <Link href={`/buildings/${contract.buildingId}`} className='text-sm font-medium hover:underline'>
                {contract.buildingName}
              </Link>
            </InfoRow>
            <InfoRow label='Phòng'>
              <Link href={`/rooms/${contract.roomId}`} className='text-sm font-medium hover:underline'>
                {contract.roomNumber}
              </Link>
            </InfoRow>
            <InfoRow label='Khách thuê chính'>
              <Link href={`/tenants/${contract.tenantUserId}`} className='text-sm font-medium hover:underline'>
                {contract.tenantName}
              </Link>
            </InfoRow>
            <InfoRow label='Ngày dọn vào' value={formatDate(contract.moveInDate)} />
          </CardContent>
        </Card>

        {/* Contract Terms */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Clock className='size-4' />
              Điều khoản hợp đồng
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <InfoRow label='Ngày bắt đầu' value={formatDate(contract.startDate)} />
            <InfoRow label='Ngày kết thúc' value={formatDate(contract.endDate)} />
            <InfoRow label='Tiền thuê/tháng' value={formatCurrency(contract.monthlyRent)} />
            <InfoRow label='Tiền cọc' value={formatCurrency(contract.depositAmount)} />
            <InfoRow label='Ngày tạo' value={formatDate(contract.createdAt)} />
            {contract.note && <InfoRow label='Ghi chú' value={contract.note} />}
          </CardContent>
        </Card>

        {/* Termination Details (if terminated) */}
        {contract.status === 'Terminated' && (
          <Card className='lg:col-span-2 border-destructive/30'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base text-destructive'>
                <Ban className='size-4' />
                Chi tiết chấm dứt
              </CardTitle>
              <CardDescription>
                Hợp đồng đã được chấm dứt vào {formatDate(contract.terminationDate ?? '')}.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {contract.terminationDate && (
                <InfoRow label='Ngày chấm dứt' value={formatDate(contract.terminationDate)} />
              )}
              {contract.terminationNote && (
                <InfoRow label='Lý do / Ghi chú' value={contract.terminationNote} />
              )}
              <InfoRow
                label='Số tiền hoàn'
                value={contract.refundAmount != null ? formatCurrency(contract.refundAmount) : '—'}
              />
              <InfoRow label='Trạng thái cọc'>
                <DepositStatusBadge status={contract.depositStatus} />
              </InfoRow>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tenants / Roommates */}
      <ContractTenantsSection
        contractId={id}
        tenants={contract.tenants}
        isActive={isActive}
      />

      {/* Invoice History Link */}
      <Card className='mt-6'>
        <CardContent className='flex items-center justify-between p-5'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-info/10 p-2.5'>
              <Receipt className='size-5 text-info' />
            </div>
            <div>
              <p className='font-medium text-sm'>Lịch sử hóa đơn</p>
              <p className='text-sm text-muted-foreground'>Xem tất cả hóa đơn của hợp đồng này</p>
            </div>
          </div>
          <Button variant='outline' size='sm' asChild>
            <Link href={`/billing/invoices?contractId=${id}`}>
              Xem hóa đơn
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {isActive && (
        <>
          <EditContractDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            contract={contract}
          />
          <TerminateContractDialog
            open={terminateOpen}
            onOpenChange={setTerminateOpen}
            contract={contract}
          />
          <RenewContractDialog
            open={renewOpen}
            onOpenChange={setRenewOpen}
            contract={contract}
          />
        </>
      )}
    </PageContainer>
  )
}

// ─── Helper ─────────────────────────────────────────────

function InfoRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className='flex items-start justify-between gap-4'>
      <span className='text-sm text-muted-foreground shrink-0'>{label}</span>
      {children ?? <span className='text-sm font-medium text-right'>{value}</span>}
    </div>
  )
}
