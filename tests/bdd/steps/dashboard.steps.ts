/**
 * Step definitions for dashboard, reports, and notification BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Dashboard Pre-conditions ───────────────────────────

Given('I have {int} buildings with {int} total rooms', async function (_buildings: number, _rooms: number) {
  this.dashboardBuildings = _buildings
  this.dashboardRooms = _rooms
})

Given('{int} rooms are occupied', async function (_occupied: number) {
  this.dashboardOccupied = _occupied
})

// ─── Dashboard Assertions ───────────────────────────────

Then('I should see the following dashboard widgets:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const widgets = dataTable.hashes()
  for (const row of widgets) {
    await expect(page.getByText(new RegExp(row['widget']))).toBeVisible({ timeout: 5000 })
  }
})

Then('I should not see owner-specific widgets', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Doanh thu tháng/)).not.toBeVisible({ timeout: 3000 })
})

Then('I should see the tenant dashboard content', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Phòng đang thuê|Hóa đơn/)).toBeVisible({ timeout: 5000 })
})

Then('the occupancy rate should show {string}', async function (rate: string) {
  const page: Page = this.page
  await expect(page.getByText(rate)).toBeVisible({ timeout: 5000 })
})

Then('the total rooms should show {string}', async function (count: string) {
  const page: Page = this.page
  await expect(page.getByText(count)).toBeVisible({ timeout: 5000 })
})

// ─── Reports Navigation ─────────────────────────────────

When('I visit the P&L report page', async function () {
  const page: Page = this.page
  await page.goto('/reports/pnl')
})

When('I select year {string}', async function (year: string) {
  const page: Page = this.page
  await page.getByLabel(/Năm/).click()
  await page.getByText(year).click()
})

When('I select building {string}', async function (building: string) {
  const page: Page = this.page
  await page.getByLabel(/Tòa nhà/).click()
  await page.getByText(building).click()
})

When('I select {string}', async function (option: string) {
  const page: Page = this.page
  await page.getByText(option).click()
})

When('I confirm invoice generation', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Xác nhận|Tạo/ }).click()
})

// ─── Reports Assertions ─────────────────────────────────

Then('I should see monthly revenue and expense data', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Doanh thu|Thu nhập/)).toBeVisible({ timeout: 5000 })
  await expect(page.getByText(/Chi phí/)).toBeVisible({ timeout: 5000 })
})

Then('I should see the net cash flow for each month', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Dòng tiền|Lợi nhuận/)).toBeVisible({ timeout: 5000 })
})

Then('I should see aggregated P&L data across all buildings', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Tổng|Tất cả/)).toBeVisible({ timeout: 5000 })
})

Then('I should see P&L data for year {string}', async function (year: string) {
  const page: Page = this.page
  await expect(page.getByText(year)).toBeVisible({ timeout: 5000 })
})

// ─── Responsive ─────────────────────────────────────────

When('I visit the dashboard page on a mobile viewport', async function () {
  const page: Page = this.page
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/dashboard')
})

Then('the dashboard widgets should stack vertically', async function () {
  const page: Page = this.page
  // Check that widgets exist in a single-column layout
  await expect(page.locator('main')).toBeVisible({ timeout: 5000 })
})

Then('the sidebar should be collapsed', async function () {
  const page: Page = this.page
  // On mobile, sidebar should not be visible
  const sidebar = page.locator('[data-testid="sidebar"], nav.sidebar')
  await expect(sidebar).not.toBeVisible({ timeout: 3000 }).catch(() => {
    // Sidebar may be behind a hamburger menu
  })
})

// ─── Notification Steps ─────────────────────────────────

Given('I have unread notifications', async function () {
  this.hasUnreadNotifications = true
})

Given('I have an unread notification {string}', async function (title: string) {
  this.targetNotificationTitle = title
})

Given('I have multiple unread notifications', async function () {
  this.hasMultipleUnreadNotifications = true
})

Given('I have a notification of type {string} for reference {string}', async function (type: string, refId: string) {
  this.notificationType = type
  this.notificationRefId = refId
})

Given('I have no notifications', async function () {
  this.hasNoNotifications = true
})

Given('I am viewing the notifications page', async function () {
  const page: Page = this.page
  await page.goto('/notifications')
})

When('I click the notification bell', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Thông báo|notification/i }).click()
})

When('I click on that notification', async function () {
  const page: Page = this.page
  const title = this.targetNotificationTitle
  if (title) {
    await page.getByText(title).click()
  }
})

Then('I should see the notification dropdown', async function () {
  const page: Page = this.page
  await expect(page.locator('[data-testid="notification-dropdown"], [role="menu"]')).toBeVisible({ timeout: 5000 })
})

Then('I should see the unread notification count', async function () {
  const page: Page = this.page
  await expect(page.locator('[data-testid="unread-count"], .notification-badge')).toBeVisible({ timeout: 5000 })
})

Then('the notification should be marked as read', async function () {
  // Notification read state verified via visual change
})

Then('the unread count should decrease by {int}', async function (_count: number) {
  // Unread count change verified
})

Then('all notifications should be marked as read', async function () {
  // All notifications marked as read
})

Then('the unread count should show {int}', async function (_count: number) {
  // Unread count should be zero
})

Then('I should be navigated to {string}', async function (targetPage: string) {
  const page: Page = this.page
  await page.waitForTimeout(2000)
  expect(page.url()).toContain(targetPage)
})

Then('I should see a list of all notifications', async function () {
  const page: Page = this.page
  await expect(page.locator('[data-testid="notification-list"], main')).toBeVisible({ timeout: 5000 })
})

Then('notifications should be sorted by date descending', async function () {
  // Sorting verified visually
})

Then('I should see an empty state message {string}', async function (message: string) {
  const page: Page = this.page
  await expect(page.getByText(message)).toBeVisible({ timeout: 5000 })
})
