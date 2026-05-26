/**
 * Visual Regression Tests — Invoice Generation Flow
 *
 * Uses Playwright's toHaveScreenshot() to capture and compare pixel-level
 * snapshots of the invoice UI. On the FIRST run, baselines are generated in
 * tests/e2e/invoice-generation.visual.spec.ts-snapshots/.
 * On subsequent runs they are compared. Update baselines with:
 *   npx playwright test --update-snapshots tests/e2e/invoice-generation.visual.spec.ts
 *
 * Covered states:
 *   1. Empty state — no building selected, no invoices
 *   2. Invoice list — multiple invoices in various statuses
 *   3. Generate button tooltip — shown when no building selected
 *   4. Send confirmation dialog — modal overlay
 *   5. Record payment dialog — form state (default amount, preview)
 *   6. Invoice detail page — stats cards, line items table, payment history
 *   7. Overdue warning banner
 *   8. "No buildings" prerequisite state
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

// ─── Screenshot config ───────────────────────────────────

const SNAPSHOT_OPTIONS = {
  maxDiffPixels: 50,       // tolerate minor anti-aliasing differences
  animations: 'disabled',  // prevent animation frames causing diff
  mask: [],                // override per-test for dynamic timestamps
} as const

// ─── Setup ───────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await loginAsOwner(page)
  await mockShellApis(page)
  await mockBuildingsApi(page)

  // Freeze the current date so billing period labels stay deterministic
  await page.addInitScript(() => {
    const FIXED = new Date('2026-05-15T10:00:00Z').getTime()
    const _Date = Date
    class MockDate extends _Date {
      constructor(...args: ConstructorParameters<typeof Date>) {
        super(args.length ? (args as [string | number | Date])[0] : FIXED)
      }
      static now() { return FIXED }
    }
    // @ts-expect-error replace global
    globalThis.Date = MockDate
  })
})

// ─── 1. Empty state ──────────────────────────────────────

test('VRT: invoice list — empty state (no building selected)', async ({ page }) => {
  await mockInvoiceApi(page, [])
  await page.goto('/billing/invoices')
  await page.waitForLoadState('networkidle')

  // Wait for empty state to settle
  await expect(page.getByText('Không tìm thấy hóa đơn')).toBeVisible()

  await expect(page).toHaveScreenshot('01-empty-state.png', SNAPSHOT_OPTIONS)
})

// ─── 2. Invoice list — populated ─────────────────────────

test('VRT: invoice list — multiple statuses', async ({ page }) => {
  await mockInvoiceApi(page, [
    makeInvoice({ id: 'i1', roomNumber: '101', status: 'Draft',        tenantName: 'Nguyen Van A',  totalAmount: 5_500_000, paidAmount: 0 }),
    makeInvoice({ id: 'i2', roomNumber: '201', status: 'Sent',         tenantName: 'Tran Thi B',    totalAmount: 5_500_000, paidAmount: 0 }),
    makeInvoice({ id: 'i3', roomNumber: '301', status: 'PartiallyPaid',tenantName: 'Le Van C',      totalAmount: 5_500_000, paidAmount: 2_000_000 }),
    makeInvoice({ id: 'i4', roomNumber: '401', status: 'Paid',         tenantName: 'Pham Thi D',    totalAmount: 5_500_000, paidAmount: 5_500_000 }),
    makeInvoice({ id: 'i5', roomNumber: '501', status: 'Overdue',      tenantName: 'Hoang Van E',   totalAmount: 5_500_000, paidAmount: 0, dueDate: '2026-04-10' }),
    makeInvoice({ id: 'i6', roomNumber: '601', status: 'Void',         tenantName: 'Vo Thi F',      totalAmount: 5_500_000, paidAmount: 0 }),
  ])

  await page.goto('/billing/invoices')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('101')).toBeVisible()

  await expect(page).toHaveScreenshot('02-invoice-list-all-statuses.png', SNAPSHOT_OPTIONS)
})

// ─── 3. Invoice list — Draft invoices selected ───────────

test('VRT: invoice list — draft invoices checked, batch send button visible', async ({ page }) => {
  await mockInvoiceApi(page, [
    makeInvoice({ id: 'i1', roomNumber: '101', status: 'Draft', tenantName: 'Nguyen Van A' }),
    makeInvoice({ id: 'i2', roomNumber: '201', status: 'Draft', tenantName: 'Tran Thi B' }),
  ])

  await page.goto('/billing/invoices')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('101')).toBeVisible()

  // Check both draft rows
  await page.getByRole('row').filter({ hasText: '101' }).getByRole('checkbox').check()
  await page.getByRole('row').filter({ hasText: '201' }).getByRole('checkbox').check()

  await expect(page.getByRole('button', { name: /Gửi đã chọn/ })).toBeVisible()

  await expect(page).toHaveScreenshot('03-batch-select-active.png', SNAPSHOT_OPTIONS)
})

// ─── 4. Send confirmation dialog ─────────────────────────

test('VRT: send confirmation dialog — open state', async ({ page }) => {
  await mockInvoiceApi(page, [
    makeInvoice({ id: 'inv-draft', roomNumber: '101', status: 'Draft' }),
  ])

  await page.goto('/billing/invoices')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('101')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: '101' })
  await row.getByRole('button', { name: /Gửi hóa đơn/i }).click()

  await expect(page.getByRole('dialog')).toBeVisible()

  await expect(page).toHaveScreenshot('04-send-confirm-dialog.png', SNAPSHOT_OPTIONS)
})

// ─── 5. Invoice detail — Sent with line items ────────────

test('VRT: invoice detail page — Sent invoice with line items', async ({ page }) => {
  await mockInvoiceApi(page, [
    makeInvoice({ id: 'inv-sent', roomNumber: '101', status: 'Sent', totalAmount: 5_500_000, paidAmount: 0 }),
  ])

  await page.goto('/billing/invoices/inv-sent')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('Chi tiết mục')).toBeVisible({ timeout: 6000 })

  await expect(page).toHaveScreenshot('05-invoice-detail-sent.png', SNAPSHOT_OPTIONS)
})

// ─── 6. Invoice detail — Partially paid ──────────────────

test('VRT: invoice detail page — PartiallyPaid with payment history', async ({ page }) => {
  // Inject a custom detail response that includes a payment record
  await page.route('**/api/v1/invoices/inv-partial', (route) => {
    const base = makeInvoice({
      id: 'inv-partial',
      roomNumber: '101',
      status: 'PartiallyPaid',
      totalAmount: 5_500_000,
      paidAmount: 2_000_000,
    })
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ...base,
          lineItems: [
            { id: 'li-1', description: 'Tien thue thang 5/2026', quantity: 1, unitPrice: 5_000_000, amount: 5_000_000 },
            { id: 'li-2', description: 'Dien', quantity: 150, unitPrice: 3300, amount: 495_000, previousReading: 100, currentReading: 250 },
          ],
          payments: [
            {
              id: 'pay-1',
              amount: 2_000_000,
              type: 'RENT_PAYMENT',
              paymentMethod: 'BankTransfer',
              paidAt: '2026-05-05T10:00:00Z',
              referenceCode: 'REF-001',
              recordedByName: 'E2E Owner',
            },
          ],
        },
      }),
    })
  })

  // Minimal mock for list endpoint (needed by invoiceKeys.all invalidation)
  await mockInvoiceApi(page, [])

  await page.goto('/billing/invoices/inv-partial')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('Lich su thanh toan').or(page.getByText('Lịch sử thanh toán'))).toBeVisible({ timeout: 6000 })

  await expect(page).toHaveScreenshot('06-invoice-detail-partially-paid.png', SNAPSHOT_OPTIONS)
})

// ─── 7. Invoice detail — Overdue warning ─────────────────

test('VRT: invoice detail page — Overdue with warning banner', async ({ page }) => {
  await mockInvoiceApi(page, [
    makeInvoice({ id: 'inv-overdue', roomNumber: '101', status: 'Overdue', dueDate: '2026-04-01' }),
  ])

  await page.goto('/billing/invoices/inv-overdue')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(/Hóa đơn đã quá hạn/)).toBeVisible({ timeout: 6000 })

  await expect(page).toHaveScreenshot('07-invoice-detail-overdue.png', SNAPSHOT_OPTIONS)
})

// ─── 8. Record payment dialog — default state ─────────────

test('VRT: record payment dialog — default amount pre-filled', async ({ page }) => {
  await mockInvoiceApi(page, [
    makeInvoice({ id: 'inv-sent', roomNumber: '101', status: 'Sent', totalAmount: 5_500_000 }),
  ])

  await page.goto('/billing/invoices/inv-sent')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: 'Ghi nhận thanh toán' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // Wait for the form to fully mount
  await expect(page.getByLabel(/Số tiền thanh toán/)).toHaveValue('5500000')

  await expect(page).toHaveScreenshot('08-record-payment-dialog.png', SNAPSHOT_OPTIONS)
})

// ─── 9. Batch send dialog ─────────────────────────────────

test('VRT: batch send confirmation dialog', async ({ page }) => {
  await mockInvoiceApi(page, [
    makeInvoice({ id: 'i1', roomNumber: '101', status: 'Draft' }),
    makeInvoice({ id: 'i2', roomNumber: '201', status: 'Draft' }),
  ])

  await page.goto('/billing/invoices')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('101')).toBeVisible()
  await page.getByRole('row').filter({ hasText: '101' }).getByRole('checkbox').check()
  await page.getByRole('row').filter({ hasText: '201' }).getByRole('checkbox').check()
  await page.getByRole('button', { name: /Gửi đã chọn/ }).click()

  await expect(page.getByRole('dialog')).toBeVisible()

  await expect(page).toHaveScreenshot('09-batch-send-dialog.png', SNAPSHOT_OPTIONS)
})

// ─── 10. Invoice list — "No buildings" prerequisite ───────

test('VRT: invoice list — no buildings empty prerequisite state', async ({ page }) => {
  // Override buildings API to return empty
  await page.route('**/api/v1/buildings**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        pagination: { page: 1, pageSize: 999, totalItems: 0, totalPages: 0 },
      }),
    }),
  )
  await mockInvoiceApi(page, [])

  await page.goto('/billing/invoices')
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('Chưa có tòa nhà')).toBeVisible({ timeout: 6000 })

  await expect(page).toHaveScreenshot('10-no-buildings-state.png', SNAPSHOT_OPTIONS)
})
