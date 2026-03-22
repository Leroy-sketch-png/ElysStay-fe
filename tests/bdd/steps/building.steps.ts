/**
 * Step definitions for building management BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Navigation ─────────────────────────────────────────

Given('I am viewing the buildings page', async function () {
  const page: Page = this.page
  await page.goto('/buildings')
})

// ─── Pre-conditions ─────────────────────────────────────

Given('building {string} exists', async function (name: string) {
  this.targetBuildingName = name
})

Given('building {string} already exists', async function (name: string) {
  const page: Page = this.page
  await page.route('**/api/v1/buildings', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}')
      if (body.name === name) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Tòa nhà đã tồn tại',
            errorCode: 'VALIDATION_ERROR',
            errors: { Name: ['Tòa nhà đã tồn tại'] },
          }),
        })
      } else {
        await route.continue()
      }
    } else {
      await route.continue()
    }
  })
})

Given('building {string} exists with no active contracts', async function (name: string) {
  this.targetBuildingName = name
})

// ─── Form Interaction ───────────────────────────────────

When('I fill in the building form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the building form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo tòa nhà|Lưu thay đổi/ }).click()
})

When('I submit the building form without filling required fields', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo tòa nhà|Lưu thay đổi/ }).click()
})

When('I click edit on building {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.getByText(name).locator('..')
  await row.getByRole('button', { name: /Sửa|Edit/ }).click()
})

When('I change the building name to {string}', async function (name: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Tên/)
  await input.clear()
  await input.fill(name)
})

When('I click on building {string}', async function (name: string) {
  const page: Page = this.page
  await page.getByText(name).click()
})

When('I fill in building floors with {string}', async function (floors: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Số tầng/)
  await input.clear()
  await input.fill(floors)
})

When('I fill in invoice due day with {string}', async function (day: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Ngày đến hạn/)
  await input.clear()
  await input.fill(day)
})

When('I click delete on building {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.getByText(name).locator('..')
  await row.getByRole('button', { name: /Xóa|Delete/ }).click()
})

When('I confirm the deletion', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Xác nhận/ }).click()
})

// ─── Assertions ─────────────────────────────────────────

Then('the building {string} should appear in the building list', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })
})

Then('the building {string} should not appear in the building list', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByText(name)).not.toBeVisible({ timeout: 3000 })
})

Then('I should see the building detail page', async function () {
  const page: Page = this.page
  await expect(page.locator('[data-testid="building-detail"], main')).toBeVisible({ timeout: 5000 })
})

Then('I should see building statistics', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Tổng phòng|Tổng số phòng/)).toBeVisible({ timeout: 5000 })
})

Then('I should see the occupancy rate', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Tỷ lệ|lấp đầy/i)).toBeVisible({ timeout: 5000 })
})
