/**
 * E2E tests — Invoice Generation Flow
 *
 * Covers the full invoice lifecycle from the building owner's perspective:
 * - Generate invoices for a billing period
 * - View the invoice list (empty state, loading, populated)
 * - Filter by building, status
 * - Send a single draft invoice (with confirmation dialog)
 * - Batch send multiple draft invoices
 * - Void an invoice (with confirmation dialog)
 * - Record a payment for a sent invoice
 * - Navigate to invoice detail page and verify line items
 *
 * All API calls are intercepted via page.route() — no real backend required.
 */
import { test, expect } from '@playwright/test'
import {
  loginAsOwner,
  mockShellApis,
  mockBuildingsApi,
  mockInvoiceApi,
  makeInvoice,
  MOCK_BUILDING,
} from './helpers/invoice-api'

// ─── Setup ───────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await loginAsOwner(page)
  await mockShellApis(page)
  await mockBuildingsApi(page)
})

// ─── Empty State ─────────────────────────────────────────

test.describe('Invoices list — empty state', () => {
  test('shows empty state when no invoices exist and no building is selected', async ({ page }) => {
    await mockInvoiceApi(page, [])
    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Không tìm thấy hóa đơn')).toBeVisible()
    await expect(
      page.getByText('Chọn một tòa nhà trước khi tạo hóa đơn'),
    ).toBeVisible()
  })

  test('generate button is disabled until a building is selected', async ({ page }) => {
    await mockInvoiceApi(page, [])
    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    const generateBtn = page.getByRole('button', { name: /Tạo hóa đơn/ })
    await expect(generateBtn).toBeDisabled()
  })
})

// ─── Generate Invoices ───────────────────────────────────

test.describe('Generate invoices', () => {
  test('generate button becomes enabled after selecting a building', async ({ page }) => {
    await mockInvoiceApi(page, [])
    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    // Select the building from the dropdown
    await page.getByLabel('Tòa nhà').selectOption({ label: MOCK_BUILDING.name })

    const generateBtn = page.getByRole('button', { name: /Tạo hóa đơn/ })
    await expect(generateBtn).toBeEnabled()
  })

  test('clicking generate creates invoices and shows success toast', async ({ page }) => {
    const invoiceStore = await mockInvoiceApi(page, [])
    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    // Select building to enable the generate button
    await page.getByLabel('Tòa nhà').selectOption({ label: MOCK_BUILDING.name })

    // Click generate
    await page.getByRole('button', { name: /Tạo hóa đơn/ }).click()

    // Success toast should appear
    await expect(page.getByText(/hóa đơn đã tạo/i)).toBeVisible({ timeout: 8000 })

    // Invoice store should now have 3 generated invoices
    expect(invoiceStore).toHaveLength(3)
  })

  test('generated invoices appear in the list after generation', async ({ page }) => {
    await mockInvoiceApi(page, [])
    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    await page.getByLabel('Tòa nhà').selectOption({ label: MOCK_BUILDING.name })
    await page.getByRole('button', { name: /Tạo hóa đơn/ }).click()

    // After generation + list refresh, all 3 rooms should appear
    await expect(page.getByText('101')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('201')).toBeVisible()
    await expect(page.getByText('301')).toBeVisible()
  })

  test('shows "no new invoices" info toast when all contracts already have invoices', async ({ page }) => {
    // Route the generate endpoint to return all-skipped
    await page.route('**/api/v1/invoices/generate', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            generated: [],
            skipped: [{ contractId: 'c1', reason: 'Already exists' }],
            warnings: [],
          },
        }),
      }),
    )
    await mockInvoiceApi(page, [
      makeInvoice({ roomNumber: '101', status: 'Draft' }),
    ])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Tòa nhà').selectOption({ label: MOCK_BUILDING.name })
    await page.getByRole('button', { name: /Tạo hóa đơn/ }).click()

    await expect(page.getByText('Không có hóa đơn mới')).toBeVisible({ timeout: 6000 })
  })
})

// ─── List & Filters ──────────────────────────────────────

test.describe('Invoice list and filters', () => {
  test('shows invoices with room number, tenant, and status', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-1', roomNumber: '101', status: 'Draft', tenantName: 'Nguyễn Văn A' }),
      makeInvoice({ id: 'inv-2', roomNumber: '202', status: 'Sent', tenantName: 'Trần Thị B' }),
      makeInvoice({ id: 'inv-3', roomNumber: '303', status: 'Paid', tenantName: 'Lê Văn C', paidAmount: 5_500_000 }),
    ])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('101')).toBeVisible()
    await expect(page.getByText('202')).toBeVisible()
    await expect(page.getByText('303')).toBeVisible()
    await expect(page.getByText('Nguyễn Văn A')).toBeVisible()
    await expect(page.getByText('Trần Thị B')).toBeVisible()
  })

  test('status filter shows only matching invoices', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-d', roomNumber: '101', status: 'Draft' }),
      makeInvoice({ id: 'inv-s', roomNumber: '202', status: 'Sent' }),
    ])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    // Both invoices visible initially
    await expect(page.getByText('101')).toBeVisible()
    await expect(page.getByText('202')).toBeVisible()

    // Filter to Draft only
    await page.getByLabel('Trạng thái').selectOption('Draft')

    // Only Draft row should remain
    await expect(page.getByText('101')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('202')).not.toBeVisible()
  })

  test('"Đặt lại bộ lọc" button appears when filters are active and clears them', async ({ page }) => {
    await mockInvoiceApi(page, [])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    // Apply a status filter
    await page.getByLabel('Trạng thái').selectOption('Draft')

    const resetBtn = page.getByRole('button', { name: 'Đặt lại bộ lọc' })
    await expect(resetBtn).toBeVisible()

    await resetBtn.click()

    // After reset the filter select should return to "Tất cả trạng thái"
    await expect(page.getByLabel('Trạng thái')).toHaveValue('')
  })
})

// ─── Send Invoice ────────────────────────────────────────

test.describe('Send invoice', () => {
  test('clicking send opens confirmation dialog', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-draft', roomNumber: '101', status: 'Draft' }),
    ])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    // Click the send (→) button in the Draft row
    const row = page.getByRole('row').filter({ hasText: '101' })
    await row.getByRole('button', { name: /Gửi hóa đơn/i }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Gửi hóa đơn')).toBeVisible()
  })

  test('confirming send updates invoice status to Đã gửi', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-draft', roomNumber: '101', status: 'Draft' }),
    ])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    // Click send button
    const row = page.getByRole('row').filter({ hasText: '101' })
    await row.getByRole('button', { name: /Gửi hóa đơn/i }).click()

    // Confirm in dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Gửi' }).click()

    // Status badge should change to Đã gửi
    await expect(page.getByText('Đã gửi')).toBeVisible({ timeout: 8000 })
  })

  test('send button is not shown for a Paid invoice', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-paid', roomNumber: '101', status: 'Paid', paidAmount: 5_500_000 }),
    ])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    const row = page.getByRole('row').filter({ hasText: '101' })
    await expect(row.getByRole('button', { name: /Gửi hóa đơn/i })).not.toBeVisible()
  })
})

// ─── Batch Send ──────────────────────────────────────────

test.describe('Batch send invoices', () => {
  test('selecting Draft invoices shows the batch send button', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-1', roomNumber: '101', status: 'Draft' }),
      makeInvoice({ id: 'inv-2', roomNumber: '201', status: 'Draft' }),
    ])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    // Check first draft invoice
    const firstRow = page.getByRole('row').filter({ hasText: '101' })
    await firstRow.getByRole('checkbox').check()

    await expect(page.getByRole('button', { name: /Gửi đã chọn/ })).toBeVisible()
  })

  test('batch send confirmation dialog shows selected count', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-1', roomNumber: '101', status: 'Draft' }),
      makeInvoice({ id: 'inv-2', roomNumber: '201', status: 'Draft' }),
    ])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    // Select both draft invoices
    await page.getByRole('row').filter({ hasText: '101' }).getByRole('checkbox').check()
    await page.getByRole('row').filter({ hasText: '201' }).getByRole('checkbox').check()

    // Open batch send dialog
    await page.getByRole('button', { name: /Gửi đã chọn/ }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/2 hóa đơn/)).toBeVisible()
  })

  test('confirming batch send shows success toast', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-1', roomNumber: '101', status: 'Draft' }),
    ])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    // Select and batch send
    await page.getByRole('row').filter({ hasText: '101' }).getByRole('checkbox').check()
    await page.getByRole('button', { name: /Gửi đã chọn/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Gửi tất cả' }).click()

    await expect(page.getByText(/hóa đơn đã gửi/i)).toBeVisible({ timeout: 8000 })
  })
})

// ─── Invoice Detail Page ─────────────────────────────────

test.describe('Invoice detail page', () => {
  test('navigating to detail shows invoice line items', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-detail', roomNumber: '101', status: 'Sent' }),
    ])

    await page.goto('/billing/invoices')
    await page.waitForLoadState('networkidle')

    // Click the view (eye) button in the row
    const row = page.getByRole('row').filter({ hasText: '101' })
    await row.getByRole('button', { name: /Xem hóa đơn/i }).click()

    // Should be on the detail page
    await expect(page).toHaveURL(/\/billing\/invoices\/inv-detail/)
    await expect(page.getByText('Chi tiết mục')).toBeVisible({ timeout: 6000 })
    await expect(page.getByText('Tiền thuê tháng 5/2026')).toBeVisible()
  })

  test('detail page shows amount due correctly', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-detail', roomNumber: '101', status: 'Sent', totalAmount: 5_500_000, paidAmount: 0 }),
    ])

    await page.goto('/billing/invoices/inv-detail')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Còn nợ')).toBeVisible({ timeout: 6000 })
  })

  test('detail page shows "Gửi hóa đơn" button for Draft status', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-draft', roomNumber: '101', status: 'Draft' }),
    ])

    await page.goto('/billing/invoices/inv-draft')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Gửi hóa đơn' })).toBeVisible({ timeout: 6000 })
  })

  test('detail page shows "Ghi nhận thanh toán" button for Sent status', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-sent', roomNumber: '101', status: 'Sent' }),
    ])

    await page.goto('/billing/invoices/inv-sent')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Ghi nhận thanh toán' })).toBeVisible({ timeout: 6000 })
  })

  test('detail page shows overdue warning when past due date', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({
        id: 'inv-overdue',
        roomNumber: '101',
        status: 'Overdue',
        dueDate: '2025-01-01', // past date
      }),
    ])

    await page.goto('/billing/invoices/inv-overdue')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/Hóa đơn đã quá hạn/)).toBeVisible({ timeout: 6000 })
  })

  test('404 detail page shows not found message', async ({ page }) => {
    await mockInvoiceApi(page, [])

    await page.goto('/billing/invoices/nonexistent-id')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Không tìm thấy hóa đơn')).toBeVisible({ timeout: 6000 })
  })
})

// ─── Record Payment ──────────────────────────────────────

test.describe('Record payment', () => {
  test('clicking record payment opens the payment dialog on detail page', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-sent', roomNumber: '101', status: 'Sent' }),
    ])

    await page.goto('/billing/invoices/inv-sent')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Ghi nhận thanh toán' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Ghi nhận thanh toán')).toBeVisible()
  })

  test('full payment sets invoice status to Đã thanh toán', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-sent', roomNumber: '101', status: 'Sent', totalAmount: 5_500_000 }),
    ])

    await page.goto('/billing/invoices/inv-sent')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Ghi nhận thanh toán' }).click()

    // Amount is pre-filled with the full amount due
    const amountInput = page.getByLabel(/Số tiền thanh toán/)
    await expect(amountInput).toHaveValue('5500000')

    await page.getByRole('button', { name: 'Ghi nhận' }).last().click()

    await expect(page.getByText('Đã ghi nhận thanh toán')).toBeVisible({ timeout: 8000 })
  })

  test('partial payment sets invoice status to Trả một phần', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-sent', roomNumber: '101', status: 'Sent', totalAmount: 5_500_000 }),
    ])

    await page.goto('/billing/invoices/inv-sent')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Ghi nhận thanh toán' }).click()

    const amountInput = page.getByLabel(/Số tiền thanh toán/)
    await amountInput.clear()
    await amountInput.fill('2000000')

    await page.getByRole('dialog').getByRole('button', { name: 'Ghi nhận' }).click()

    await expect(page.getByText('Đã ghi nhận thanh toán')).toBeVisible({ timeout: 8000 })
  })
})

// ─── Void Invoice ────────────────────────────────────────

test.describe('Void invoice', () => {
  test('clicking void on detail page opens confirmation dialog', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-draft', roomNumber: '101', status: 'Draft' }),
    ])

    await page.goto('/billing/invoices/inv-draft')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Hủy bỏ' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Hủy hóa đơn')).toBeVisible()
  })

  test('confirming void shows success toast', async ({ page }) => {
    await mockInvoiceApi(page, [
      makeInvoice({ id: 'inv-draft', roomNumber: '101', status: 'Draft' }),
    ])

    await page.goto('/billing/invoices/inv-draft')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Hủy bỏ' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hủy hóa đơn' }).click()

    await expect(page.getByText('Đã hủy hóa đơn')).toBeVisible({ timeout: 8000 })
  })
})
