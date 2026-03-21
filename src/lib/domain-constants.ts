import type { InvoiceStatus, NotificationType, ReservationStatus, RoomStatus } from '@/types/api'

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
// `value` is what the API expects; `label` is what Vietnamese users see.

export const EXPENSE_CATEGORIES: readonly { value: string; label: string }[] = [
  { value: 'Repair', label: 'Sửa chữa' },
  { value: 'Maintenance', label: 'Bảo trì' },
  { value: 'Utilities', label: 'Tiện ích' },
  { value: 'Cleaning', label: 'Vệ sinh' },
  { value: 'Insurance', label: 'Bảo hiểm' },
  { value: 'Tax', label: 'Thuế' },
  { value: 'Management', label: 'Quản lý' },
  { value: 'Equipment', label: 'Thiết bị' },
  { value: 'Supplies', label: 'Vật tư' },
  { value: 'Other', label: 'Khác' },
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['value']

/** Get Vietnamese display label for an expense category API value */
export function getExpenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

// ─── Page Sizes ──────────────────────────────────────────
// DEFAULT_TABLE_PAGE_SIZE: initial page size for all paginated list pages.
// DROPDOWN_PAGE_SIZE: used for "fetch all" queries that populate dropdowns/selects.
export const DEFAULT_TABLE_PAGE_SIZE = 20
export const DROPDOWN_PAGE_SIZE = 999

// ─── Notification Type → Route Mapping ───────────────────

export function getNotificationHref(type: NotificationType, referenceId?: string | null): string | null {
  if (!referenceId) return null
  const map: Partial<Record<NotificationType, string>> = {
    INVOICE_SENT: `/billing/invoices/${referenceId}`,
    INVOICE_VOIDED: `/billing/invoices/${referenceId}`,
    INVOICE_OVERDUE: `/billing/invoices/${referenceId}`,
    PAYMENT_RECORDED: `/billing/invoices/${referenceId}`,
    ISSUE: `/maintenance/${referenceId}`,
    CONTRACT_CREATED: `/contracts/${referenceId}`,
    CONTRACT_RENEWED: `/contracts/${referenceId}`,
    CONTRACT_TERMINATED: `/contracts/${referenceId}`,
    CONTRACT_EXPIRY_ALERT: `/contracts/${referenceId}`,
    RESERVATION_EXPIRED: '/reservations',
  }
  return map[type] ?? null
}