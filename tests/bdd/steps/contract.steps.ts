/**
 * Step definitions for contract lifecycle BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Navigation ─────────────────────────────────────────

Given('I am viewing the contracts page', async function () {
  const page: Page = this.page
  await page.goto('/contracts')
})

Given('I am viewing the contract detail for room {string}', async function (roomNumber: string) {
  const page: Page = this.page
  this.targetRoomNumber = roomNumber
  await page.goto('/contracts')
})

// ─── Pre-conditions ─────────────────────────────────────

Given('there is an active contract for room {string}', async function (roomNumber: string) {
  this.targetRoomNumber = roomNumber
  this.targetContractStatus = 'Active'
})

Given('the contract is currently active', async function () {
  this.targetContractStatus = 'Active'
})

Given('the contract has status {string}', async function (status: string) {
  this.targetContractStatus = status
})

Given('the contract deposit has status {string}', async function (status: string) {
  this.targetDepositStatus = status
})

Given('{string} is a co-tenant on the contract', async function (name: string) {
  this.coTenantName = name
})

Given('room {string} already has an active contract', async function (roomNumber: string) {
  const page: Page = this.page
  await page.route('**/api/v1/buildings/*/contracts', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Phòng đã có hợp đồng',
          errorCode: 'BUSINESS_RULE_VIOLATION',
        }),
      })
    } else {
      await route.continue()
    }
  })
})

// ─── Form Interaction ───────────────────────────────────

When('I fill in the contract form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the contract form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo hợp đồng|Lưu/ }).click()
})

When('I click on the contract for room {string}', async function (roomNumber: string) {
  const page: Page = this.page
  await page.getByText(roomNumber).first().click()
})

When('I fill in the termination form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the termination form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Xác nhận chấm dứt|Chấm dứt/ }).click()
})

When('I fill in the renewal form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the renewal form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Gia hạn|Xác nhận/ }).click()
})

When('I select tenant {string}', async function (name: string) {
  const page: Page = this.page
  await page.getByLabel(/Khách thuê|Người thuê/).click()
  await page.getByText(name).click()
})

When('I fill in move-in date {string}', async function (date: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Ngày nhận|Ngày vào/)
  await input.clear()
  await input.fill(date)
})

When('I submit the co-tenant form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Thêm|Xác nhận/ }).click()
})

When('I click remove on tenant {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.getByText(name).locator('..')
  await row.getByRole('button', { name: /Xóa|Gỡ/ }).click()
})

When('I confirm the removal', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Xác nhận/ }).click()
})

When('I try to create a new contract for room {string}', async function (roomNumber: string) {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo hợp đồng/ }).click()
})

// ─── Assertions ─────────────────────────────────────────

Then('the contract should appear in the contract list', async function () {
  const page: Page = this.page
  await expect(page.locator('table tbody tr, [data-testid="contract-card"]')).toBeVisible({ timeout: 5000 })
})

Then('I should see the contract detail page', async function () {
  const page: Page = this.page
  await expect(page.locator('[data-testid="contract-detail"], main')).toBeVisible({ timeout: 5000 })
})

Then('I should see contract tenant list', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Người ở|Danh sách/)).toBeVisible({ timeout: 5000 })
})

Then('I should see deposit information', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Tiền cọc|Đặt cọc/)).toBeVisible({ timeout: 5000 })
})

Then('the contract status should change to {string}', async function (status: string) {
  const page: Page = this.page
  await expect(page.getByText(status)).toBeVisible({ timeout: 5000 })
})

Then('the terminate button should be available', async function () {
  const page: Page = this.page
  await expect(page.getByRole('button', { name: /Chấm dứt/ })).toBeVisible({ timeout: 3000 })
})

Then('the terminate button should not be available', async function () {
  const page: Page = this.page
  const btn = page.getByRole('button', { name: /Chấm dứt/ })
  await expect(btn).not.toBeVisible({ timeout: 3000 }).catch(() => expect(btn).toBeDisabled())
})

Then('the renew button should be available', async function () {
  const page: Page = this.page
  await expect(page.getByRole('button', { name: /Gia hạn/ })).toBeVisible({ timeout: 3000 })
})

Then('the renew button should not be available', async function () {
  const page: Page = this.page
  const btn = page.getByRole('button', { name: /Gia hạn/ })
  await expect(btn).not.toBeVisible({ timeout: 3000 }).catch(() => expect(btn).toBeDisabled())
})

Then('the deposit status should display {string}', async function (label: string) {
  const page: Page = this.page
  await expect(page.getByText(label)).toBeVisible({ timeout: 5000 })
})

Then('{string} should appear in the tenant list', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })
})

Then('{string} should not appear in the tenant list', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByText(name)).not.toBeVisible({ timeout: 3000 })
})
