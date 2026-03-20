'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, User, FileText, Mail, Phone, CalendarDays, Shield,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { UserStatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import { tenantKeys, fetchTenantById } from '@/lib/queries/tenants'
import { TenantProfileTab } from './tenant-profile-tab'
import { TenantContractsTab } from './tenant-contracts-tab'

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('profile')

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: () => fetchTenantById(id),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <PageContainer>
        <div className='space-y-6'>
          <Skeleton className='h-8 w-64' />
          <div className='grid gap-4 sm:grid-cols-3'>
            <Skeleton className='h-24 rounded-lg' />
            <Skeleton className='h-24 rounded-lg' />
            <Skeleton className='h-24 rounded-lg' />
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error || !tenant) {
    return (
      <PageContainer>
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <User className='size-12 text-muted-foreground mb-4' />
          <h2 className='text-lg font-semibold'>Không tìm thấy khách thuê</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Khách thuê này có thể đã bị xóa hoặc bạn không có quyền truy cập.
          </p>
          <Button variant='outline' className='mt-4' onClick={() => router.push('/tenants')}>
            <ArrowLeft className='size-4' />
            Quay lại Khách thuê
          </Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title={tenant.fullName}
      description={tenant.email}
      breadcrumbs={<Breadcrumbs items={[{ label: 'Khách thuê', href: '/tenants' }, { label: tenant.fullName }]} />}
      actions={
        <Button variant='outline' onClick={() => router.push('/tenants')}>
          <ArrowLeft className='size-4' />
          Quay lại
        </Button>
      }
    >
      {/* Info Cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-primary/10 p-2.5'>
              <Mail className='size-5 text-primary' />
            </div>
            <div className='min-w-0'>
              <p className='text-sm text-muted-foreground'>Email</p>
              <p className='text-sm font-medium truncate'>{tenant.email}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-info/10 p-2.5'>
              <Phone className='size-5 text-info' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Điện thoại</p>
              <p className='text-sm font-medium'>{tenant.phone || '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-success/10 p-2.5'>
              <Shield className='size-5 text-success' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Trạng thái</p>
              <div className='mt-0.5'><UserStatusBadge status={tenant.status} /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-warning/10 p-2.5'>
              <CalendarDays className='size-5 text-warning' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Đăng ký</p>
              <p className='text-sm font-medium'>{formatDate(tenant.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value='profile'>
            <User className='size-4 mr-1.5' />
            Hồ sơ CCCD
          </TabsTrigger>
          <TabsTrigger value='contracts'>
            <FileText className='size-4 mr-1.5' />
            Hợp đồng
          </TabsTrigger>
        </TabsList>

        <TabsContent value='profile'>
          <TenantProfileTab userId={id} />
        </TabsContent>

        <TabsContent value='contracts'>
          <TenantContractsTab tenantUserId={id} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
