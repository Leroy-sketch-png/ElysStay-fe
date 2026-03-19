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
      toast.success('Invoice sent', 'Status changed to Sent.')
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
    },
    onError: (error: Error) => {
      toast.error('Failed to send invoice', error.message)
    },
  })

  const voidMutation = useMutation({
    mutationFn: () => voidInvoice(id),
    onSuccess: () => {
      toast.success('Invoice voided')
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: reportKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.dashboard() })
    },
    onError: (error: Error) => {
      toast.error('Failed to void invoice', error.message)
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
          <h2 className='text-lg font-semibold'>Invoice not found</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            This invoice may have been deleted or you don&apos;t have access.
          </p>
          <Button variant='outline' className='mt-4' onClick={() => router.push('/billing/invoices')}>
            <ArrowLeft className='size-4' />
            Back to Invoices
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
      title={`Invoice — ${billingPeriod}`}
      description={`${invoice.roomNumber} • ${invoice.tenantName}`}
      breadcrumbs={<Breadcrumbs items={[{ label: 'Invoices', href: '/billing/invoices' }, { label: billingPeriod }]} />}
      actions={
        <div className='flex items-center gap-2 flex-wrap'>
          <Button variant='outline' onClick={() => router.push('/billing/invoices')}>
            <ArrowLeft className='size-4' />
            Back
          </Button>
          {canSend && (
            <Button
              variant='outline'
              onClick={() => setSendConfirmOpen(true)}
              disabled={sendMutation.isPending}
            >
              <Send className='size-4' />
              {sendMutation.isPending ? 'Sending…' : 'Send Invoice'}
            </Button>
          )}
          {canRecordPayment && (
            <Button onClick={() => setPaymentOpen(true)}>
              <DollarSign className='size-4' />
              Record Payment
            </Button>
          )}
          {canVoid && (
            <Button
              variant='destructive'
              onClick={() => setVoidConfirmOpen(true)}
              disabled={voidMutation.isPending}
            >
              <Ban className='size-4' />
              {voidMutation.isPending ? 'Voiding…' : 'Void'}
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
            This invoice is overdue. Due date was {formatDate(invoice.dueDate)}.
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
              <p className='text-sm text-muted-foreground'>Status</p>
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
              <p className='text-sm text-muted-foreground'>Total Amount</p>
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
              <p className='text-sm text-muted-foreground'>Paid Amount</p>
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
              <p className='text-sm text-muted-foreground'>Amount Due</p>
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
              Property
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <InfoRow label='Building'>
              <Link href={`/buildings/${invoice.buildingId}`} className='text-sm font-medium hover:underline'>
                {invoice.buildingName}
              </Link>
            </InfoRow>
            <InfoRow label='Room'>
              <Link href={`/rooms/${invoice.roomId}`} className='text-sm font-medium hover:underline'>
                {invoice.roomNumber}
              </Link>
            </InfoRow>
            <InfoRow label='Billing Period' value={billingPeriod} />
            <InfoRow label='Due Date' value={formatDate(invoice.dueDate)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base flex items-center gap-2'>
              <User className='size-4' />
              Tenant
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <InfoRow label='Name'>
              <Link href={`/tenants/${invoice.tenantUserId}`} className='text-sm font-medium hover:underline'>
                {invoice.tenantName}
              </Link>
            </InfoRow>
            <InfoRow label='Contract'>
              <Link href={`/contracts/${invoice.contractId}`} className='text-sm font-medium hover:underline'>
                View Contract
              </Link>
            </InfoRow>
            <InfoRow label='Created' value={formatDate(invoice.createdAt)} />
            {invoice.note && <InfoRow label='Note' value={invoice.note} />}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Line Items</CardTitle>
          <CardDescription>Breakdown of charges for this billing period.</CardDescription>
        </CardHeader>
        <CardContent>
            <table className='w-full text-sm' aria-label='Invoice line items'>
            <thead>
              <tr className='border-b'>
                <th className='text-left font-medium py-2'>Description</th>
                <th className='text-right font-medium py-2'>Qty / Reading</th>
                <th className='text-right font-medium py-2'>Unit Price</th>
                <th className='text-right font-medium py-2'>Amount</th>
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
                          Reading: {item.previousReading.toLocaleString()} → {item.currentReading.toLocaleString()}
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
                <td colSpan={3} className='text-right py-2 text-muted-foreground'>Subtotal</td>
                <td className='text-right py-2 font-medium'>
                  {formatCurrency(invoice.rentAmount + invoice.serviceAmount)}
                </td>
              </tr>
              {/* Penalty */}
              {invoice.penaltyAmount > 0 && (
                <tr>
                  <td colSpan={3} className='text-right py-1 text-muted-foreground'>Penalty</td>
                  <td className='text-right py-1 text-destructive'>
                    +{formatCurrency(invoice.penaltyAmount)}
                  </td>
                </tr>
              )}
              {/* Discount */}
              {invoice.discountAmount > 0 && (
                <tr>
                  <td colSpan={3} className='text-right py-1 text-muted-foreground'>Discount</td>
                  <td className='text-right py-1 text-success'>
                    -{formatCurrency(invoice.discountAmount)}
                  </td>
                </tr>
              )}
              {/* Total */}
              <tr className='border-t'>
                <td colSpan={3} className='text-right py-2 font-semibold'>Total</td>
                <td className='text-right py-2 font-bold text-lg'>{formatCurrency(invoice.totalAmount)}</td>
              </tr>
              {/* Paid */}
              <tr>
                <td colSpan={3} className='text-right py-1 text-muted-foreground'>Paid</td>
                <td className='text-right py-1 text-success'>-{formatCurrency(invoice.paidAmount)}</td>
              </tr>
              {/* Amount Due */}
              <tr className='border-t'>
                <td colSpan={3} className='text-right py-2 font-semibold'>Amount Due</td>
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
              Payment History
            </CardTitle>
            <CardDescription>{invoice.payments.length} payment(s) recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <table className='w-full text-sm' aria-label='Payment history'>
              <thead>
                <tr className='border-b'>
                  <th className='text-left font-medium py-2'>Date</th>
                  <th className='text-left font-medium py-2'>Method</th>
                  <th className='text-left font-medium py-2'>Reference</th>
                  <th className='text-left font-medium py-2'>Recorded By</th>
                  <th className='text-right font-medium py-2'>Amount</th>
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
            <p className='text-sm text-muted-foreground'>No payments recorded yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Send confirmation */}
      <ConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        title='Send Invoice'
        description='This will change the invoice status from Draft to Sent and notify the tenant. This action cannot be undone.'
        confirmLabel='Send Invoice'
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
        title='Void Invoice'
        description='This will permanently void the invoice. This action cannot be undone. Any outstanding balance will be written off.'
        confirmLabel='Void Invoice'
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
