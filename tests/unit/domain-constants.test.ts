/**
 * Unit tests for domain-constants.ts
 *
 * Pure functions with no async/provider dependencies — fastest test target.
 */
import { describe, it, expect } from 'vitest'
import {
  canToggleRoomStatus,
  getNextManualRoomStatus,
  canSendInvoice,
  canVoidInvoice,
  canRecordInvoicePayment,
  isInvoiceClosed,
  canConfirmReservation,
  canCancelReservation,
  canConvertReservation,
  canManageReservation,
  getExpenseCategoryLabel,
  getNotificationHref,
  EXPENSE_CATEGORIES,
  DEFAULT_TABLE_PAGE_SIZE,
  DROPDOWN_PAGE_SIZE,
} from '@/lib/domain-constants'
import type { RoomStatus, InvoiceStatus, ReservationStatus, NotificationType } from '@/types/api'

// ─── Room Status ────────────────────────────────────────

describe('canToggleRoomStatus', () => {
  it.each<[RoomStatus, boolean]>([
    ['Available', true],
    ['Maintenance', true],
    ['Booked', false],
    ['Occupied', false],
  ])('returns %s for status "%s"', (status, expected) => {
    expect(canToggleRoomStatus(status)).toBe(expected)
  })
})

describe('getNextManualRoomStatus', () => {
  it('Available → Maintenance', () => {
    expect(getNextManualRoomStatus('Available')).toBe('Maintenance')
  })

  it('Maintenance → Available', () => {
    expect(getNextManualRoomStatus('Maintenance')).toBe('Available')
  })

  it('returns null for non-toggleable statuses', () => {
    expect(getNextManualRoomStatus('Booked')).toBeNull()
    expect(getNextManualRoomStatus('Occupied')).toBeNull()
  })
})

// ─── Invoice Status Guards ──────────────────────────────

describe('canSendInvoice', () => {
  it.each<[InvoiceStatus, boolean]>([
    ['Draft', true],
    ['Sent', false],
    ['PartiallyPaid', false],
    ['Paid', false],
    ['Overdue', false],
    ['Void', false],
  ])('returns %s for status "%s"', (status, expected) => {
    expect(canSendInvoice(status)).toBe(expected)
  })
})

describe('canVoidInvoice', () => {
  it.each<[InvoiceStatus, boolean]>([
    ['Draft', true],
    ['Sent', true],
    ['PartiallyPaid', true],
    ['Overdue', true],
    ['Paid', false],
    ['Void', false],
  ])('returns %s for status "%s"', (status, expected) => {
    expect(canVoidInvoice(status)).toBe(expected)
  })
})

describe('canRecordInvoicePayment', () => {
  it.each<[InvoiceStatus, boolean]>([
    ['Sent', true],
    ['PartiallyPaid', true],
    ['Overdue', true],
    ['Draft', false],
    ['Paid', false],
    ['Void', false],
  ])('returns %s for status "%s"', (status, expected) => {
    expect(canRecordInvoicePayment(status)).toBe(expected)
  })
})

describe('isInvoiceClosed', () => {
  it.each<[InvoiceStatus, boolean]>([
    ['Paid', true],
    ['Void', true],
    ['Draft', false],
    ['Sent', false],
    ['PartiallyPaid', false],
    ['Overdue', false],
  ])('returns %s for status "%s"', (status, expected) => {
    expect(isInvoiceClosed(status)).toBe(expected)
  })
})

// ─── Reservation Status Guards ──────────────────────────

describe('canConfirmReservation', () => {
  it.each<[ReservationStatus, boolean]>([
    ['Pending', true],
    ['Confirmed', false],
    ['Converted', false],
    ['Cancelled', false],
    ['Expired', false],
  ])('returns %s for status "%s"', (status, expected) => {
    expect(canConfirmReservation(status)).toBe(expected)
  })
})

describe('canCancelReservation', () => {
  it.each<[ReservationStatus, boolean]>([
    ['Pending', true],
    ['Confirmed', true],
    ['Converted', false],
    ['Cancelled', false],
    ['Expired', false],
  ])('returns %s for status "%s"', (status, expected) => {
    expect(canCancelReservation(status)).toBe(expected)
  })
})

describe('canConvertReservation', () => {
  it.each<[ReservationStatus, boolean]>([
    ['Confirmed', true],
    ['Pending', false],
    ['Converted', false],
    ['Cancelled', false],
    ['Expired', false],
  ])('returns %s for status "%s"', (status, expected) => {
    expect(canConvertReservation(status)).toBe(expected)
  })
})

describe('canManageReservation', () => {
  it('covers exactly: Pending, Confirmed', () => {
    const manageable: ReservationStatus[] = ['Pending', 'Confirmed']
    const notManageable: ReservationStatus[] = ['Converted', 'Cancelled', 'Expired']

    manageable.forEach((s) => expect(canManageReservation(s)).toBe(true))
    notManageable.forEach((s) => expect(canManageReservation(s)).toBe(false))
  })
})

// ─── Expense Categories ─────────────────────────────────

describe('getExpenseCategoryLabel', () => {
  it('returns Vietnamese label for known categories', () => {
    expect(getExpenseCategoryLabel('Repair')).toBe('Sửa chữa')
    expect(getExpenseCategoryLabel('Cleaning')).toBe('Vệ sinh')
    expect(getExpenseCategoryLabel('Other')).toBe('Khác')
  })

  it('returns the raw value for unknown categories', () => {
    expect(getExpenseCategoryLabel('SomethingNew')).toBe('SomethingNew')
  })

  it('has exactly 10 defined categories', () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(10)
  })
})

// ─── Notification Routing ───────────────────────────────

describe('getNotificationHref', () => {
  const refId = 'abc-123'

  it.each<[NotificationType, string]>([
    ['INVOICE_SENT', `/billing/invoices/${refId}`],
    ['INVOICE_VOIDED', `/billing/invoices/${refId}`],
    ['INVOICE_OVERDUE', `/billing/invoices/${refId}`],
    ['PAYMENT_RECORDED', `/billing/invoices/${refId}`],
    ['ISSUE', `/maintenance/${refId}`],
    ['CONTRACT_CREATED', `/contracts/${refId}`],
    ['CONTRACT_RENEWED', `/contracts/${refId}`],
    ['CONTRACT_TERMINATED', `/contracts/${refId}`],
    ['CONTRACT_EXPIRY_ALERT', `/contracts/${refId}`],
  ])('maps %s to correct route', (type, expected) => {
    expect(getNotificationHref(type, refId)).toBe(expected)
  })

  it('maps RESERVATION_EXPIRED to /reservations (ignores referenceId)', () => {
    expect(getNotificationHref('RESERVATION_EXPIRED', refId)).toBe('/reservations')
  })

  it('returns null when referenceId is null or undefined', () => {
    expect(getNotificationHref('INVOICE_SENT', null)).toBeNull()
    expect(getNotificationHref('INVOICE_SENT', undefined)).toBeNull()
  })

  it('returns null for an unmapped notification type', () => {
    expect(getNotificationHref('UNKNOWN_TYPE' as NotificationType, refId)).toBeNull()
  })
})

// ─── Constants ──────────────────────────────────────────

describe('page size constants', () => {
  it('DEFAULT_TABLE_PAGE_SIZE is 20', () => {
    expect(DEFAULT_TABLE_PAGE_SIZE).toBe(20)
  })

  it('DROPDOWN_PAGE_SIZE is 999', () => {
    expect(DROPDOWN_PAGE_SIZE).toBe(999)
  })
})
