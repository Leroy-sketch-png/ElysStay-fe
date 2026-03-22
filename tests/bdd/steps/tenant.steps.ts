/**
 * Step definitions for tenant management BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Navigation ─────────────────────────────────────────

Given('I am viewing the tenants page', async function () {
  const page: Page = this.page
  await page.goto('/tenants')
})

Given('I am viewing the tenant detail page for {string}', async function (name: string) {
  const page: Page = this.page
  this.targetTenantName = name
  await page.goto('/tenants')
  await page.getByText(name).click()
})

// ─── Pre-conditions ─────────────────────────────────────

Given('tenant {string} exists', async function (name: string) {
  this.targetTenantName = name
})

Given('tenant with email {string} already exists', async function (email: string) {
  const page: Page = this.page
  await page.route('**/api/v1/users/tenants', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Email đã tồn tại',
          errorCode: 'VALIDATION_ERROR',
          errors: { Email: ['Email đã tồn tại'] },
        }),
      })
    } else {
      await route.continue()
    }
  })
})

Given('tenant {string} has status {string}', async function (name: string, status: string) {
  this.targetTenantName = name
  this.targetTenantStatus = status
})

Given('there are multiple tenants in the system', async function () {
  // Pre-condition: tenants exist in the system
})

// ─── Form Interaction ───────────────────────────────────

When('I fill in the tenant form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the tenant form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo khách thuê|Lưu thay đổi/ }).click()
})

When('I submit the tenant form without filling required fields', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo khách thuê|Lưu thay đổi/ }).click()
})

When('I fill in tenant email with {string}', async function (email: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Email/)
  await input.clear()
  await input.fill(email)
})

When('I click on tenant {string}', async function (name: string) {
  const page: Page = this.page
  await page.getByText(name).click()
})

When('I click the edit profile button', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Sửa hồ sơ|Chỉnh sửa/ }).click()
})

When('I fill in the profile form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the profile form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Lưu|Cập nhật/ }).click()
})

When('I click the deactivate button for tenant {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.getByText(name).locator('..')
  await row.getByRole('button', { name: /Vô hiệu hóa/ }).click()
})

When('I confirm the deactivation', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Xác nhận/ }).click()
})

When('I click the activate button for tenant {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.getByText(name).locator('..')
  await row.getByRole('button', { name: /Kích hoạt/ }).click()
})

When('I search for {string}', async function (query: string) {
  const page: Page = this.page
  const searchInput = page.getByPlaceholder(/Tìm kiếm/)
  await searchInput.clear()
  await searchInput.fill(query)
})

// ─── Assertions ─────────────────────────────────────────

Then('the tenant {string} should appear in the tenant list', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })
})

Then('I should see the tenant detail page', async function () {
  const page: Page = this.page
  await expect(page.locator('[data-testid="tenant-detail"], main')).toBeVisible({ timeout: 5000 })
})

Then('I should see tenant profile information', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Hồ sơ|Thông tin/)).toBeVisible({ timeout: 5000 })
})

Then('I should see tenant contract history', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Hợp đồng|Lịch sử/)).toBeVisible({ timeout: 5000 })
})

Then('the tenant {string} status should change to {string}', async function (name: string, status: string) {
  const page: Page = this.page
  await expect(page.getByText(status)).toBeVisible({ timeout: 5000 })
})

Then('I should see tenants matching {string} in the results', async function (query: string) {
  const page: Page = this.page
  // At least one result should be visible
  await page.waitForTimeout(1000)
  const resultCount = await page.locator('table tbody tr, [data-testid="tenant-card"]').count()
  expect(resultCount).toBeGreaterThan(0)
})
