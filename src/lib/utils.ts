import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDateInput(date: string | Date): Date {
  if (date instanceof Date) return date

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch
    return new Date(Number(y), Number(m) - 1, Number(d))
  }

  return new Date(date)
}

export function toLocalDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a number to Vietnamese currency (VND).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a number with K/M suffix for dashboard stats.
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return num.toLocaleString()
}

/**
 * Format a date string to dd/MM/yyyy (Vietnamese convention).
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseDateInput(date))
}

/**
 * Format a billing period as "Tháng M/YYYY".
 */
export function formatBillingPeriod(year: number, month: number): string {
  return `Tháng ${month}/${year}`
}

/**
 * Get the current billing period (year, month) defaulting to the current
 * calendar month.
 */
export function getCurrentBillingPeriod(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

/**
 * Format a relative time string (e.g. "3h ago", "2d ago").
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}
