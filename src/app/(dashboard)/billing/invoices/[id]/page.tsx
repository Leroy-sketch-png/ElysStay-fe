'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, FileText, Send, Ban, DollarSign, CalendarDays, Building2, User, Receipt,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { InvoiceStatusBadge } from '@/components/ui/status-badge'
import { toast } from '@/components/ui/toaster'
import { canRecordInvoicePayment, canSendInvoice, canVoidInvoice, isInvoiceClosed } from '@/lib/domain-constants'
import { formatCurrency, formatDate, formatBillingPeriod, toLocalDateInputValue } from '@/lib/utils'
import { invoiceKeys, fetchInvoiceById, sendInvoice, voidInvoice } from '@/lib/queries/invoices'
import { reportKeys } from '@/lib/queries/reports'
import { userKeys } from '@/lib/queries/users'
import { RecordPaymentDialog } from './record-payment-dialog'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false)
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false)

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => fetchInvoiceById(id),
    enabled: !!id,
  })

  const sendMutation = useMutation({
    mutationFn: () => sendInvoice(id),
    onSuccess: () => {
      toast.success('Đã gửi hóa đơn', 'Trạng thái đã chuyển sang Đã gửi.')
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
    },
    onError: (error: Error) => {
      toast.error('Gửi hóa đơn thất bại', error.message)
    },
  })

  const voidMutation = useMutation({
    mutationFn: () => voidInvoice(id),
    onSuccess: () => {
      toast.success('Đã hủy hóa đơn')
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
    },
    onError: (error: Error) => {
      toast.error('Hủy hóa đơn thất bại', error.message)
    },
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
          <Skeleton className='h-64 rounded-lg' />
        </div>
      </PageContainer>
    )
  }

  if (error || !invoice) {
    return (
      <PageContainer>
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <FileText className='size-12 text-muted-foreground mb-4' />
          <h2 className='text-lg font-semibold'>Không tìm thấy hóa đơn</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Hóa đơn này có thể đã bị xóa hoặc bạn không có quyền truy cập.
          </p>
          <Button variant='outline' className='mt-4' onClick={() => router.push('/billing/invoices')}>
            <ArrowLeft className='size-4' />
            Quay lại Hóa đơn
          </Button>
        </div>
      </PageContainer>
    )
  }

  const billingPeriod = formatBillingPeriod(invoice.billingYear, invoice.billingMonth)

  const amountDue = invoice.totalAmount - invoice.paidAmount
  const canSend = canSendInvoice(invoice.status)
  const canVoid = canVoidInvoice(invoice.status)
  const canRecordPayment = canRecordInvoicePayment(invoice.status)

  const [dueYear, dueMonth, dueDay] = invoice.dueDate.split('-').map(Number)
  const dueDate = new Date(dueYear, dueMonth - 1, dueDay)
  const today = new Date(toLocalDateInputValue())

  const isOverdue = invoice.status === 'Overdue' ||
    (!isInvoiceClosed(invoice.status) && dueDate < today)

  return (
    <PageContainer
      title={`Hóa đơn — ${billingPeriod}`}
      description={`${invoice.roomNumber} • ${invoice.tenantName}`}
      breadcrumbs={<Breadcrumbs items={[{ label: 'Hóa đơn', href: '/billing/invoices' }, { label: billingPeriod }]} />}
      actions={
        <div className='flex items-center gap-2 flex-wrap'>
          <Button variant='outline' onClick={() => router.push('/billing/invoices')}>
            <ArrowLeft className='size-4' />
            Quay lại
          </Button>
          {canSend && (
            <Button
              variant='outline'
              onClick={() => setSendConfirmOpen(true)}
              disabled={sendMutation.isPending}
            >
              <Send className='size-4' />
              {sendMutation.isPending ? 'Đang gửi…' : 'Gửi hóa đơn'}
            </Button>
          )}
          {canRecordPayment && (
            <Button onClick={() => setPaymentOpen(true)}>
              <DollarSign className='size-4' />
              Ghi nhận thanh toán
            </Button>
          )}
          {canVoid && (
            <Button
              variant='destructive'
              onClick={() => setVoidConfirmOpen(true)}
              disabled={voidMutation.isPending}
            >
              <Ban className='size-4' />
              {voidMutation.isPending ? 'Đang hủy…' : 'Hủy bỏ'}
            </Button>
          )}
        </div>
      }
    >
      {/* Overdue Warning */}
      {isOverdue && invoice.status !== 'Void' && (
        <div className='mb-6 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4'>
          <CalendarDays className='size-5 text-destructive shrink-0' />
          <p className='text-sm font-medium text-destructive'>
            Hóa đơn đã quá hạn. Hạn thanh toán là {formatDate(invoice.dueDate)}.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-primary/10 p-2.5'>
              <Receipt className='size-5 text-primary' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Trạng thái</p>
              <div className='mt-0.5'><InvoiceStatusBadge status={invoice.status} /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-success/10 p-2.5'>
              <DollarSign className='size-5 text-success' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Tổng cộng</p>
              <p className='text-xl font-bold'>{formatCurrency(invoice.totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-info/10 p-2.5'>
              <DollarSign className='size-5 text-info' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Đã thanh toán</p>
              <p className='text-xl font-bold'>{formatCurrency(invoice.paidAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className={`rounded-lg p-2.5 ${amountDue > 0 ? 'bg-warning/10' : 'bg-success/10'}`}>
              <DollarSign className={`size-5 ${amountDue > 0 ? 'text-warning' : 'text-success'}`} />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Còn nợ</p>
              <p className={`text-xl font-bold ${amountDue > 0 ? 'text-warning' : 'text-success'}`}>
                {formatCurrency(amountDue)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className='grid gap-6 lg:grid-cols-2 mb-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base flex items-center gap-2'>
              <Building2 className='size-4' />
              Tài sản
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <InfoRow label='Tòa nhà'>
              <Link href={`/buildings/${invoice.buildingId}`} className='text-sm font-medium hover:underline'>
                {invoice.buildingName}
              </Link>
            </InfoRow>
            <InfoRow label='Phòng'>
              <Link href={`/rooms/${invoice.roomId}`} className='text-sm font-medium hover:underline'>
                {invoice.roomNumber}
              </Link>
            </InfoRow>
            <InfoRow label='Kỳ thanh toán' value={billingPeriod} />
            <InfoRow label='Hạn thanh toán' value={formatDate(invoice.dueDate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base flex items-center gap-2'>
              <User className='size-4' />
              Khách thuê
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <InfoRow label='Tên'>
              <Link href={`/tenants/${invoice.tenantUserId}`} className='text-sm font-medium hover:underline'>
                {invoice.tenantName}
              </Link>
            </InfoRow>
            <InfoRow label='Hợp đồng'>
              <Link href={`/contracts/${invoice.contractId}`} className='text-sm font-medium hover:underline'>
                Xem hợp đồng
              </Link>
            </InfoRow>
            <InfoRow label='Ngày tạo' value={formatDate(invoice.createdAt)} />
            {invoice.note && <InfoRow label='Ghi chú' value={invoice.note} />}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Chi tiết mục</CardTitle>
          <CardDescription>Các khoản phí trong kỳ thanh toán này.</CardDescription>
        </CardHeader>
        <CardContent>
            <table className='w-full text-sm' aria-label='Chi tiết hóa đơn'>
            <thead>
              <tr className='border-b'>
                <th className='text-left font-medium py-2'>Mô tả</th>
                <th className='text-right font-medium py-2'>SL / Chỉ số</th>
                <th className='text-right font-medium py-2'>Đơn giá</th>
                <th className='text-right font-medium py-2'>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className='border-b last:border-0'>
                  <td className='py-3'>
                    <div>
                      <span className='font-medium'>{item.description}</span>
                      {item.previousReading != null && item.currentReading != null && (
                        <div className='text-xs text-muted-foreground'>
                          Chỉ số: {item.previousReading.toLocaleString('vi-VN')} → {item.currentReading.toLocaleString('vi-VN')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className='text-right py-3'>{item.quantity}</td>
                  <td className='text-right py-3'>{formatCurrency(item.unitPrice)}</td>
                  <td className='text-right py-3 font-medium'>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* Subtotal */}
              <tr className='border-t'>
                <td colSpan={3} className='text-right py-2 text-muted-foreground'>Tạm tính</td>
                <td className='text-right py-2 font-medium'>
                  {formatCurrency(invoice.rentAmount + invoice.serviceAmount)}
                </td>
              </tr>
              {/* Penalty */}
              {invoice.penaltyAmount > 0 && (
                <tr>
                  <td colSpan={3} className='text-right py-1 text-muted-foreground'>Phạt</td>
                  <td className='text-right py-1 text-destructive'>
                    +{formatCurrency(invoice.penaltyAmount)}
                  </td>
                </tr>
              )}
              {/* Discount */}
              {invoice.discountAmount > 0 && (
                <tr>
                  <td colSpan={3} className='text-right py-1 text-muted-foreground'>Giảm giá</td>
                  <td className='text-right py-1 text-success'>
                    -{formatCurrency(invoice.discountAmount)}
                  </td>
                </tr>
              )}
              {/* Total */}
              <tr className='border-t'>
                <td colSpan={3} className='text-right py-2 font-semibold'>Tổng cộng</td>
                <td className='text-right py-2 font-bold text-lg'>{formatCurrency(invoice.totalAmount)}</td>
              </tr>
              {/* Paid */}
              <tr>
                <td colSpan={3} className='text-right py-1 text-muted-foreground'>Đã trả</td>
                <td className='text-right py-1 text-success'>-{formatCurrency(invoice.paidAmount)}</td>
              </tr>
              {/* Amount Due */}
              <tr className='border-t'>
                <td colSpan={3} className='text-right py-2 font-semibold'>Còn nợ</td>
                <td className={`text-right py-2 font-bold text-lg ${amountDue > 0 ? 'text-warning' : 'text-success'}`}>
                  {formatCurrency(amountDue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Payment History */}
      {invoice.payments.length > 0 ? (
        <Card className='mt-6'>
          <CardHeader>
            <CardTitle className='text-base flex items-center gap-2'>
              <DollarSign className='size-4' />
              Lịch sử thanh toán
            </CardTitle>
            <CardDescription>{invoice.payments.length} khoản thanh toán đã ghi</CardDescription>
          </CardHeader>
          <CardContent>
            <table className='w-full text-sm' aria-label='Lịch sử thanh toán'>
              <thead>
                <tr className='border-b'>
                  <th className='text-left font-medium py-2'>Ngày</th>
                  <th className='text-left font-medium py-2'>Phương thức</th>
                  <th className='text-left font-medium py-2'>Tham chiếu</th>
                  <th className='text-left font-medium py-2'>Người ghi</th>
                  <th className='text-right font-medium py-2'>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id} className='border-b last:border-0'>
                    <td className='py-3'>{formatDate(payment.paidAt)}</td>
                    <td className='py-3'>{payment.paymentMethod ?? '—'}</td>
                    <td className='py-3 text-muted-foreground'>{payment.referenceCode ?? '—'}</td>
                    <td className='py-3'>{payment.recordedByName}</td>
                    <td className='py-3 text-right font-medium text-success'>
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : !isInvoiceClosed(invoice.status) && (
        <Card className='mt-6'>
          <CardContent className='py-8 text-center'>
            <DollarSign className='size-8 text-muted-foreground mx-auto mb-2' />
            <p className='text-sm text-muted-foreground'>Chưa có thanh toán nào.</p>
          </CardContent>
        </Card>
      )}

      {/* Send confirmation */}
      <ConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        title='Gửi hóa đơn'
        description='Thao tác này sẽ chuyển trạng thái hóa đơn từ Nháp sang Đã gửi và thông báo cho khách thuê. Không thể hoàn tác.'
        confirmLabel='Gửi hóa đơn'
        variant='default'
        loading={sendMutation.isPending}
        onConfirm={() => {
          sendMutation.mutate(undefined, {
            onSuccess: () => setSendConfirmOpen(false),
          })
        }}
      />

      {/* Void confirmation */}
      <ConfirmDialog
        open={voidConfirmOpen}
        onOpenChange={setVoidConfirmOpen}
        title='Hủy hóa đơn'
        description='Thao tác này sẽ hủy vĩnh viễn hóa đơn. Không thể hoàn tác. Số dư còn lại sẽ bị xóa.'
        confirmLabel='Hủy hóa đơn'
        variant='destructive'
        loading={voidMutation.isPending}
        onConfirm={() => {
          voidMutation.mutate(undefined, {
            onSuccess: () => setVoidConfirmOpen(false),
          })
        }}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        invoice={invoice}
      />
    </PageContainer>
  )
}

// ─── Helper ─────────────────────────────────────────────

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className='flex items-start justify-between gap-4'>
      <span className='text-sm text-muted-foreground shrink-0'>{label}</span>
      {children ?? <span className='text-sm font-medium text-right'>{value}</span>}
    </div>
  )
}
