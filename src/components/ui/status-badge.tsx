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
