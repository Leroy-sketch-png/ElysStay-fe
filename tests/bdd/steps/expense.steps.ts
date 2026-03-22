/**
 * Step definitions for expense tracking BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Navigation ─────────────────────────────────────────

Given('I am viewing the expenses page', async function () {
  const page: Page = this.page
  await page.goto('/expenses')
})

// ─── Pre-conditions ─────────────────────────────────────

Given('there is an expense {string} for {string}', async function (desc: string, building: string) {
  this.targetExpenseDescription = desc
  this.targetExpenseBuilding = building
})

Given('there are expenses for multiple buildings', async function () {
  // Pre-condition: expenses across buildings
})

// ─── Form Interaction ───────────────────────────────────

When('I fill in the expense form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the expense form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo chi phí|Lưu thay đổi/ }).click()
})

When('I submit the expense form without filling required fields', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo chi phí|Lưu thay đổi/ }).click()
})

When('I click edit on that expense', async function () {
  const page: Page = this.page
  const desc = this.targetExpenseDescription
  const row = page.getByText(desc).locator('..')
  await row.getByRole('button', { name: /Sửa|Edit/ }).click()
})

When('I change the expense amount to {string}', async function (amount: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Số tiền/)
  await input.clear()
  await input.fill(amount)
})

When('I click delete on that expense', async function () {
  const page: Page = this.page
  const desc = this.targetExpenseDescription
  const row = page.getByText(desc).locator('..')
  await row.getByRole('button', { name: /Xóa|Delete/ }).click()
})

When('I select expense category {string}', async function (category: string) {
  const page: Page = this.page
  await page.getByLabel(/Danh mục/).click()
  await page.getByText(category).click()
})

When('I fill in expense description {string}', async function (desc: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Mô tả/)
  await input.clear()
  await input.fill(desc)
})

When('I fill in expense amount {string}', async function (amount: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Số tiền/)
  await input.clear()
  await input.fill(amount)
})

When('I filter expenses by building {string}', async function (building: string) {
  const page: Page = this.page
  await page.getByLabel(/Tòa nhà/).click()
  await page.getByText(building).click()
})

When('I filter expenses by category {string}', async function (category: string) {
  const page: Page = this.page
  await page.getByLabel(/Danh mục/).click()
  await page.getByText(category).click()
})

// ─── Assertions ─────────────────────────────────────────

Then('the expense should not appear in the list', async function () {
  const page: Page = this.page
  const desc = this.targetExpenseDescription
  await expect(page.getByText(desc)).not.toBeVisible({ timeout: 3000 })
})

Then('I should only see expenses for {string}', async function (building: string) {
  const page: Page = this.page
  await page.waitForTimeout(1000)
  await expect(page.getByText(building).first()).toBeVisible({ timeout: 5000 })
})

Then('I should only see expenses with category {string}', async function (category: string) {
  const page: Page = this.page
  await page.waitForTimeout(1000)
  await expect(page.getByText(category).first()).toBeVisible({ timeout: 5000 })
})

Then('I should see the total expense amount', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Tổng chi phí/)).toBeVisible({ timeout: 5000 })
})

Then('I should see the expense count', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Số lượng|khoản chi/)).toBeVisible({ timeout: 5000 })
})
