import { DEV_AUTH_STORAGE_KEY, readDevAuthOverride } from '@/lib/dev-auth'

describe('readDevAuthOverride', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('returns undefined when no override is present', () => {
    expect(readDevAuthOverride()).toBeUndefined()
  })

  it('returns undefined and clears storage for invalid JSON', () => {
    window.localStorage.setItem(DEV_AUTH_STORAGE_KEY, '{bad-json')

    expect(readDevAuthOverride()).toBeUndefined()
    expect(window.localStorage.getItem(DEV_AUTH_STORAGE_KEY)).toBeNull()
  })

  it('returns undefined and clears storage for authenticated override without user', () => {
    window.localStorage.setItem(
      DEV_AUTH_STORAGE_KEY,
      JSON.stringify({ authenticated: true, token: 'token-without-user' }),
    )

    expect(readDevAuthOverride()).toBeUndefined()
    expect(window.localStorage.getItem(DEV_AUTH_STORAGE_KEY)).toBeNull()
  })

  it('parses a valid authenticated override', () => {
    window.localStorage.setItem(
      DEV_AUTH_STORAGE_KEY,
      JSON.stringify({
        authenticated: true,
        token: 'owner-token',
        user: {
          keycloakId: 'owner-1',
          email: 'owner@elysstay.test',
          fullName: 'Owner',
          roles: ['Owner'],
        },
      }),
    )

    expect(readDevAuthOverride()).toEqual({
      authenticated: true,
      authError: null,
      token: 'owner-token',
      user: {
        keycloakId: 'owner-1',
        email: 'owner@elysstay.test',
        fullName: 'Owner',
        roles: ['Owner'],
      },
    })
  })

  it('parses a valid unauthenticated override with authError', () => {
    window.localStorage.setItem(
      DEV_AUTH_STORAGE_KEY,
      JSON.stringify({
        authenticated: false,
        authError: 'Phiên đăng nhập đã hết hạn.',
      }),
    )

    expect(readDevAuthOverride()).toEqual({
      authenticated: false,
      authError: 'Phiên đăng nhập đã hết hạn.',
      token: undefined,
      user: null,
    })
  })
})
