'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, FileText, CalendarDays, DollarSign, Users, BadgeCheck, Clock,
  AlertTriangle, Pencil, Ban, RefreshCw, Building2,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ContractStatusBadge, DepositStatusBadge } from '@/components/ui/status-badge'
import { formatDate, formatCurrency } from '@/lib/utils'
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
            <Skeleton className='h-24 rounded-xl' />
            <Skeleton className='h-24 rounded-xl' />
            <Skeleton className='h-24 rounded-xl' />
            <Skeleton className='h-24 rounded-xl' />
          </div>
          <Skeleton className='h-48 rounded-xl' />
        </div>
      </PageContainer>
    )
  }

  if (error || !contract) {
    return (
      <PageContainer>
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <FileText className='size-12 text-muted-foreground mb-4' />
          <h2 className='text-lg font-semibold'>Contract not found</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            This contract may have been deleted or you don&apos;t have access.
          </p>
          <Button variant='outline' className='mt-4' onClick={() => router.push('/contracts')}>
            <ArrowLeft className='size-4' />
            Back to Contracts
          </Button>
        </div>
      </PageContainer>
    )
  }

  const isActive = contract.status === 'Active'
  const daysUntilEnd = Math.ceil(
    (new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
  const isExpiringSoon = isActive && daysUntilEnd <= 30 && daysUntilEnd > 0
  const isExpired = isActive && daysUntilEnd <= 0

  return (
    <PageContainer
      title={`Contract — Room ${contract.roomNumber}`}
      description={`${contract.buildingName} • ${contract.tenantName}`}
      actions={
        <div className='flex items-center gap-2 flex-wrap'>
          <Button variant='outline' onClick={() => router.push('/contracts')}>
            <ArrowLeft className='size-4' />
            Back
          </Button>
          {isActive && (
            <>
              <Button variant='outline' onClick={() => setEditOpen(true)}>
                <Pencil className='size-4' />
                Edit
              </Button>
              <Button variant='outline' onClick={() => setRenewOpen(true)}>
                <RefreshCw className='size-4' />
                Renew
              </Button>
              <Button variant='destructive' onClick={() => setTerminateOpen(true)}>
                <Ban className='size-4' />
                Terminate
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* Expiry Warning */}
      {isExpiringSoon && (
        <div className='mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50'>
          <AlertTriangle className='size-5 text-amber-600 dark:text-amber-400 shrink-0' />
          <p className='text-sm font-medium text-amber-800 dark:text-amber-200'>
            This contract expires in {daysUntilEnd} day{daysUntilEnd !== 1 ? 's' : ''}.
            Consider renewing or terminating the contract.
          </p>
        </div>
      )}

      {isExpired && isActive && (
        <div className='mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50'>
          <AlertTriangle className='size-5 text-red-600 dark:text-red-400 shrink-0' />
          <p className='text-sm font-medium text-red-800 dark:text-red-200'>
            This contract has passed its end date. Please renew or terminate it.
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
              <p className='text-sm text-muted-foreground'>Status</p>
              <div className='mt-0.5'><ContractStatusBadge status={contract.status} /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-green-100 p-2.5 dark:bg-green-900/20'>
              <DollarSign className='size-5 text-green-600 dark:text-green-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Monthly Rent</p>
              <p className='text-xl font-bold'>{formatCurrency(contract.monthlyRent)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/20'>
              <DollarSign className='size-5 text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Deposit</p>
              <div>
                <p className='text-xl font-bold'>{formatCurrency(contract.depositAmount)}</p>
                <DepositStatusBadge status={contract.depositStatus} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/20'>
              <CalendarDays className='size-5 text-amber-600 dark:text-amber-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Contract Period</p>
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
              Property & Tenant
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <InfoRow label='Building' value={contract.buildingName} />
            <InfoRow label='Room' value={contract.roomNumber} />
            <InfoRow label='Main Tenant' value={contract.tenantName} />
            <InfoRow label='Move-in Date' value={formatDate(contract.moveInDate)} />
          </CardContent>
        </Card>

        {/* Contract Terms */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Clock className='size-4' />
              Contract Terms
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <InfoRow label='Start Date' value={formatDate(contract.startDate)} />
            <InfoRow label='End Date' value={formatDate(contract.endDate)} />
            <InfoRow label='Monthly Rent' value={formatCurrency(contract.monthlyRent)} />
            <InfoRow label='Deposit' value={formatCurrency(contract.depositAmount)} />
            <InfoRow label='Created' value={formatDate(contract.createdAt)} />
            {contract.note && <InfoRow label='Note' value={contract.note} />}
          </CardContent>
        </Card>

        {/* Termination Details (if terminated) */}
        {contract.status === 'Terminated' && (
          <Card className='lg:col-span-2 border-destructive/30'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base text-destructive'>
                <Ban className='size-4' />
                Termination Details
              </CardTitle>
              <CardDescription>
                This contract was terminated on {formatDate(contract.terminationDate ?? '')}.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {contract.terminationDate && (
                <InfoRow label='Termination Date' value={formatDate(contract.terminationDate)} />
              )}
              {contract.terminationNote && (
                <InfoRow label='Reason / Note' value={contract.terminationNote} />
              )}
              <InfoRow
                label='Refund Amount'
                value={contract.refundAmount != null ? formatCurrency(contract.refundAmount) : '—'}
              />
              <InfoRow label='Deposit Status'>
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
