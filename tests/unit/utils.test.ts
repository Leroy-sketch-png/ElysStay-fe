/**
 * Unit tests for @/lib/utils
 *
 * Covers: cn, parseDateInput, toLocalDateInputValue, formatCurrency,
 *         formatNumber, formatDate, formatBillingPeriod, timeAgo
 */
import {
  cn,
  parseDateInput,
  toLocalDateInputValue,
  formatCurrency,
  formatNumber,
  formatDate,
  formatBillingPeriod,
  timeAgo,
} from '@/lib/utils'

// ─── cn ──────────────────────────────────────────────────

describe('cn', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional falsy values', () => {
    expect(cn('base', false && 'skipped', null, undefined, 'kept')).toBe('base kept')
  })

  it('resolves conflicting Tailwind classes (last wins)', () => {
    // twMerge resolves conflicts: later padding wins
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
  })
})

// ─── parseDateInput ───────────────────────────────────────

describe('parseDateInput', () => {
  it('returns a Date object unchanged', () => {
    const d = new Date('2025-06-15T00:00:00Z')
    expect(parseDateInput(d)).toBe(d)
  })

  it('parses a date-only string (yyyy-MM-dd) as local midnight', () => {
    const result = parseDateInput('2025-06-15')
    expect(result).toBeInstanceOf(Date)
    // Local midnight: year=2025, month=5(June), day=15
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(5) // 0-indexed June
    expect(result.getDate()).toBe(15)
    expect(result.getHours()).toBe(0)
  })

  it('parses a full ISO datetime string', () => {
    const result = parseDateInput('2025-06-15T10:30:00Z')
    expect(result).toBeInstanceOf(Date)
    expect(result.getUTCHours()).toBe(10)
  })
})

// ─── toLocalDateInputValue ────────────────────────────────

describe('toLocalDateInputValue', () => {
  it('formats a Date to yyyy-MM-dd', () => {
    // Use a fixed local date to avoid timezone flakiness
    const d = new Date(2025, 5, 5) // June 5, 2025 local
    expect(toLocalDateInputValue(d)).toBe('2025-06-05')
  })

  it('zero-pads single-digit month and day', () => {
    const d = new Date(2025, 0, 9) // Jan 9, 2025 local
    expect(toLocalDateInputValue(d)).toBe('2025-01-09')
  })
})

// ─── formatCurrency ───────────────────────────────────────

describe('formatCurrency', () => {
  it('formats a number as Vietnamese Dong (VND)', () => {
    // The exact symbol/format depends on locale, but must contain the amount
    const result = formatCurrency(3_000_000)
    expect(result).toContain('3.000.000')
    expect(result).toMatch(/đ|VND|₫/i)
  })

  it('formats zero as currency', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })
})

// ─── formatNumber ─────────────────────────────────────────

describe('formatNumber', () => {
  it('appends M suffix for numbers >= 1,000,000', () => {
    expect(formatNumber(1_500_000)).toBe('1.5M')
    expect(formatNumber(2_000_000)).toBe('2M')
  })

  it('appends K suffix for numbers >= 1,000 but < 1,000,000', () => {
    expect(formatNumber(1_500)).toBe('1.5K')
    expect(formatNumber(10_000)).toBe('10K')
  })

  it('formats small numbers with Vietnamese locale grouping', () => {
    const result = formatNumber(500)
    expect(result).toBe('500')
  })
})

// ─── formatDate ───────────────────────────────────────────

describe('formatDate', () => {
  it('formats a Date object to dd/MM/yyyy Vietnamese convention', () => {
    const d = new Date(2025, 5, 5) // June 5, 2025 local
    const result = formatDate(d)
    expect(result).toBe('05/06/2025')
  })

  it('formats a date string', () => {
    const result = formatDate('2025-01-20')
    expect(result).toContain('2025')
    expect(result).toContain('01')
  })
})

// ─── formatBillingPeriod ──────────────────────────────────

describe('formatBillingPeriod', () => {
  it('formats year and month as Vietnamese billing period label', () => {
    expect(formatBillingPeriod(2025, 6)).toBe('Tháng 6/2025')
    expect(formatBillingPeriod(2024, 12)).toBe('Tháng 12/2024')
  })
})

// ─── timeAgo ─────────────────────────────────────────────

describe('timeAgo', () => {
  const now = new Date()

  it('returns "vừa xong" for very recent timestamps', () => {
    const recent = new Date(now.getTime() - 10_000).toISOString() // 10 seconds ago
    expect(timeAgo(recent)).toBe('vừa xong')
  })

  it('returns minutes for timestamps < 1 hour ago', () => {
    const fiveMinAgo = new Date(now.getTime() - 5 * 60_000).toISOString()
    expect(timeAgo(fiveMinAgo)).toBe('5 phút trước')
  })

  it('returns hours for timestamps < 24 hours ago', () => {
    const twoHoursAgo = new Date(now.getTime() - 2 * 3_600_000).toISOString()
    expect(timeAgo(twoHoursAgo)).toBe('2 giờ trước')
  })

  it('returns days for timestamps < 7 days ago', () => {
    const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000).toISOString()
    expect(timeAgo(threeDaysAgo)).toBe('3 ngày trước')
  })
})
