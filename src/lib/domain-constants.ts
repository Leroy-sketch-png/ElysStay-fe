import type { InvoiceStatus, ReservationStatus, RoomStatus } from '@/types/api'

export const ROOM_STATUS_OPTIONS: { label: string; value: RoomStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Available', value: 'Available' },
  { label: 'Booked', value: 'Booked' },
  { label: 'Occupied', value: 'Occupied' },
  { label: 'Maintenance', value: 'Maintenance' },
]

export const MANUAL_ROOM_STATUS_TOGGLE: Readonly<Record<'Available' | 'Maintenance', 'Available' | 'Maintenance'>> = {
  Available: 'Maintenance',
  Maintenance: 'Available',
}

export function canToggleRoomStatus(status: RoomStatus): status is 'Available' | 'Maintenance' {
  return status === 'Available' || status === 'Maintenance'
}

export function getNextManualRoomStatus(status: RoomStatus) {
  return canToggleRoomStatus(status) ? MANUAL_ROOM_STATUS_TOGGLE[status] : null
}

export const INVOICE_STATUS_OPTIONS: { label: string; value: InvoiceStatus | '' }[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Sent', value: 'Sent' },
  { label: 'Partially Paid', value: 'PartiallyPaid' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Overdue', value: 'Overdue' },
  { label: 'Void', value: 'Void' },
]

export function canSendInvoice(status: InvoiceStatus) {
  return status === 'Draft'
}

export function canVoidInvoice(status: InvoiceStatus) {
  return status === 'Draft' || status === 'Sent' || status === 'Overdue' || status === 'PartiallyPaid'
}

export function canRecordInvoicePayment(status: InvoiceStatus) {
  return status === 'Sent' || status === 'PartiallyPaid' || status === 'Overdue'
}

export function isInvoiceClosed(status: InvoiceStatus) {
  return status === 'Paid' || status === 'Void'
}

export const RESERVATION_STATUS_OPTIONS: { label: string; value: ReservationStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Confirmed', value: 'Confirmed' },
  { label: 'Converted', value: 'Converted' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'Expired', value: 'Expired' },
]

export function canConfirmReservation(status: ReservationStatus) {
  return status === 'Pending'
}

export function canCancelReservation(status: ReservationStatus) {
  return status === 'Pending' || status === 'Confirmed'
}

export function canManageReservation(status: ReservationStatus) {
  return canConfirmReservation(status) || canCancelReservation(status)
}

// ─── Expense Categories ──────────────────────────────────
// Must match backend AllowedCategories in ExpenseValidators.cs

export const EXPENSE_CATEGORIES = [
  'Repair', 'Maintenance', 'Utilities', 'Cleaning', 'Insurance',
  'Tax', 'Management', 'Equipment', 'Supplies', 'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

// ─── Dropdown Page Size ──────────────────────────────────
// Used for "fetch all" dropdown queries (buildings, staff, rooms).
// Set high enough to cover any realistic deployment without pagination.
export const DROPDOWN_PAGE_SIZE = 999