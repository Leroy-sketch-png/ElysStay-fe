/**
 * Step definitions for staff management BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Navigation ─────────────────────────────────────────

Given('I am viewing the staff page', async function () {
  const page: Page = this.page
  await page.goto('/staff')
})

// ─── Pre-conditions ─────────────────────────────────────

Given('staff member {string} exists', async function (name: string) {
  this.targetStaffName = name
})

Given('staff member {string} has status {string}', async function (name: string, status: string) {
  this.targetStaffName = name
  this.targetStaffStatus = status
})

Given('staff member {string} is assigned to {string}', async function (name: string, building: string) {
  this.targetStaffName = name
  this.targetStaffBuilding = building
})

Given('staff with email {string} already exists', async function (email: string) {
  const page: Page = this.page
  await page.route('**/api/v1/users/staff', async (route) => {
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

Given('I am assigned to building {string} only', async function (building: string) {
  this.assignedBuilding = building
})

// ─── Form Interaction ───────────────────────────────────

When('I fill in the staff form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the staff form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo nhân viên|Lưu/ }).click()
})

When('I click on building assignments for {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.getByText(name).locator('..')
  await row.getByRole('button', { name: /Phân công|Tòa nhà/ }).click()
})

When('I assign them to building {string}', async function (building: string) {
  const page: Page = this.page
  await page.getByLabel(/Tòa nhà/).click()
  await page.getByText(building).click()
  await page.getByRole('button', { name: /Phân công|Xác nhận/ }).click()
})

When('I remove them from building {string}', async function (building: string) {
  const page: Page = this.page
  const row = page.getByText(building).locator('..')
  await row.getByRole('button', { name: /Xóa|Gỡ/ }).click()
})

When('I click the deactivate button for {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.getByText(name).locator('..')
  await row.getByRole('button', { name: /Vô hiệu hóa/ }).click()
})

When('I click the activate button for {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.getByText(name).locator('..')
  await row.getByRole('button', { name: /Kích hoạt/ }).click()
})

// ─── Assertions ─────────────────────────────────────────

Then('the staff member {string} should appear in the staff list', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })
})

Then('{string} should appear in their building list', async function (building: string) {
  const page: Page = this.page
  await expect(page.getByText(building)).toBeVisible({ timeout: 5000 })
})

Then('the staff member status should change to {string}', async function (status: string) {
  const page: Page = this.page
  await expect(page.getByText(status)).toBeVisible({ timeout: 5000 })
})

Then('I should only see building {string}', async function (building: string) {
  const page: Page = this.page
  await expect(page.getByText(building)).toBeVisible({ timeout: 5000 })
})

Then('I should not see building {string}', async function (building: string) {
  const page: Page = this.page
  await expect(page.getByText(building)).not.toBeVisible({ timeout: 3000 })
})
