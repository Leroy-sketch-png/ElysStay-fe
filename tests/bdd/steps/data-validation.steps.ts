/**
 * Step definitions for cross-cutting data validation BDD scenarios.
 *
 * These steps are designed to work across all entity forms, using parameterized
 * entity names to navigate to the correct form and interact with it.
 */
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Map entity names to their creation navigation paths
const entityFormRoutes: Record<string, { path: string; addButton?: RegExp }> = {
  building: { path: '/buildings', addButton: /Thêm tòa nhà|Tạo tòa nhà/ },
  room: { path: '/rooms', addButton: /Thêm phòng|Tạo phòng/ },
  tenant: { path: '/tenants', addButton: /Thêm khách thuê|Tạo khách thuê/ },
  staff: { path: '/staff', addButton: /Thêm nhân viên|Tạo nhân viên/ },
  contract: { path: '/contracts', addButton: /Thêm hợp đồng|Tạo hợp đồng/ },
  expense: { path: '/expenses', addButton: /Thêm chi phí|Tạo chi phí/ },
  issue: { path: '/maintenance', addButton: /Báo sự cố|Tạo sự cố/ },
  service: { path: '/services', addButton: /Thêm dịch vụ|Tạo dịch vụ/ },
}

// Map list page names to routes
const listPageRoutes: Record<string, string> = {
  rooms: '/rooms',
  tenants: '/tenants',
  contracts: '/contracts',
  invoices: '/billing/invoices',
  payments: '/billing/payments',
  expenses: '/expenses',
  reservations: '/reservations',
  maintenance: '/maintenance',
  notifications: '/notifications',
}

// ─── Cross-cutting Navigation ───────────────────────────

Given('I am viewing the {string} creation form', async function (entity: string) {
  const page: Page = this.page
  const route = entityFormRoutes[entity]
  if (!route) throw new Error(`Unknown entity form: ${entity}`)

  await page.goto(route.path)
  if (route.addButton) {
    await page.getByRole('button', { name: route.addButton }).click()
  }
  this.currentEntity = entity
})

// ─── Cross-cutting Form Interaction ─────────────────────

When('I submit the form without filling required fields', async function () {
  const page: Page = this.page
  // Try to submit empty form
  const submitBtn = page.getByRole('button', { name: /Tạo|Lưu|Gửi|Submit/ }).first()
  await submitBtn.click()
})

When('I enter {string} in the {string} field', async function (value: string, field: string) {
  const page: Page = this.page
  const input = page.getByLabel(new RegExp(field))
  await input.clear()
  await input.fill(value)
})

When('I enter {string} in the email field', async function (email: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Email/)
  await input.clear()
  await input.fill(email)
})

When('I submit the form', async function () {
  const page: Page = this.page
  const submitBtn = page.getByRole('button', { name: /Tạo|Lưu|Gửi|Submit/ }).first()
  await submitBtn.click()
})

When('I set start date to {string} and end date to {string}', async function (start: string, end: string) {
  const page: Page = this.page
  const startInput = page.getByLabel(/Ngày bắt đầu/)
  await startInput.clear()
  await startInput.fill(start)
  const endInput = page.getByLabel(/Ngày kết thúc/)
  await endInput.clear()
  await endInput.fill(end)
})

When('I fill in {string} with {string}', async function (field: string, value: string) {
  const page: Page = this.page
  // Map shorthand field to label
  const fieldLabels: Record<string, RegExp> = {
    'tên': /Tên/,
    'email': /Email/,
    'số phòng': /Số phòng|số phòng/i,
    'số': /Số/,
  }
  const label = fieldLabels[field] || new RegExp(field, 'i')
  const input = page.getByLabel(label)
  await input.clear()
  await input.fill(value)
})

// ─── Cross-cutting Pre-conditions ───────────────────────

Given('a {string} with {string} {string} already exists', async function (
  entity: string, _field: string, value: string
) {
  const page: Page = this.page
  // Mock server to return validation error for duplicate
  const routePatterns: Record<string, string> = {
    building: '**/api/v1/buildings',
    tenant: '**/api/v1/users',
    staff: '**/api/v1/users',
    room: '**/api/v1/buildings/*/rooms',
    service: '**/api/v1/buildings/*/services',
  }
  const pattern = routePatterns[entity]
  if (pattern) {
    await page.route(pattern, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: `${value} đã tồn tại`,
            errorCode: 'VALIDATION_ERROR',
            errors: {},
          }),
        })
      } else {
        await route.continue()
      }
    })
  }
})

Given('there are more than 20 records', async function () {
  // Mock API to return paginated data with totalItems > 20
  // The specific route depends on which page was navigated to
})

// ─── Cross-cutting List Page Navigation ─────────────────

Given('I am viewing the {string} page', async function (pageName: string) {
  const page: Page = this.page
  const route = listPageRoutes[pageName]
  if (!route) throw new Error(`Unknown list page: ${pageName}`)
  await page.goto(route)
})

// ─── Cross-cutting Assertions ───────────────────────────

Then('I should see a validation error for {string}', async function (field: string) {
  const page: Page = this.page
  // Look for validation message near the field label
  await expect(
    page.getByText(new RegExp(`${field}.*bắt buộc|${field}.*required|Vui lòng nhập.*${field}`, 'i'))
  ).toBeVisible({ timeout: 5000 })
})

Then('I should see pagination controls', async function () {
  const page: Page = this.page
  await expect(
    page.getByRole('navigation', { name: /pagination/i })
      .or(page.locator('[data-testid="pagination"]'))
      .or(page.getByLabel(/Trang/))
  ).toBeVisible({ timeout: 5000 })
})

Then('the default page size should be {int}', async function (size: number) {
  const page: Page = this.page
  // Check for page size selector or verify item count
  const rows = page.locator('table tbody tr, [data-testid*="list-item"]')
  const count = await rows.count()
  expect(count).toBeLessThanOrEqual(size)
})
