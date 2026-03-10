/**
 * TypeScript type definitions matching backend DTOs.
 * Keep in sync with Application layer DTO classes.
 */

// ─── User ───────────────────────────────────────────────

export interface UserDto {
  id: string
  email: string
  fullName: string
  phone?: string
  avatarUrl?: string
  role: 'Owner' | 'Staff' | 'Tenant'
  status: 'Active' | 'Deactivated'
  createdAt: string
}

export interface UserProfileDto extends UserDto {
  updatedAt: string
}

// ─── Dashboard ──────────────────────────────────────────

export interface OwnerDashboardDto {
  totalBuildings: number
  totalRooms: number
  occupiedRooms: number
  occupancyRate: number
  activeContracts: number
  overdueInvoiceCount: number
  overdueAmount: number
  monthlyRevenue: number
}

export interface StaffDashboardDto {
  assignedBuildings: number
  pendingIssues: number
  pendingMeterReadings: number
}

export interface TenantDashboardDto {
  roomId?: string
  roomNumber?: string
  buildingName?: string
  contractStatus?: string
  contractEndDate?: string
  unpaidInvoiceCount: number
  unpaidAmount: number
  openIssueCount: number
}

// ─── Building ───────────────────────────────────────────

export interface BuildingDto {
  id: string
  ownerId: string
  name: string
  address: string
  description?: string
  totalFloors: number
  invoiceDueDay: number
  createdAt: string
  updatedAt: string
}

export interface BuildingDetailDto extends BuildingDto {
  totalRooms: number
  occupancyRate: number
}

// ─── Room ───────────────────────────────────────────────

export interface RoomDto {
  id: string
  buildingId: string
  roomNumber: string
  floor: number
  area: number
  price: number
  maxOccupants: number
  description?: string
  status: 'Available' | 'Booked' | 'Occupied' | 'Maintenance'
  createdAt: string
  updatedAt: string
}

// ─── Pagination ─────────────────────────────────────────

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface PagedResult<T> {
  success: boolean
  data: T[]
  pagination: PaginationMeta
}
