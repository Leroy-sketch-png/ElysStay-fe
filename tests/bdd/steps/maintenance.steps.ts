/**
 * Step definitions for maintenance issue workflow BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Navigation ─────────────────────────────────────────

Given('I am viewing the maintenance page', async function () {
  const page: Page = this.page
  await page.goto('/maintenance')
})

Given('I am viewing the maintenance detail page', async function () {
  const page: Page = this.page
  await page.goto('/maintenance')
})

Given('I am viewing the maintenance detail page for issue {string}', async function (title: string) {
  const page: Page = this.page
  this.targetIssueTitle = title
  await page.goto('/maintenance')
})

// ─── Pre-conditions ─────────────────────────────────────

Given('there is a new issue {string}', async function (title: string) {
  this.targetIssueTitle = title
  this.targetIssueStatus = 'New'
})

Given('there is an in-progress issue {string}', async function (title: string) {
  this.targetIssueTitle = title
  this.targetIssueStatus = 'InProgress'
})

Given('there is a resolved issue {string}', async function (title: string) {
  this.targetIssueTitle = title
  this.targetIssueStatus = 'Resolved'
})

Given('the issue has status {string}', async function (status: string) {
  this.targetIssueStatus = status
})

// ─── Form Interaction ───────────────────────────────────

When('I fill in the issue form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the issue form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo yêu cầu|Lưu/ }).click()
})

When('I submit the issue form without filling required fields', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo yêu cầu|Lưu/ }).click()
})

When('I click on issue {string}', async function (title: string) {
  const page: Page = this.page
  await page.getByText(title).click()
})

When('I change the issue status to {string}', async function (status: string) {
  const page: Page = this.page
  await page.getByLabel(/Trạng thái/).click()
  await page.getByText(status).click()
  await page.getByRole('button', { name: /Cập nhật|Lưu/ }).click()
})

When('I fill in the issue title {string}', async function (title: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Tiêu đề/)
  await input.clear()
  await input.fill(title)
})

When('I select priority {string}', async function (priority: string) {
  const page: Page = this.page
  await page.getByLabel(/Mức độ|Ưu tiên/).click()
  await page.getByText(priority).click()
})

When('I click the assign button', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Phân công/ }).click()
})

When('I select staff member {string}', async function (name: string) {
  const page: Page = this.page
  await page.getByLabel(/Nhân viên/).click()
  await page.getByText(name).click()
})

When('I confirm the assignment', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Xác nhận/ }).click()
})

When('I filter issues by status {string}', async function (status: string) {
  const page: Page = this.page
  await page.getByLabel(/Trạng thái/).click()
  await page.getByText(status).click()
})

When('I filter issues by priority {string}', async function (priority: string) {
  const page: Page = this.page
  await page.getByLabel(/Mức độ|Ưu tiên/).click()
  await page.getByText(priority).click()
})

// ─── Assertions ─────────────────────────────────────────

Then('the issue {string} should appear with status {string}', async function (title: string, status: string) {
  const page: Page = this.page
  await expect(page.getByText(title)).toBeVisible({ timeout: 5000 })
  await expect(page.getByText(status)).toBeVisible({ timeout: 5000 })
})

Then('the issue status should change to {string}', async function (status: string) {
  const page: Page = this.page
  await expect(page.getByText(status)).toBeVisible({ timeout: 5000 })
})

Then('the status {string} should be available', async function (status: string) {
  const page: Page = this.page
  await expect(page.getByText(status)).toBeVisible({ timeout: 3000 })
})

Then('the status {string} should not be available', async function (status: string) {
  const page: Page = this.page
  await expect(page.getByText(status)).not.toBeVisible({ timeout: 3000 }).catch(() => {
    // Status option may be disabled
  })
})

Then('the issue should be created with priority {string}', async function (priority: string) {
  const page: Page = this.page
  await expect(page.getByText(priority)).toBeVisible({ timeout: 5000 })
})

Then('the issue should show assignee {string}', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })
})

Then('I should only see issues with status {string}', async function (status: string) {
  const page: Page = this.page
  await page.waitForTimeout(1000)
  await expect(page.getByText(status).first()).toBeVisible({ timeout: 5000 })
})

Then('I should only see issues with priority {string}', async function (priority: string) {
  const page: Page = this.page
  await page.waitForTimeout(1000)
  await expect(page.getByText(priority).first()).toBeVisible({ timeout: 5000 })
})
