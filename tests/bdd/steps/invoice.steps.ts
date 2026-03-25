/**
 * Step definitions for invoice workflow BDD scenarios.
 */
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Types ───────────────────────────────────────────────

type InvoiceStatus = 'Draft' | 'Sent' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Void'

type MockInvoice = {
  id: string
  buildingId: string
  roomId: string
  roomNumber: string
  tenantId: string
  tenantName: string
  billingMonth: number
  billingYear: number
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
  dueDate: string
  createdAt: string
  updatedAt: string
}

function createMockInvoice(overrides: Partial<MockInvoice> = {}): MockInvoice {
  const id = overrides.id ?? `invoice-${Math.random().toString(36).slice(2, 10)}`
  return {
    id,
    buildingId: overrides.buildingId ?? 'building-a',
    roomId: overrides.roomId ?? `room-${overrides.roomNumber ?? '101'}`,
    roomNumber: overrides.roomNumber ?? '101',
    tenantId: overrides.tenantId ?? 'tenant-1',
    tenantName: overrides.tenantName ?? 'Nguyễn Văn A',
    billingMonth: overrides.billingMonth ?? 3,
    billingYear: overrides.billingYear ?? 2026,
    totalAmount: overrides.totalAmount ?? 5_000_000,
    paidAmount: overrides.paidAmount ?? 0,
    status: overrides.status ?? 'Draft',
    dueDate: overrides.dueDate ?? '2026-03-25T00:00:00Z',
    createdAt: overrides.createdAt ?? '2026-03-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-03-01T00:00:00Z',
  }
}

function getInvoiceStore(world: Record<string, unknown>): MockInvoice[] {
  if (!Array.isArray(world.mockInvoices)) {
    world.mockInvoices = [
      createMockInvoice({ id: 'invoice-101-draft', roomNumber: '101', status: 'Draft' }),
      createMockInvoice({ id: 'invoice-202-overdue', roomNumber: '202', status: 'Overdue' }),
      createMockInvoice({ id: 'invoice-303-sent', roomNumber: '303', status: 'Sent' }),
    ]
  }
  return world.mockInvoices as MockInvoice[]
}

async function ensureInvoiceApiMocks(page: Page, world: Record<string, unknown>) {
  if (world.invoiceApiMocked) return
  world.invoiceApiMocked = true

  const invoices = getInvoiceStore(world)

  await page.unroute('**/api/v1/invoices**').catch(() => undefined)

  await page.route('**/api/v1/invoices**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^.*\/api\/v1/, '')
    const pathParts = path.split('/').filter(Boolean)

    // POST /invoices/batch-send
    if (
      pathParts.length === 2 &&
      pathParts[0] === 'invoices' &&
      pathParts[1] === 'batch-send' &&
      request.method() === 'POST'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Đã gửi hóa đơn' }),
      })
      return
    }

    // POST /invoices/generate
    if (
      pathParts.length === 2 &&
      pathParts[0] === 'invoices' &&
      pathParts[1] === 'generate' &&
      request.method() === 'POST'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Đã tạo hóa đơn' }),
      })
      return
    }

    // PATCH /invoices/{id}/send
    if (pathParts.length === 3 && pathParts[0] === 'invoices' && pathParts[2] === 'send' && request.method() === 'PATCH') {
      const id = pathParts[1]
      const invoice = invoices.find((inv) => inv.id === id)
      if (invoice) invoice.status = 'Sent'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Đã gửi hóa đơn' }),
      })
      return
    }

    // PATCH /invoices/{id}/void
    if (pathParts.length === 3 && pathParts[0] === 'invoices' && pathParts[2] === 'void' && request.method() === 'PATCH') {
      const id = pathParts[1]
      const invoice = invoices.find((inv) => inv.id === id)
      if (invoice) invoice.status = 'Void'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Đã hủy hóa đơn' }),
      })
      return
    }

    // POST /invoices/{id}/payments
    if (
      pathParts.length === 3 &&
      pathParts[0] === 'invoices' &&
      pathParts[2] === 'payments' &&
      request.method() === 'POST'
    ) {
      const id = pathParts[1]
      const invoice = invoices.find((inv) => inv.id === id)
      const body = JSON.parse(request.postData() || '{}') as { amount?: number }
      if (invoice && body.amount !== undefined) {
        invoice.paidAmount += body.amount
        invoice.status = invoice.paidAmount >= invoice.totalAmount ? 'Paid' : 'PartiallyPaid'
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Đã ghi nhận thanh toán' }),
      })
      return
    }

    // GET /invoices (list)
    if (pathParts.length === 1 && pathParts[0] === 'invoices' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: invoices,
          pagination: { page: 1, pageSize: 20, totalItems: invoices.length, totalPages: 1 },
        }),
      })
      return
    }

    // GET /invoices/{id}
    if (pathParts.length === 2 && pathParts[0] === 'invoices' && request.method() === 'GET') {
      const id = pathParts[1]
      const invoice = invoices.find((inv) => inv.id === id)
      if (invoice) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: invoice }),
        })
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Không tìm thấy hóa đơn' }),
        })
      }
      return
    }

    await route.continue()
  })
}

// ─── Navigation ─────────────────────────────────────────

Given('I am viewing the invoices page', async function () {
  const page: Page = this.page
  await ensureInvoiceApiMocks(page, this)
  await page.goto('/billing/invoices')
  await page.waitForLoadState('networkidle')
})

// ─── Pre-conditions ─────────────────────────────────────

Given('there is a draft invoice for room {string}', async function (room: string) {
  const invoices = getInvoiceStore(this)
  const existing = invoices.find((inv) => inv.roomNumber === room && inv.status === 'Draft')
  if (!existing) {
    invoices.push(createMockInvoice({ roomNumber: room, status: 'Draft' }))
  }
  this.targetInvoiceRoom = room
  this.targetInvoiceStatus = 'Draft'
})

Given('there is an overdue invoice for room {string}', async function (room: string) {
  const invoices = getInvoiceStore(this)
  const existing = invoices.find((inv) => inv.roomNumber === room && inv.status === 'Overdue')
  if (!existing) {
    invoices.push(createMockInvoice({ roomNumber: room, status: 'Overdue' }))
  }
  this.targetInvoiceRoom = room
  this.targetInvoiceStatus = 'Overdue'
})

Given('there is a paid invoice for room {string}', async function (room: string) {
  const invoices = getInvoiceStore(this)
  const existing = invoices.find((inv) => inv.roomNumber === room && inv.status === 'Paid')
  if (!existing) {
    invoices.push(createMockInvoice({ roomNumber: room, status: 'Paid', paidAmount: 5_000_000 }))
  }
  this.targetInvoiceRoom = room
  this.targetInvoiceStatus = 'Paid'
})

Given('there is a sent invoice for room {string} with total {string}', async function (room: string, total: string) {
  const invoices = getInvoiceStore(this)
  const totalAmount = Number(total)
  const existing = invoices.find((inv) => inv.roomNumber === room && inv.status === 'Sent')
  if (!existing) {
    const inv = createMockInvoice({ roomNumber: room, status: 'Sent', totalAmount })
    invoices.push(inv)
    this.targetInvoiceId = inv.id
  } else {
    existing.totalAmount = totalAmount
    this.targetInvoiceId = existing.id
  }
  this.targetInvoiceRoom = room
  this.targetInvoiceStatus = 'Sent'
})

Given('there is a {string} invoice for room {string}', async function (status: string, room: string) {
  const invoices = getInvoiceStore(this)
  const typedStatus = status as InvoiceStatus
  const existing = invoices.find((inv) => inv.roomNumber === room && inv.status === typedStatus)
  if (!existing) {
    const inv = createMockInvoice({ roomNumber: room, status: typedStatus })
    invoices.push(inv)
    this.targetInvoiceId = inv.id
  } else {
    this.targetInvoiceId = existing.id
  }
  this.targetInvoiceRoom = room
  this.targetInvoiceStatus = typedStatus
})

Given('there are multiple draft invoices', async function () {
  const invoices = getInvoiceStore(this)
  // Ensure at least 3 draft invoices
  const rooms = ['101', '201', '301']
  for (const room of rooms) {
    if (!invoices.find((inv) => inv.roomNumber === room && inv.status === 'Draft')) {
      invoices.push(createMockInvoice({ roomNumber: room, status: 'Draft' }))
    }
  }
  this.targetInvoiceStatus = 'Draft'
})

// ─── Actions ─────────────────────────────────────────────

When('I click the send button for that invoice', async function () {
  const page: Page = this.page
  const room: string = this.targetInvoiceRoom
  // Find the row containing the room number and click its send button
  const row = page.getByRole('row').filter({ hasText: room }).first()
  await row.getByRole('button', { name: /Gửi/ }).click()
})

When('I click the void button for that invoice', async function () {
  const page: Page = this.page
  const room: string = this.targetInvoiceRoom
  const row = page.getByRole('row').filter({ hasText: room }).first()
  await row.getByRole('button', { name: /Hủy/ }).click()
})

When('I click the record payment button for that invoice', async function () {
  const page: Page = this.page
  const room: string = this.targetInvoiceRoom
  const row = page.getByRole('row').filter({ hasText: room }).first()
  await row.getByRole('button', { name: /Ghi nhận|Thanh toán/ }).click()
})

When('I confirm the void action', async function () {
  const page: Page = this.page
  // Confirm dialog — click the destructive confirm button
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Hủy bỏ|Xác nhận|Confirm/ }).last().click()
})

When('I confirm the batch send', async function () {
  const page: Page = this.page
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Gửi|Xác nhận/ }).last().click()
})

When('I fill in the payment amount {string}', async function (amount: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Số tiền|Thanh toán/)
  await input.clear()
  await input.fill(amount)
})

When('I select payment method {string}', async function (method: string) {
  const page: Page = this.page
  const select = page.getByLabel(/Phương thức|Hình thức/)
  await select.click()
  await page.getByText(method).click()
})

When('I submit the payment form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Ghi nhận/ }).last().click()
})

When('I select all draft invoices', async function () {
  const page: Page = this.page
  // Click the select-all checkbox (header checkbox)
  const headerCheckbox = page.getByRole('columnheader').getByRole('checkbox')
  if (await headerCheckbox.count() > 0) {
    await headerCheckbox.click()
  } else {
    // Fallback: click individual checkboxes for all Draft rows
    const draftRows = page.getByRole('row').filter({ hasText: 'Nháp' })
    const count = await draftRows.count()
    for (let i = 0; i < count; i++) {
      const checkbox = draftRows.nth(i).getByRole('checkbox')
      if (await checkbox.count() > 0) {
        await checkbox.click()
      }
    }
  }
})

When('I click the batch send button', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Gửi đã chọn|Gửi tất cả/ }).click()
})

// ─── Assertions ──────────────────────────────────────────

Then('the invoice status should change to {string}', async function (label: string) {
  const page: Page = this.page
  const room: string = this.targetInvoiceRoom
  if (room) {
    const row = page.getByRole('row').filter({ hasText: room }).first()
    await expect(row.getByText(label)).toBeVisible({ timeout: 8000 })
  } else {
    await expect(page.getByText(label).first()).toBeVisible({ timeout: 8000 })
  }
})

// ─── Shared availability steps (Scenario Outline) ────────
// {availability} expands to "should be available" or "should not be available"

Then(/^the send button (should(?:| not) be available) for that invoice$/, async function (availability: string) {
  const page: Page = this.page
  const room: string = this.targetInvoiceRoom
  const row = page.getByRole('row').filter({ hasText: room }).first()
  const sendBtn = row.getByRole('button', { name: /Gửi/ })
  if (availability === 'should be available') {
    await expect(sendBtn).toBeVisible({ timeout: 5000 })
  } else {
    await expect(sendBtn).toHaveCount(0)
  }
})

Then(/^the void button (should(?:| not) be available) for that invoice$/, async function (availability: string) {
  const page: Page = this.page
  const room: string = this.targetInvoiceRoom
  const row = page.getByRole('row').filter({ hasText: room }).first()
  const voidBtn = row.getByRole('button', { name: /Hủy/ })
  if (availability === 'should be available') {
    await expect(voidBtn).toBeVisible({ timeout: 5000 })
  } else {
    await expect(voidBtn).toHaveCount(0)
  }
})

Then(/^the record payment button (should(?:| not) be available) for that invoice$/, async function (availability: string) {
  const page: Page = this.page
  const room: string = this.targetInvoiceRoom
  const row = page.getByRole('row').filter({ hasText: room }).first()
  const payBtn = row.getByRole('button', { name: /Ghi nhận|Thanh toán/ })
  if (availability === 'should be available') {
    await expect(payBtn).toBeVisible({ timeout: 5000 })
  } else {
    await expect(payBtn).toHaveCount(0)
  }
})


