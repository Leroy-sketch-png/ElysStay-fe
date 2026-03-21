/**
 * MSW server setup for Vitest (node environment).
 *
 * Import this in any test file that needs API mocking.
 * Uses beforeAll/afterEach/afterAll lifecycle hooks.
 */
import { setupServer } from 'msw/node'
import { defaultHandlers } from './handlers'

export const server = setupServer(...defaultHandlers)

// Start MSW before all tests, reset handlers between tests, clean up after
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
