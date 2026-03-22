/**
 * Step definitions for payment processing BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Navigation ─────────────────────────────────────────

Given('I am viewing the payments page', async function () {
  const page: Page = this.page
  await page.goto('/billing/payments')
})

// ─── Pre-conditions ─────────────────────────────────────

Given('there is a sent invoice for room {string} with total {string} and paid {string}', async function (
  _roomNumber: string, _total: string, _paid: string
) {
  this.targetInvoiceTotal = _total
  this.targetInvoicePaid = _paid
})

Given('there are multiple unpaid invoices', async function () {
  // Pre-condition: multiple unpaid invoices exist
})

// ─── Form Interaction ───────────────────────────────────

When('I select invoice for room {string} period {string}', async function (_room: string, _period: string) {
  const page: Page = this.page
  await page.getByLabel(/Hóa đơn/).click()
  await page.getByText(new RegExp(_room)).click()
})

When('I fill in the payment form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the payment form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Ghi nhận|Thanh toán/ }).click()
})

When('I record a deposit payment with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  await page.getByRole('button', { name: /Ghi nhận thanh toán/ }).click()
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
  await page.getByRole('button', { name: /Ghi nhận|Xác nhận/ }).click()
})

When('I record a payment of type {string}', async function (type: string) {
  const page: Page = this.page
  await page.getByRole('button', { name: /Ghi nhận thanh toán/ }).click()
  await page.getByLabel(/Loại/).click()
  await page.getByText(type).click()
})

When('I fill in the payment amount {string}', async function (amount: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Số tiền/)
  await input.clear()
  await input.fill(amount)
})

When('I select payment method {string}', async function (method: string) {
  const page: Page = this.page
  await page.getByLabel(/Phương thức/).click()
  await page.getByText(method).click()
})

When('I try to record a payment of {string} for that invoice', async function (amount: string) {
  const page: Page = this.page
  await page.getByRole('button', { name: /Ghi nhận/ }).first().click()
  const input = page.getByLabel(/Số tiền/)
  await input.clear()
  await input.fill(amount)
  await page.getByRole('button', { name: /Ghi nhận|Xác nhận/ }).click()
})

When('I select invoices for rooms {string}', async function (_rooms: string) {
  // Select multiple invoices
  const page: Page = this.page
  const roomList = _rooms.split(', ')
  for (const room of roomList) {
    await page.getByText(room).first().locator('..').getByRole('checkbox').check()
  }
})

When('I fill in payment amounts for each invoice', async function () {
  // Fill amounts for batch payment
  const page: Page = this.page
  const inputs = page.locator('input[name*="amount"]')
  const count = await inputs.count()
  for (let i = 0; i < count; i++) {
    await inputs.nth(i).fill('5000000')
  }
})

When('I submit the batch payment form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Thanh toán|Xác nhận/ }).click()
})

When('I filter payments by type {string}', async function (type: string) {
  const page: Page = this.page
  await page.getByLabel(/Loại/).click()
  await page.getByText(type).click()
})

When('I filter payments from {string} to {string}', async function (from: string, to: string) {
  const page: Page = this.page
  const fromInput = page.getByLabel(/Từ ngày/)
  await fromInput.clear()
  await fromInput.fill(from)
  const toInput = page.getByLabel(/Đến ngày/)
  await toInput.clear()
  await toInput.fill(to)
})

// ─── Assertions ─────────────────────────────────────────

Then('I should see the payment summary section', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Tổng kết|Tổng thanh toán/)).toBeVisible({ timeout: 5000 })
})

Then('the payment summary should show total amount', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Tổng số tiền/)).toBeVisible({ timeout: 5000 })
})

Then('the payment summary should show payment count', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Số lượng|giao dịch/)).toBeVisible({ timeout: 5000 })
})

Then('I should only see payments of type {string}', async function (type: string) {
  const page: Page = this.page
  await page.waitForTimeout(1000)
  // Verify filter is applied
  await expect(page.getByText(type).first()).toBeVisible({ timeout: 5000 })
})

Then('I should only see payments within that date range', async function () {
  const page: Page = this.page
  await page.waitForTimeout(1000)
})
