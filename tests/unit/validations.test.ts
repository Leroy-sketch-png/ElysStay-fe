import { describe, it, expect } from 'vitest'
import { loginSchema } from '@/lib/validations'

describe('loginSchema', () => {
  it('should validate correct input', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'password123' })
    expect(result.success).toBe(true)
  })

  it('should fail on invalid email', () => {
    const result = loginSchema.safeParse({ email: 'invalid-email', password: 'password123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email address')
    }
  })

  it('should fail on short password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password must be at least 8 characters')
    }
  })
})
