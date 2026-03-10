import { Badge, type BadgeProps } from './badge'

// ─── Room Status ────────────────────────────────────────

const roomStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Available: { label: 'Available', variant: 'success' },
  Booked: { label: 'Booked', variant: 'info' },
  Occupied: { label: 'Occupied', variant: 'default' },
  Maintenance: { label: 'Maintenance', variant: 'warning' },
}

export function RoomStatusBadge({ status }: { status: string }) {
  const config = roomStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ─── User Status ────────────────────────────────────────

const userStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Active: { label: 'Active', variant: 'success' },
  Deactivated: { label: 'Deactivated', variant: 'destructive' },
}

export function UserStatusBadge({ status }: { status: string }) {
  const config = userStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ─── User Role ──────────────────────────────────────────

const userRoleConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Owner: { label: 'Owner', variant: 'default' },
  Staff: { label: 'Staff', variant: 'info' },
  Tenant: { label: 'Tenant', variant: 'secondary' },
}

export function UserRoleBadge({ role }: { role: string }) {
  const config = userRoleConfig[role] ?? { label: role, variant: 'muted' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ─── Boolean / Active Status ────────────────────────────

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'muted'}>{active ? 'Active' : 'Inactive'}</Badge>
}

// ─── Metered Badge ──────────────────────────────────────

export function MeteredBadge({ metered }: { metered: boolean }) {
  return <Badge variant={metered ? 'info' : 'secondary'}>{metered ? 'Metered' : 'Flat fee'}</Badge>
}

// ─── Contract Status ────────────────────────────────────

const contractStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Active: { label: 'Active', variant: 'success' },
  Terminated: { label: 'Terminated', variant: 'destructive' },
}

export function ContractStatusBadge({ status }: { status: string }) {
  const config = contractStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ─── Deposit Status ─────────────────────────────────────

const depositStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Held: { label: 'Held', variant: 'info' },
  PartiallyRefunded: { label: 'Partially Refunded', variant: 'warning' },
  Refunded: { label: 'Refunded', variant: 'success' },
  Forfeited: { label: 'Forfeited', variant: 'destructive' },
}

export function DepositStatusBadge({ status }: { status: string }) {
  const config = depositStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ─── Invoice Status ─────────────────────────────────────

const invoiceStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Draft: { label: 'Draft', variant: 'muted' },
  Sent: { label: 'Sent', variant: 'info' },
  PartiallyPaid: { label: 'Partially Paid', variant: 'warning' },
  Paid: { label: 'Paid', variant: 'success' },
  Overdue: { label: 'Overdue', variant: 'destructive' },
  Void: { label: 'Void', variant: 'muted' },
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const config = invoiceStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ─── Payment Type ───────────────────────────────────────

const paymentTypeConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  RentPayment: { label: 'Rent', variant: 'info' },
  DepositIn: { label: 'Deposit In', variant: 'success' },
  DepositRefund: { label: 'Deposit Refund', variant: 'warning' },
}

export function PaymentTypeBadge({ type }: { type: string }) {
  const config = paymentTypeConfig[type] ?? { label: type, variant: 'muted' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ─── Issue Status ───────────────────────────────────────

const issueStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  New: { label: 'New', variant: 'info' },
  InProgress: { label: 'In Progress', variant: 'warning' },
  Resolved: { label: 'Resolved', variant: 'success' },
  Closed: { label: 'Closed', variant: 'muted' },
}

export function IssueStatusBadge({ status }: { status: string }) {
  const config = issueStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ─── Priority Level ─────────────────────────────────────

const priorityConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Low: { label: 'Low', variant: 'muted' },
  Medium: { label: 'Medium', variant: 'warning' },
  High: { label: 'High', variant: 'destructive' },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] ?? { label: priority, variant: 'muted' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ─── Reservation Status ─────────────────────────────────

const reservationStatusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  Pending: { label: 'Pending', variant: 'warning' },
  Confirmed: { label: 'Confirmed', variant: 'info' },
  Converted: { label: 'Converted', variant: 'success' },
  Cancelled: { label: 'Cancelled', variant: 'destructive' },
  Expired: { label: 'Expired', variant: 'muted' },
}

export function ReservationStatusBadge({ status }: { status: string }) {
  const config = reservationStatusConfig[status] ?? { label: status, variant: 'muted' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
