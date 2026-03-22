/**
 * Step definitions for meter reading and service management BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Meter Reading Navigation ───────────────────────────

Given('I am viewing the meter readings page', async function () {
  const page: Page = this.page
  await page.goto('/billing/meter-readings')
})

// ─── Meter Pre-conditions ───────────────────────────────

Given('building {string} has metered services', async function (building: string) {
  this.targetBuilding = building
})

Given('there are existing readings for {string}', async function (period: string) {
  this.targetPeriod = period
})

Given('I select building {string} with {int} rooms', async function (building: string, _rooms: number) {
  const page: Page = this.page
  await page.getByLabel(/Tòa nhà/).click()
  await page.getByText(building).click()
})

// ─── Meter Form Interaction ─────────────────────────────

When('I fill in meter readings:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    // Locate the reading row by room and service
    const readingRow = page.getByText(row['room']).locator('..').filter({ hasText: row['service'] })
    if (row['previous']) {
      const prevInput = readingRow.getByLabel(/Chỉ số trước|Cũ/)
      await prevInput.clear()
      await prevInput.fill(row['previous'])
    }
    const currentInput = readingRow.getByLabel(/Chỉ số hiện tại|Mới/)
    await currentInput.clear()
    await currentInput.fill(row['current'])
  }
})

When('I submit the meter readings', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Lưu chỉ số|Lưu/ }).click()
})

When('I change the current reading for room {string} service {string} to {string}', async function (
  room: string, service: string, value: string
) {
  const page: Page = this.page
  const readingRow = page.getByText(room).locator('..').filter({ hasText: service })
  const input = readingRow.getByLabel(/Chỉ số hiện tại|Mới/)
  await input.clear()
  await input.fill(value)
})

When('I enter previous reading {string} and current reading {string}', async function (prev: string, curr: string) {
  const page: Page = this.page
  const prevInput = page.getByLabel(/Chỉ số trước|Cũ/).first()
  await prevInput.clear()
  await prevInput.fill(prev)
  const currInput = page.getByLabel(/Chỉ số hiện tại|Mới/).first()
  await currInput.clear()
  await currInput.fill(curr)
})

When('I fill in a meter reading with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const readingRow = page.getByText(row['room']).locator('..').filter({ hasText: row['service'] })
    if (row['previous']) {
      const prevInput = readingRow.getByLabel(/Chỉ số trước|Cũ/)
      await prevInput.clear()
      await prevInput.fill(row['previous'])
    }
    const currentInput = readingRow.getByLabel(/Chỉ số hiện tại|Mới/)
    await currentInput.clear()
    await currentInput.fill(row['current'])
  }
})

When('I select billing period {string}', async function (period: string) {
  const page: Page = this.page
  await page.getByLabel(/Kỳ|Tháng/).click()
  await page.getByText(period).click()
})

// ─── Meter Assertions ───────────────────────────────────

Then('the consumption for room {string} {string} should show {string}', async function (
  room: string, service: string, consumption: string
) {
  const page: Page = this.page
  const readingRow = page.getByText(room).locator('..').filter({ hasText: service })
  await expect(readingRow.getByText(consumption)).toBeVisible({ timeout: 5000 })
})

Then('the consumption should automatically show {string}', async function (consumption: string) {
  const page: Page = this.page
  await expect(page.getByText(consumption).first()).toBeVisible({ timeout: 5000 })
})

Then('I should see meter reading rows for all rooms with metered services', async function () {
  const page: Page = this.page
  const rows = page.locator('table tbody tr, [data-testid="reading-row"]')
  const count = await rows.count()
  expect(count).toBeGreaterThan(0)
})

Then('previous readings should be pre-filled from last month', async function () {
  const page: Page = this.page
  const prevInputs = page.locator('input[name*="previous"], input[aria-label*="Chỉ số trước"]')
  const count = await prevInputs.count()
  expect(count).toBeGreaterThan(0)
})

Then('I should see meter readings for {string}', async function (period: string) {
  const page: Page = this.page
  await expect(page.getByText(period)).toBeVisible({ timeout: 5000 })
})

// ─── Service Navigation ─────────────────────────────────

Given('I am viewing the services page for building {string}', async function (building: string) {
  const page: Page = this.page
  this.targetBuilding = building
  // Navigate to building services page
  await page.goto('/buildings')
  await page.getByText(building).click()
})

Given('I am viewing room services for room {string} in building {string}', async function (
  room: string, building: string
) {
  const page: Page = this.page
  this.targetRoomNumber = room
  this.targetBuilding = building
  await page.goto('/rooms')
})

// ─── Service Pre-conditions ─────────────────────────────

Given('service {string} exists with price {string}', async function (name: string, price: string) {
  this.targetServiceName = name
  this.targetServicePrice = price
})

Given('service {string} already exists', async function (name: string) {
  const page: Page = this.page
  await page.route('**/api/v1/buildings/*/services', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Dịch vụ đã tồn tại',
          errorCode: 'VALIDATION_ERROR',
          errors: { Name: ['Dịch vụ đã tồn tại'] },
        }),
      })
    } else {
      await route.continue()
    }
  })
})

Given('room {string} has service {string} at building price {string}', async function (
  room: string, service: string, price: string
) {
  this.targetRoomNumber = room
  this.targetServiceName = service
  this.targetBuildingPrice = price
})

// ─── Service Form Interaction ───────────────────────────

When('I fill in the service form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    if (row['field'] === 'Có đồng hồ') {
      const toggle = page.getByLabel(/Có đồng hồ|Metered/)
      if (row['value'] === 'Có') {
        await toggle.check()
      } else {
        await toggle.uncheck()
      }
    } else {
      const input = page.getByLabel(new RegExp(row['field']))
      await input.clear()
      await input.fill(row['value'])
    }
  }
})

When('I submit the service form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo dịch vụ|Lưu/ }).click()
})

When('I click edit on service {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.getByText(name).locator('..')
  await row.getByRole('button', { name: /Sửa|Edit/ }).click()
})

When('I change the unit price to {string}', async function (price: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Đơn giá/)
  await input.clear()
  await input.fill(price)
})

When('I fill in service unit price {string}', async function (price: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Đơn giá/)
  await input.clear()
  await input.fill(price)
})

When('I fill in service name {string}', async function (name: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Tên dịch vụ/)
  await input.clear()
  await input.fill(name)
})

When('I set a custom price of {string} for {string}', async function (price: string, service: string) {
  const page: Page = this.page
  const row = page.getByText(service).locator('..')
  const input = row.getByLabel(/Giá riêng|Override/)
  await input.clear()
  await input.fill(price)
})

When('I save room service overrides', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Lưu/ }).click()
})

When('I disable service {string} for room {string}', async function (service: string, _room: string) {
  const page: Page = this.page
  const row = page.getByText(service).locator('..')
  await row.getByRole('switch').click()
})

// ─── Service Assertions ─────────────────────────────────

Then('the service {string} should appear in the service list', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })
})

Then('the previous price {string} should be displayed', async function (price: string) {
  const page: Page = this.page
  await expect(page.getByText(price)).toBeVisible({ timeout: 5000 })
})

Then('the effective price for {string} in room {string} should show {string}', async function (
  service: string, _room: string, price: string
) {
  const page: Page = this.page
  const row = page.getByText(service).locator('..')
  await expect(row.getByText(price)).toBeVisible({ timeout: 5000 })
})

Then('service {string} should show as disabled for room {string}', async function (service: string, _room: string) {
  const page: Page = this.page
  const row = page.getByText(service).locator('..')
  await expect(row.getByText(/Tắt|Disabled/)).toBeVisible({ timeout: 5000 })
})
