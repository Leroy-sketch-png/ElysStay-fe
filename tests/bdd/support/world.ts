/**
 * Playwright browser fixture for Cucumber BDD steps.
 *
 * Manages a single browser instance + context across all scenarios in a test run.
 * Each scenario gets a fresh page (tab) via Before/After hooks.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber'

let browser: Browser
let context: BrowserContext
let page: Page
let devServerProcess: ChildProcess | null = null
let devServerStartedBySuite = false
const devServerLogs: string[] = []

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

function appendDevServerLog(chunk: Buffer | string) {
  const text = chunk.toString().trim()
  if (!text) {
    return
  }

  devServerLogs.push(...text.split(/\r?\n/).filter(Boolean))

  if (devServerLogs.length > 80) {
    devServerLogs.splice(0, devServerLogs.length - 80)
  }
}

async function isBaseUrlReady() {
  try {
    const response = await fetch(BASE_URL, {
      redirect: 'manual',
      signal: AbortSignal.timeout(2_000),
    })

    return response.status < 500
  } catch {
    return false
  }
}

async function waitForBaseUrl(timeoutMs: number) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await isBaseUrlReady()) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  const recentLogs = devServerLogs.length > 0
    ? `\nRecent dev server output:\n${devServerLogs.slice(-20).join('\n')}`
    : ''

  throw new Error(`Frontend dev server at ${BASE_URL} was not ready within ${timeoutMs}ms.${recentLogs}`)
}

async function ensureBaseUrlReady() {
  if (await isBaseUrlReady()) {
    return
  }

  devServerStartedBySuite = true
  const child = process.platform === 'win32'
    ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'npm run dev'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV ?? 'development',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    : spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV ?? 'development',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })

  devServerProcess = child

  child.stdout?.on('data', appendDevServerLog)
  child.stderr?.on('data', appendDevServerLog)

  await waitForBaseUrl(120_000)
}

function stopDevServer() {
  if (!devServerProcess || !devServerStartedBySuite) {
    return
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(devServerProcess.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    devServerProcess.kill('SIGTERM')
  }

  devServerProcess = null
  devServerStartedBySuite = false
}

setDefaultTimeout(30_000)

BeforeAll({ timeout: 30_000 }, async function () {
  await ensureBaseUrlReady()

  browser = await chromium.launch({
    headless: true,
    timeout: 30_000,
  })
})

AfterAll(async function () {
  await browser?.close()
  stopDevServer()
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
