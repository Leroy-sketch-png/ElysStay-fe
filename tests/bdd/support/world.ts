/**
 * Playwright browser fixture for Cucumber BDD steps.
 *
 * Manages a single browser instance + context across all scenarios in a test run.
 * Each scenario gets a fresh page (tab) via Before/After hooks.
 */
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber'

let browser: Browser
let context: BrowserContext
let page: Page

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

BeforeAll(async function () {
  browser = await chromium.launch({
    headless: true,
  })
})

AfterAll(async function () {
  await browser?.close()
})

Before(async function () {
  context = await browser.newContext({
    baseURL: BASE_URL,
  })
  page = await context.newPage()
  // Store on the Cucumber world so step definitions can access it
  this.page = page
  this.context = context
  this.baseUrl = BASE_URL
})

After(async function () {
  await page?.close()
  await context?.close()
})

export { browser, context, page }
