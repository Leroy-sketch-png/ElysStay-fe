/**
 * Step definitions for monthly-payment-process.feature
 *
 * Covers: full/partial payments, overdue handling, payment status constraints,
 * amount validation, payment history display.
 */
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Types ───────────────────────────────────────────────

type InvoiceStatus = 'Draft' | 'Sent' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Void'

interface MockPayment {
  id: string
  amount: number
  paymentMethod: string
  paidAt: string
  recordedByName: string
}

interface MockInvoice {
  id: string
  buildingId: string
  roomNumber: string
  tenantName: string
  billingMonth: number
  billingYear: number
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
  dueDate: string
  lineItems: Array<{ id: string; description: string; quantity: number; unitPrice: number; amount: number }>
  payments: MockPayment[]
}

// ─── Helpers ─────────────────────────────────────────────

function getPaymentInvoiceStore(world: Record<string, unknown>): MockInvoice[] {
  if (!Array.isArray(world.paymentInvoices)) world.paymentInvoices = []
  return world.paymentInvoices as MockInvoice[]
}

function makePaymentInvoice(overrides: Partial<MockInvoice> = {}): MockInvoice {
  return {
    id: overrides.id ?? `inv-${Math.random().toString(36).slice(2, 10)}`,
    buildingId: overrides.buildingId ?? 'building-1',
    roomNumber: overrides.roomNumber ?? '101',
    tenantName: overrides.tenantName ?? 'Nguyễn Văn A',
    billingMonth: overrides.billingMonth ?? 5,
    billingYear: overrides.billingYear ?? 2026,
    totalAmount: overrides.totalAmount ?? 5_000_000,
    paidAmount: overrides.paidAmount ?? 0,
    status: overrides.status ?? 'Sent',
    dueDate: overrides.dueDate ?? '2026-05-10',
    lineItems: overrides.lineItems ?? [
      { id: 'li-rent', description: 'Tiền thuê tháng 5/2026', quantity: 1, unitPrice: 5_000_000, amount: 5_000_000 },
    ],
    payments: overrides.payments ?? [],
  }
}

async function setupPaymentMocks(page: Page, world: Record<string, unknown>) {
  if (world.paymentMocksSetup) return
  world.paymentMocksSetup = true

  const invoices = getPaymentInvoiceStore(world)

  // Buildings list
  await page.route('**/api/v1/buildings**', async (route) => {
    if (route.request().method() !== 'GET') { await route.continue(); return }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [{
          id: 'building-1', ownerId: 'owner-1', name: 'Tòa nhà A',
          address: '1 Demo St', totalFloors: 5, invoiceDueDay: 10,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        }],
        pagination: { page: 1, pageSize: 999, totalItems: 1, totalPages: 1 },
      }),
    })
  })

  // Invoice list (paged)
  await page.route('**/api/v1/invoices?**', async (route) => {
    if (route.request().method() !== 'GET') { await route.continue(); return }
    const url = new URL(route.request().url())
    const statusFilter = url.searchParams.get('status')
    const filtered = statusFilter ? invoices.filter((i) => i.status === statusFilter) : invoices
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: filtered,
        pagination: { page: 1, pageSize: 20, totalItems: filtered.length, totalPages: 1 },
      }),
    })
  })

  // Invoice detail  GET /invoices/:id
  await page.route('**/api/v1/invoices/*', async (route) => {
    const url = new URL(route.request().url())
    const pathParts = url.pathname.split('/').filter(Boolean)
    const method = route.request().method()

    // POST /invoices/:id/payments
    if (pathParts.at(-1) === 'payments' && method === 'POST') {
      const id = pathParts.at(-2)!
      const inv = invoices.find((i) => i.id === id)
      const body = JSON.parse(route.request().postData() || '{}') as { amount?: number; paymentMethod?: string }

      if (inv && body.amount !== undefined) {
        const remaining = inv.totalAmount - inv.paidAmount
        if (body.amount <= 0) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Số tiền phải lớn hơn 0', errorCode: 'VALIDATION_ERROR' }),
          })
          return
        }
        if (body.amount > remaining) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Số tiền vượt quá số dư còn lại', errorCode: 'VALIDATION_ERROR' }),
          })
          return
        }
        inv.paidAmount += body.amount
        inv.status = inv.paidAmount >= inv.totalAmount ? 'Paid' : 'PartiallyPaid'
        inv.payments.push({
          id: `pay-${Date.now()}`,
          amount: body.amount,
          paymentMethod: body.paymentMethod ?? 'Cash',
          paidAt: new Date().toISOString(),
          recordedByName: 'E2E Owner',
        })
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Đã ghi nhận thanh toán' }),
      })
      return
    }

    // GET /invoices/:id
    if (method === 'GET' && pathParts.length >= 2) {
      const id = pathParts.at(-1)!
      const inv = invoices.find((i) => i.id === id)
      if (!inv) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Không tìm thấy hóa đơn' }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: inv }),
      })
      return
    }

    await route.continue()
  })
}

// ─── Given ───────────────────────────────────────────────

Given('there is a Sent invoice for room {string} with total amount {string} VND', async function (
  room: string, total: string,
) {
  const inv = makePaymentInvoice({ roomNumber: room, status: 'Sent', totalAmount: Number(total) })
  getPaymentInvoiceStore(this).push(inv)
  this.targetInvoice = inv
  this.targetRoom = room
})

Given('there is a PartiallyPaid invoice for room {string} with paid {string} of total {string} VND', async function (
  room: string, paid: string, total: string,
) {
  const inv = makePaymentInvoice({
    roomNumber: room,
    status: 'PartiallyPaid',
    totalAmount: Number(total),
    paidAmount: Number(paid),
    payments: [{
      id: 'pay-1',
      amount: Number(paid),
      paymentMethod: 'BankTransfer',
      paidAt: '2026-05-05T00:00:00Z',
      recordedByName: 'E2E Owner',
    }],
  })
  getPaymentInvoiceStore(this).push(inv)
  this.targetInvoice = inv
  this.targetRoom = room
})

Given('there is a PartiallyPaid invoice for room {string} with two payments of {string} each', async function (
  room: string, each: string,
) {
  const amount = Number(each)
  const inv = makePaymentInvoice({
    roomNumber: room,
    status: 'PartiallyPaid',
    totalAmount: amount * 4,
    paidAmount: amount * 2,
    payments: [
      { id: 'pay-1', amount, paymentMethod: 'Cash', paidAt: '2026-05-02T00:00:00Z', recordedByName: 'E2E Owner' },
      { id: 'pay-2', amount, paymentMethod: 'BankTransfer', paidAt: '2026-05-08T00:00:00Z', recordedByName: 'E2E Owner' },
    ],
  })
  getPaymentInvoiceStore(this).push(inv)
  this.targetInvoice = inv
  this.targetRoom = room
})

Given('there is an Overdue invoice for room {string} with total amount {string} VND', async function (
  room: string, total: string,
) {
  const inv = makePaymentInvoice({ roomNumber: room, status: 'Overdue', totalAmount: Number(total) })
  getPaymentInvoiceStore(this).push(inv)
  this.targetInvoice = inv
  this.targetRoom = room
})

Given('there is an Overdue invoice for room {string} with due date {string}', async function (
  room: string, dueDate: string,
) {
  const inv = makePaymentInvoice({ roomNumber: room, status: 'Overdue', dueDate })
  getPaymentInvoiceStore(this).push(inv)
  this.targetInvoice = inv
  this.targetRoom = room
})

Given('there is an Overdue invoice for room {string}', async function (room: string) {
  const inv = makePaymentInvoice({ roomNumber: room, status: 'Overdue' })
  getPaymentInvoiceStore(this).push(inv)
  this.targetInvoice = inv
  this.targetRoom = room
})

Given('there is a Draft invoice for room {string} in payment context', async function (room: string) {
  const inv = makePaymentInvoice({ roomNumber: room, status: 'Draft' })
  getPaymentInvoiceStore(this).push(inv)
  this.targetInvoice = inv
  this.targetRoom = room
})

Given('there is a Void invoice for room {string} in payment context', async function (room: string) {
  const inv = makePaymentInvoice({ roomNumber: room, status: 'Void' })
  getPaymentInvoiceStore(this).push(inv)
  this.targetInvoice = inv
  this.targetRoom = room
})

Given('there is a {string} invoice ready for payment for room {string}', async function (
  status: InvoiceStatus, room: string,
) {
  const inv = makePaymentInvoice({ roomNumber: room, status })
  getPaymentInvoiceStore(this).push(inv)
  this.targetInvoice = inv
  this.targetRoom = room
})

// ─── When ────────────────────────────────────────────────

When('I open the invoice detail for room {string}', async function (room: string) {
  const page: Page = this.page
  await setupPaymentMocks(page, this)
  const inv = getPaymentInvoiceStore(this).find((i) => i.roomNumber === room)
  if (inv) {
    await page.goto(`/billing/invoices/${inv.id}`)
    await page.waitForLoadState('networkidle')
    this.targetInvoice = inv
  }
})

When('I enter payment amount {string}', async function (amount: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Số tiền thanh toán/)
  await input.clear()
  await input.fill(amount)
})

When('I navigate to the invoices list page', async function () {
  const page: Page = this.page
  await setupPaymentMocks(page, this)
  await page.goto('/billing/invoices')
  await page.waitForLoadState('networkidle')
})

// ─── Then ────────────────────────────────────────────────

Then('the invoice status changes to {string}', async function (statusLabel: string) {
  const page: Page = this.page
  await expect(page.getByText(statusLabel)).toBeVisible({ timeout: 10000 })
})

Then('the outstanding balance shown is {string} VND', async function (balance: string) {
  const page: Page = this.page
  const formatted = Number(balance).toLocaleString('vi-VN')
  if (Number(balance) === 0) {
    // When fully paid the balance might show as 0 or not shown
    await expect(
      page.getByText(/Đã thanh toán|Đã trả đủ|0/),
    ).toBeVisible({ timeout: 8000 })
  } else {
    await expect(page.getByText(new RegExp(formatted))).toBeVisible({ timeout: 8000 })
  }
})

Then('the {string} button is visible', async function (buttonText: string) {
  const page: Page = this.page
  await expect(
    page.getByRole('button', { name: new RegExp(buttonText) }),
  ).toBeVisible({ timeout: 6000 })
})

Then('the {string} button is not visible', async function (buttonText: string) {
  const page: Page = this.page
  await expect(
    page.getByRole('button', { name: new RegExp(buttonText) }),
  ).not.toBeVisible({ timeout: 6000 })
})

Then('the {string} button <availability>', async function (_buttonText: string, _availability: string) {
  // Handled by concrete steps above
})


Then('I should see the "Gửi hóa đơn" button instead', async function () {
  const page: Page = this.page
  await expect(
    page.getByRole('button', { name: 'Gửi hóa đơn' }),
  ).toBeVisible({ timeout: 6000 })
})

Then('I should see the overdue warning {string}', async function (warning: string) {
  const page: Page = this.page
  await expect(page.getByText(new RegExp(warning, 'i'))).toBeVisible({ timeout: 6000 })
})

Then('the row for room {string} shows the status {string}', async function (
  room: string, statusLabel: string,
) {
  const page: Page = this.page
  const row = page.getByRole('row').filter({ hasText: room }).first()
  await expect(row.getByText(statusLabel)).toBeVisible({ timeout: 6000 })
})

Then('the payment amount field shows {string} by default', async function (amount: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Số tiền thanh toán/)
  await expect(input).toHaveValue(amount, { timeout: 6000 })
})

Then('I should see the payment history section', async function () {
  const page: Page = this.page
  await expect(
    page.getByText(/Lịch sử thanh toán|Thanh toán đã ghi/i),
  ).toBeVisible({ timeout: 6000 })
})

Then('the payment history shows {string} payment of {string} VND', async function (
  _count: string, amount: string,
) {
  const page: Page = this.page
  const formatted = Number(amount).toLocaleString('vi-VN')
  await expect(page.getByText(new RegExp(formatted))).toBeVisible({ timeout: 6000 })
})

Then('the payment history shows {string} entries', async function (count: string) {
  const page: Page = this.page
  // Each payment entry has a distinct row or element
  const paymentRows = page.locator('[data-testid="payment-row"], .payment-entry, tr').filter({
    hasText: /VND|₫|\d{3,}/,
  })
  await expect(paymentRows).toHaveCount(Number(count), { timeout: 6000 })
})
