import { Badge, type BadgeProps } from './badge'

// ─── Room Status ────────────────────────────────────────

const roomStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Available: { label: 'Trống', variant: 'success' },
  Booked: { label: 'Đã đặt', variant: 'info' },
  Occupied: { label: 'Đang ở', variant: 'default' },
  Maintenance: { label: 'Bảo trì', variant: 'warning' },
}

export function RoomStatusBadge({ status }: { status: string }) {
  const config = roomStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant} title={config.label}>{config.label}</Badge>
}

// ─── User Status ────────────────────────────────────────

const userStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Active: { label: 'Hoạt động', variant: 'success' },
  Deactivated: { label: 'Vô hiệu hóa', variant: 'destructive' },
}

export function UserStatusBadge({ status }: { status: string }) {
  const config = userStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant} title={config.label}>{config.label}</Badge>
}

// ─── User Role ──────────────────────────────────────────

const userRoleConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Owner: { label: 'Chủ nhà', variant: 'default' },
  Staff: { label: 'Nhân viên', variant: 'info' },
  Tenant: { label: 'Khách thuê', variant: 'secondary' },
}

export function UserRoleBadge({ role }: { role: string }) {
  const config = userRoleConfig[role] ?? { label: role, variant: 'muted' as const }
  return <Badge variant={config.variant} title={config.label}>{config.label}</Badge>
}

// ─── Boolean / Active Status ────────────────────────────

export function ActiveBadge({ active }: { active: boolean }) {
  const label = active ? 'Hoạt động' : 'Ngừng'
  return <Badge variant={active ? 'success' : 'muted'} title={label}>{label}</Badge>
}

// ─── Metered Badge ──────────────────────────────────────

export function MeteredBadge({ metered }: { metered: boolean }) {
  const label = metered ? 'Đo đếm' : 'Cố định'
  return <Badge variant={metered ? 'info' : 'secondary'} title={label}>{label}</Badge>
}

// ─── Contract Status ────────────────────────────────────

const contractStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Active: { label: 'Hiệu lực', variant: 'success' },
  Terminated: { label: 'Đã chấm dứt', variant: 'destructive' },
}

export function ContractStatusBadge({ status }: { status: string }) {
  const config = contractStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant} title={config.label}>{config.label}</Badge>
}

// ─── Deposit Status ─────────────────────────────────────

const depositStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Held: { label: 'Đang giữ', variant: 'info' },
  PartiallyRefunded: { label: 'Hoàn một phần', variant: 'warning' },
  Refunded: { label: 'Đã hoàn', variant: 'success' },
  Forfeited: { label: 'Tịch thu', variant: 'destructive' },
}

export function DepositStatusBadge({ status }: { status: string }) {
  const config = depositStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant} title={config.label}>{config.label}</Badge>
}

// ─── Invoice Status ─────────────────────────────────────

const invoiceStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Draft: { label: 'Nháp', variant: 'muted' },
  Sent: { label: 'Đã gửi', variant: 'info' },
  PartiallyPaid: { label: 'Trả một phần', variant: 'warning' },
  Paid: { label: 'Đã thanh toán', variant: 'success' },
  Overdue: { label: 'Quá hạn', variant: 'destructive' },
  Void: { label: 'Hủy bỏ', variant: 'muted' },
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const config = invoiceStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant} title={config.label}>{config.label}</Badge>
}

// ─── Payment Type ───────────────────────────────────────

const paymentTypeConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  RentPayment: { label: 'Tiền thuê', variant: 'info' },
  DepositIn: { label: 'Tiền cọc vào', variant: 'success' },
  DepositRefund: { label: 'Hoàn cọc', variant: 'warning' },
}

export function PaymentTypeBadge({ type }: { type: string }) {
  const config = paymentTypeConfig[type] ?? { label: type, variant: 'muted' as const }
  return <Badge variant={config.variant} title={config.label}>{config.label}</Badge>
}

// ─── Issue Status ───────────────────────────────────────

const issueStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  New: { label: 'Mới', variant: 'info' },
  InProgress: { label: 'Đang xử lý', variant: 'warning' },
  Resolved: { label: 'Đã giải quyết', variant: 'success' },
  Closed: { label: 'Đã đóng', variant: 'muted' },
}

export function IssueStatusBadge({ status }: { status: string }) {
  const config = issueStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant} title={config.label}>{config.label}</Badge>
}

// ─── Priority Level ─────────────────────────────────────

const priorityConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Low: { label: 'Thấp', variant: 'muted' },
  Medium: { label: 'Trung bình', variant: 'warning' },
  High: { label: 'Cao', variant: 'destructive' },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] ?? { label: priority, variant: 'muted' as const }
  return <Badge variant={config.variant} title={config.label}>{config.label}</Badge>
}

// ─── Reservation Status ─────────────────────────────────

const reservationStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Pending: { label: 'Chờ duyệt', variant: 'warning' },
  Confirmed: { label: 'Đã xác nhận', variant: 'info' },
  Converted: { label: 'Đã chuyển đổi', variant: 'success' },
  Cancelled: { label: 'Đã hủy', variant: 'destructive' },
  Expired: { label: 'Hết hạn', variant: 'muted' },
}

export function ReservationStatusBadge({ status }: { status: string }) {
  const config = reservationStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant} title={config.label}>{config.label}</Badge>
}
