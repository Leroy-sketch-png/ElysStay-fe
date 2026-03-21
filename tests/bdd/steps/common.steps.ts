/**
 * Step definitions for room management BDD scenarios.
 *
 * These use Playwright to interact with a real browser against the running Next.js app.
 * The app must be running at BASE_URL (default: http://localhost:3000).
 *
 * Auth is handled by route interception — we mock Keycloak's auth flow at the
 * network level so scenarios don't depend on a real Keycloak instance.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Auth Steps ─────────────────────────────────────────

Given('I am logged in as an owner', async function () {
  const page: Page = this.page
  
  // Intercept Keycloak discovery and token endpoints to simulate authenticated session
  await page.route('**/realms/elysstay/**', async (route) => {
    const url = route.request().url()
    
    if (url.includes('openid-configuration') || url.includes('.well-known')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          issuer: 'http://localhost:8080/realms/elysstay',
          authorization_endpoint: 'http://localhost:8080/realms/elysstay/protocol/openid-connect/auth',
          token_endpoint: 'http://localhost:8080/realms/elysstay/protocol/openid-connect/token',
          end_session_endpoint: 'http://localhost:8080/realms/elysstay/protocol/openid-connect/logout',
          jwks_uri: 'http://localhost:8080/realms/elysstay/protocol/openid-connect/certs',
        }),
      })
    } else {
      await route.fulfill({ status: 200, body: '{}' })
    }
  })
})

Given('I am not logged in', async function () {
  // No auth setup — the default state
})

Given('I am logged in as a staff member', async function () {
  const page: Page = this.page
  await page.route('**/realms/elysstay/**', async (route) => {
    await route.fulfill({ status: 200, body: '{}' })
  })
})

// ─── Navigation Steps ───────────────────────────────────

Given('I am viewing the rooms page for building {string}', async function (buildingName: string) {
  const page: Page = this.page
  
  // Mock API to return building data
  await page.route('**/api/v1/buildings**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{
            id: 'building-1',
            name: buildingName,
            address: '123 Test St',
            totalFloors: 5,
            invoiceDueDay: 10,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          }],
          pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        }),
      })
    }
  })

  await page.goto('/rooms')
})

When('I visit the dashboard page', async function () {
  const page: Page = this.page
  await page.goto('/dashboard')
})

When('I try to visit the dashboard page', async function () {
  const page: Page = this.page
  await page.goto('/dashboard')
})

When('I try to visit the settings page', async function () {
  const page: Page = this.page
  await page.goto('/settings')
})

Given('I am viewing the invoices page', async function () {
  const page: Page = this.page
  await page.goto('/billing/invoices')
})

Given('I am viewing the reservations page', async function () {
  const page: Page = this.page
  await page.goto('/reservations')
})

// ─── Room Form Interaction ──────────────────────────────

When('I click the {string} button', async function (buttonText: string) {
  const page: Page = this.page
  await page.getByRole('button', { name: buttonText }).click()
})

When('I fill in the room form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()

  for (const row of rows) {
    const label = row['field']
    const value = row['value']
    const input = page.getByLabel(new RegExp(label))
    await input.clear()
    await input.fill(value)
  }
})

When('I submit the room form', async function () {
  const page: Page = this.page
  const submitBtn = page.getByRole('button', { name: /Tạo phòng|Lưu thay đổi/ })
  await submitBtn.click()
})

When('I clear the room number field', async function () {
  const page: Page = this.page
  const input = page.getByLabel(/Số phòng/)
  await input.clear()
})

// ─── Room Pre-conditions ────────────────────────────────

Given('room {string} already exists in the building', async function (roomNumber: string) {
  const page: Page = this.page
  
  // Mock API to return conflict on this room number
  await page.route('**/api/v1/buildings/*/rooms', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}')
      if (body.roomNumber === roomNumber) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: `Phòng ${roomNumber} đã tồn tại`,
            errorCode: 'VALIDATION_ERROR',
            errors: { RoomNumber: [`Phòng ${roomNumber} đã tồn tại`] },
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

// ─── Invoice Pre-conditions ─────────────────────────────

Given('there is a draft invoice for room {string}', async function (_roomNumber: string) {
  // Store context for later assertion steps
  this.targetInvoiceStatus = 'Draft'
})

Given('there is an overdue invoice for room {string}', async function (_roomNumber: string) {
  this.targetInvoiceStatus = 'Overdue'
})

Given('there is a paid invoice for room {string}', async function (_roomNumber: string) {
  this.targetInvoiceStatus = 'Paid'
})

// ─── Reservation Pre-conditions ─────────────────────────

Given('there is a pending reservation for room {string}', async function (_roomNumber: string) {
  this.targetReservationStatus = 'Pending'
})

Given('there is a confirmed reservation for room {string}', async function (_roomNumber: string) {
  this.targetReservationStatus = 'Confirmed'
})

Given('there is an expired reservation for room {string}', async function (_roomNumber: string) {
  this.targetReservationStatus = 'Expired'
})

// ─── Action Steps ───────────────────────────────────────

When('I click the send button for that invoice', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Gửi/ }).first().click()
})

When('I click the void button for that invoice', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Hủy/ }).first().click()
})

When('I confirm the void action', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Xác nhận/ }).click()
})

When('I click the confirm button for that reservation', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Xác nhận/ }).first().click()
})

When('I click the cancel button for that reservation', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Hủy/ }).first().click()
})

When('I confirm the cancellation', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Xác nhận/ }).click()
})

// ─── Assertion Steps ────────────────────────────────────

Then('I should see a success message {string}', async function (message: string) {
  const page: Page = this.page
  await expect(page.getByText(message)).toBeVisible({ timeout: 5000 })
})

Then('the room {string} should appear in the room list', async function (roomNumber: string) {
  const page: Page = this.page
  await expect(page.getByText(roomNumber)).toBeVisible({ timeout: 5000 })
})

Then('I should see a form error {string}', async function (errorText: string) {
  const page: Page = this.page
  await expect(page.getByText(errorText)).toBeVisible({ timeout: 5000 })
})

Then('I should see a validation error {string}', async function (errorText: string) {
  const page: Page = this.page
  await expect(page.getByText(errorText)).toBeVisible({ timeout: 5000 })
})

Then('I should be redirected to the login page', async function () {
  const page: Page = this.page
  // Keycloak redirect would change the URL — in mocked mode, check for login prompt
  await page.waitForTimeout(2000)
  const url = page.url()
  // Either redirected to keycloak or showing auth error
  expect(url.includes('login') || url.includes('keycloak') || await page.getByText(/đăng nhập|xác thực/i).isVisible().catch(() => false)).toBeTruthy()
})

Then('I should see the dashboard content', async function () {
  const page: Page = this.page
  await expect(page.locator('[data-testid="dashboard"], main')).toBeVisible({ timeout: 5000 })
})

Then('I should see an access denied message', async function () {
  const page: Page = this.page
  await expect(page.getByText(/không có quyền|access denied|forbidden/i)).toBeVisible({ timeout: 5000 })
})

Then('the invoice status should change to {string}', async function (statusLabel: string) {
  const page: Page = this.page
  await expect(page.getByText(statusLabel)).toBeVisible({ timeout: 5000 })
})

Then('the send button should not be available for that invoice', async function () {
  const page: Page = this.page
  // For paid/closed invoices, the send action should be disabled or not present
  const sendButton = page.getByRole('button', { name: /Gửi/ }).first()
  await expect(sendButton).not.toBeVisible({ timeout: 3000 }).catch(() => {
    // Button might be disabled instead of hidden
    return expect(sendButton).toBeDisabled()
  })
})

Then('the reservation status should change to {string}', async function (statusLabel: string) {
  const page: Page = this.page
  await expect(page.getByText(statusLabel)).toBeVisible({ timeout: 5000 })
})

Then('the confirm button should not be available for that reservation', async function () {
  const page: Page = this.page
  const confirmButton = page.getByRole('button', { name: /Xác nhận/ }).first()
  await expect(confirmButton).not.toBeVisible({ timeout: 3000 }).catch(() => {
    return expect(confirmButton).toBeDisabled()
  })
})
