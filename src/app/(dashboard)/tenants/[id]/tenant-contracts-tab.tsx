'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { ContractStatusBadge, DepositStatusBadge } from '@/components/ui/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { contractKeys, fetchContracts } from '@/lib/queries/contracts'
import type { ContractDto } from '@/types/api'

interface TenantContractsTabProps {
  tenantUserId: string
}

export function TenantContractsTab({ tenantUserId }: TenantContractsTabProps) {
  const router = useRouter()

  const { data, isLoading, isError } = useQuery({
    queryKey: contractKeys.list({ tenantUserId, pageSize: 50 }),
    queryFn: () => fetchContracts({ tenantUserId, pageSize: 50 }),
    enabled: !!tenantUserId,
  })

  const tenantContracts = data?.data ?? []

  const columns: Column<ContractDto>[] = [
    {
      key: 'room',
      header: 'Phòng',
      render: (row) => (
        <div>
          <p className='font-medium'>{row.roomNumber}</p>
          <p className='text-xs text-muted-foreground'>{row.buildingName}</p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Thời hạn',
      render: (row) => (
        <span className='text-sm'>
          {formatDate(row.startDate)} — {formatDate(row.endDate)}
        </span>
      ),
    },
    {
      key: 'rent',
      header: 'Tiền thuê',
      render: (row) => formatCurrency(row.monthlyRent),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <ContractStatusBadge status={row.status} />,
    },
    {
      key: 'deposit',
      header: 'Tiền cọc',
      render: (row) => <DepositStatusBadge status={row.depositStatus} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button
          variant='ghost'
          size='sm'
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/contracts/${row.id}`)
          }}
        >
          Xem
        </Button>
      ),
      headerClassName: 'w-[80px]',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Lịch sử hợp đồng</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={tenantContracts}
          loading={isLoading}
          loadingRows={3}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/contracts/${row.id}`)}
          emptyMessage={isError ? 'Đã xảy ra lỗi khi tải danh sách hợp đồng.' : 'Khách thuê chưa có hợp đồng nào.'}
          emptyIcon={<FileText className='size-10' />}
        />
      </CardContent>
    </Card>
  )
}
