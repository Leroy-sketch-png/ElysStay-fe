import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
  }).format(new Date(date))
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
