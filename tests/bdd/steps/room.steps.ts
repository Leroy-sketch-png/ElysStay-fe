/**
 * Step definitions for room management BDD scenarios (non-CRUD steps).
 *
 * Room CRUD form steps live in common.steps.ts.
 * This file covers: edit, status toggle, filtering, and room-specific assertions.
 */
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ─── Room Pre-conditions ────────────────────────────────

Given('room {string} is displayed in the room list', async function (roomNumber: string) {
  const page: Page = this.page
  await expect(page.getByText(roomNumber)).toBeVisible({ timeout: 5000 })
})

Given('room {string} has status {string}', async function (roomNumber: string, status: string) {
  this.targetRoom = roomNumber
  this.targetRoomStatus = status
})

Given('room {string} is currently occupied', async function (roomNumber: string) {
  this.targetRoom = roomNumber
  this.targetRoomStatus = 'Occupied'
})

// ─── Room Edit Interaction ──────────────────────────────

When('I click edit on room {string}', async function (roomNumber: string) {
  const page: Page = this.page
  const row = page.getByText(roomNumber).locator('..')
  await row.getByRole('button', { name: /Sửa|Edit/ }).click()
})

When('I change the room price to {string}', async function (price: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Giá/)
  await input.clear()
  await input.fill(price)
})

// ─── Room Status Toggle ─────────────────────────────────

When('I toggle the status of room {string}', async function (roomNumber: string) {
  const page: Page = this.page
  const row = page.getByText(roomNumber).locator('..')
  await row.getByRole('button', { name: /Chuyển trạng thái|Toggle/ }).click()
})

// ─── Room Filtering ─────────────────────────────────────

When('I filter rooms by status {string}', async function (status: string) {
  const page: Page = this.page
  await page.getByLabel(/Trạng thái/).click()
  await page.getByText(status).click()
})

// ─── Room Assertions ────────────────────────────────────

Then('the room {string} status should change to {string}', async function (
  roomNumber: string, newStatus: string
) {
  const page: Page = this.page
  const row = page.getByText(roomNumber).locator('..')
  await expect(row.getByText(newStatus)).toBeVisible({ timeout: 5000 })
})

Then('the status toggle should not be available for room {string}', async function (roomNumber: string) {
  const page: Page = this.page
  const row = page.getByText(roomNumber).locator('..')
  const toggle = row.getByRole('button', { name: /Chuyển trạng thái|Toggle/ })
  await expect(toggle).not.toBeVisible({ timeout: 3000 }).catch(() => {
    return expect(toggle).toBeDisabled()
  })
})

Then('I should only see rooms with status {string}', async function (status: string) {
  const page: Page = this.page
  // All visible room rows should show the filtered status
  const statusBadges = page.locator('[data-testid="room-status"], .room-status')
  const count = await statusBadges.count()
  for (let i = 0; i < count; i++) {
    await expect(statusBadges.nth(i)).toHaveText(new RegExp(status, 'i'))
  }
})
