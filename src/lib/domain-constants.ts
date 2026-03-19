import type { InvoiceStatus, ReservationStatus, RoomStatus } from '@/types/api'

export const ROOM_STATUS_OPTIONS: { label: string; value: RoomStatus | '' }[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Trống', value: 'Available' },
  { label: 'Đã đặt', value: 'Booked' },
  { label: 'Đang ở', value: 'Occupied' },
  { label: 'Bảo trì', value: 'Maintenance' },
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
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Nháp', value: 'Draft' },
  { label: 'Đã gửi', value: 'Sent' },
  { label: 'Trả một phần', value: 'PartiallyPaid' },
  { label: 'Đã thanh toán', value: 'Paid' },
  { label: 'Quá hạn', value: 'Overdue' },
  { label: 'Hủy bỏ', value: 'Void' },
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
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ duyệt', value: 'Pending' },
  { label: 'Đã xác nhận', value: 'Confirmed' },
  { label: 'Đã chuyển đổi', value: 'Converted' },
  { label: 'Đã hủy', value: 'Cancelled' },
  { label: 'Hết hạn', value: 'Expired' },
]

export function canConfirmReservation(status: ReservationStatus) {
  return status === 'Pending'
}

export function canCancelReservation(status: ReservationStatus) {
  return status === 'Pending' || status === 'Confirmed'
}

export function canConvertReservation(status: ReservationStatus) {
  return status === 'Confirmed'
}

export function canManageReservation(status: ReservationStatus) {
  return canConfirmReservation(status) || canCancelReservation(status) || canConvertReservation(status)
}

// ─── Expense Categories ──────────────────────────────────
// Must match backend AllowedCategories in ExpenseValidators.cs

export const EXPENSE_CATEGORIES = [
  'Sửa chữa', 'Bảo trì', 'Tiện ích', 'Vệ sinh', 'Bảo hiểm',
  'Thuế', 'Quản lý', 'Thiết bị', 'Vật tư', 'Khác',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

// ─── Dropdown Page Size ──────────────────────────────────
// Used for "fetch all" dropdown queries (buildings, staff, rooms).
// Set high enough to cover any realistic deployment without pagination.
export const DROPDOWN_PAGE_SIZE = 999