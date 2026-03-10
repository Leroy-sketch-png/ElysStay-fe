/**
 * TypeScript type definitions matching backend DTOs.
 * Keep in sync with Application layer DTO classes.
 *
 * All IDs are Guid (string) from the backend.
 * All dates are ISO 8601 strings.
 */

// ─── Enums / Literal Unions ─────────────────────────────

export type UserRole = 'Owner' | 'Staff' | 'Tenant'
export type UserStatus = 'Active' | 'Deactivated'
export type RoomStatus = 'Available' | 'Booked' | 'Occupied' | 'Maintenance'
export type ContractStatus = 'Active' | 'Terminated'
export type DepositStatus = 'Held' | 'PartiallyRefunded' | 'Refunded' | 'Forfeited'
export type InvoiceStatus = 'Draft' | 'Sent' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Void'
export type PaymentType = 'RentPayment' | 'DepositIn' | 'DepositRefund'

// ─── User ───────────────────────────────────────────────

export interface UserDto {
  id: string
  email: string
  fullName: string
  phone?: string
  avatarUrl?: string
  role: UserRole
  status: UserStatus
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

export interface CreateBuildingRequest {
  name: string
  address: string
  description?: string
  totalFloors: number
  invoiceDueDay?: number
}

export interface UpdateBuildingRequest {
  name?: string
  address?: string
  description?: string
  totalFloors?: number
  invoiceDueDay?: number
}

// ─── Room ───────────────────────────────────────────────

export interface RoomDto {
  id: string
  buildingId: string
  buildingName?: string
  roomNumber: string
  floor: number
  area: number
  price: number
  maxOccupants: number
  description?: string
  status: RoomStatus
  createdAt: string
  updatedAt: string
}

export interface CreateRoomRequest {
  roomNumber: string
  floor: number
  area: number
  price: number
  maxOccupants: number
  description?: string
}

export interface UpdateRoomRequest {
  roomNumber?: string
  floor?: number
  area?: number
  price?: number
  maxOccupants?: number
  description?: string
}

export interface ChangeRoomStatusRequest {
  status: 'Available' | 'Maintenance'
}

// ─── Service ────────────────────────────────────────────

export interface ServiceDto {
  id: string
  buildingId: string
  name: string
  unit: string
  unitPrice: number
  previousUnitPrice?: number
  priceUpdatedAt?: string
  isMetered: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateServiceRequest {
  name: string
  unit: string
  unitPrice: number
  isMetered: boolean
}

export interface UpdateServiceRequest {
  name?: string
  unit?: string
  unitPrice?: number
  isMetered?: boolean
}

// ─── Room Service ───────────────────────────────────────

export interface RoomServiceDto {
  serviceId: string
  serviceName: string
  unit: string
  buildingUnitPrice: number
  overrideUnitPrice?: number
  overrideQuantity?: number
  isEnabled: boolean
  isMetered: boolean
  effectiveUnitPrice: number
}

export interface RoomServiceOverride {
  serviceId: string
  isEnabled: boolean
  overrideUnitPrice?: number
  overrideQuantity?: number
}

// ─── Staff Assignment ───────────────────────────────────

export interface StaffAssignmentDto {
  buildingId: string
  staffId: string
  staffFullName: string
  staffEmail: string
  staffPhone?: string
  assignedAt: string
}

export interface AssignStaffRequest {
  staffId: string
}

// ─── Staff User Management ──────────────────────────────

export interface CreateStaffRequest {
  email: string
  fullName: string
  phone?: string
  password: string
}

export interface ChangeUserStatusRequest {
  status: 'Active' | 'Deactivated'
}

// ─── Pagination ─────────────────────────────────────────

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

/** Use PagedResponse from api-client.ts for API calls. This is for component props only. */
export interface PagedResult<T> {
  success: boolean
  data: T[]
  pagination: PaginationMeta
}

// ─── Contract ───────────────────────────────────────────

export interface ContractDto {
  id: string
  roomId: string
  roomNumber: string
  buildingId: string
  buildingName: string
  tenantUserId: string
  tenantName: string
  reservationId?: string
  startDate: string
  endDate: string
  moveInDate: string
  monthlyRent: number
  depositAmount: number
  depositStatus: DepositStatus
  status: ContractStatus
  terminationDate?: string
  terminationNote?: string
  refundAmount?: number
  note?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ContractDetailDto extends ContractDto {
  tenants: ContractTenantDto[]
}

export interface ContractTenantDto {
  id: string
  tenantUserId: string
  tenantName: string
  tenantEmail?: string
  tenantPhone?: string
  isMainTenant: boolean
  moveInDate: string
  moveOutDate?: string
}

export interface CreateContractRequest {
  roomId: string
  tenantUserId: string
  reservationId?: string
  startDate: string
  endDate: string
  moveInDate: string
  monthlyRent: number
  depositAmount: number
  note?: string
}

export interface UpdateContractRequest {
  endDate?: string
  monthlyRent?: number
  note?: string
}

export interface TerminateContractRequest {
  terminationDate: string
  note?: string
  deductions?: number
}

export interface RenewContractRequest {
  newEndDate: string
  newMonthlyRent?: number
}

export interface AddContractTenantRequest {
  tenantUserId: string
  moveInDate: string
}

// ─── Tenant Profile ─────────────────────────────────────

export interface TenantProfileDto {
  userId: string
  idNumber?: string
  idFrontUrl?: string
  idBackUrl?: string
  dateOfBirth?: string
  gender?: string
  permanentAddress?: string
  issuedDate?: string
  issuedPlace?: string
  createdAt: string
  updatedAt: string
}

export interface UpdateTenantProfileRequest {
  idNumber?: string
  dateOfBirth?: string
  gender?: string
  permanentAddress?: string
  issuedDate?: string
  issuedPlace?: string
}

// ─── Tenant User Management ─────────────────────────────

export interface CreateTenantRequest {
  email: string
  fullName: string
  phone?: string
  password: string
}

// ─── Meter Reading ──────────────────────────────────────

export interface MeterReadingDto {
  id: string
  roomId: string
  roomNumber: string
  serviceId: string
  serviceName: string
  serviceUnit: string
  billingYear: number
  billingMonth: number
  previousReading: number
  currentReading: number
  consumption: number
  createdAt: string
  updatedAt: string
}

export interface MeterReadingEntry {
  roomId: string
  serviceId: string
  previousReading?: number
  currentReading: number
}

export interface BulkUpsertMeterReadingsRequest {
  buildingId: string
  billingYear: number
  billingMonth: number
  readings: MeterReadingEntry[]
}

export interface UpdateMeterReadingRequest {
  previousReading?: number
  currentReading?: number
}

// ─── Invoice ────────────────────────────────────────────

export interface InvoiceDto {
  id: string
  contractId: string
  roomId: string
  roomNumber: string
  buildingId: string
  buildingName: string
  tenantUserId: string
  tenantName: string
  billingYear: number
  billingMonth: number
  rentAmount: number
  serviceAmount: number
  penaltyAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
  dueDate: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceLineItemDto {
  id: string
  serviceId?: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
  previousReading?: number
  currentReading?: number
}

export interface InvoiceDetailDto extends InvoiceDto {
  lineItems: InvoiceLineItemDto[]
}

export interface GenerateInvoicesRequest {
  buildingId: string
  billingYear: number
  billingMonth: number
}

export interface InvoiceGenerationResult {
  generated: InvoiceDto[]
  skipped: { contractId: string; reason: string }[]
  warnings: string[]
}

export interface UpdateInvoiceRequest {
  penaltyAmount?: number
  discountAmount?: number
  note?: string
}

export interface BatchSendInvoicesRequest {
  invoiceIds: string[]
}

// ─── Payment ────────────────────────────────────────────

export interface PaymentDto {
  id: string
  invoiceId?: string
  contractId?: string
  type: PaymentType
  amount: number
  paymentMethod?: string
  note?: string
  paidAt: string
  recordedBy: string
  recorderName?: string
  createdAt: string
}

export interface RecordPaymentRequest {
  amount: number
  paymentMethod?: string
  note?: string
}

export interface BatchRecordPaymentEntry {
  invoiceId: string
  amount: number
  paymentMethod?: string
  note?: string
}

export interface BatchRecordPaymentsRequest {
  payments: BatchRecordPaymentEntry[]
}

// ─── Expense ────────────────────────────────────────────

export interface ExpenseDto {
  id: string
  buildingId: string
  buildingName: string
  roomId?: string
  roomNumber?: string
  category: string
  description: string
  amount: number
  receiptUrl?: string
  expenseDate: string // YYYY-MM-DD
  recordedBy: string
  recorderName?: string
  createdAt: string
  updatedAt: string
}

export interface CreateExpenseRequest {
  buildingId: string
  roomId?: string
  category: string
  description: string
  amount: number
  expenseDate: string // YYYY-MM-DD
}

export interface UpdateExpenseRequest {
  category?: string
  description?: string
  amount?: number
  expenseDate?: string
}

// ─── Maintenance Issue ──────────────────────────────────

export type IssueStatus = 'New' | 'InProgress' | 'Resolved' | 'Closed'
export type PriorityLevel = 'Low' | 'Medium' | 'High'

export interface MaintenanceIssueDto {
  id: string
  buildingId: string
  buildingName: string
  roomId?: string
  roomNumber?: string
  reportedBy: string
  reporterName?: string
  assignedTo?: string
  assigneeName?: string
  title: string
  description: string
  imageUrls?: string[]
  status: IssueStatus
  priority: PriorityLevel
  createdAt: string
  updatedAt: string
}

export interface CreateIssueRequest {
  buildingId?: string
  roomId?: string
  title: string
  description: string
}

export interface UpdateIssueRequest {
  title?: string
  description?: string
}

export interface ChangeIssueStatusRequest {
  status: IssueStatus
}

// ─── Reservations ───────────────────────────────────────

export type ReservationStatus = 'Pending' | 'Confirmed' | 'Converted' | 'Cancelled' | 'Expired'

export interface ReservationDto {
  id: string
  roomId: string
  roomNumber: string
  buildingId: string
  buildingName: string
  tenantUserId: string
  tenantName: string | null
  depositAmount: number
  status: ReservationStatus
  expiresAt: string
  note: string | null
  refundAmount: number | null
  refundedAt: string | null
  refundNote: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateReservationRequest {
  roomId: string
  tenantUserId: string
  depositAmount?: number
  expiresAt?: string
  note?: string
}

export type ReservationAction = 'CONFIRM' | 'CANCEL'

export interface ChangeReservationStatusRequest {
  action: ReservationAction
  refundAmount?: number
  refundNote?: string
}

// ─── Notifications ──────────────────────────────────────

export interface NotificationDto {
  id: string
  userId: string
  title: string
  message: string
  isRead: boolean
  type: string
  referenceId: string | null
  createdAt: string
}

// ─── Reports ────────────────────────────────────────────

export interface DashboardStatsDto {
  totalRooms: number
  occupiedRooms: number
  occupancyRate: number
  activeContracts: number
  overdueContracts: number
  overdueInvoiceCount: number
  overdueAmount: number
  monthlyRevenue: number
}

export interface PnlMonthDto {
  month: number
  operationalIncome: number
  depositsReceived: number
  depositsRefunded: number
  expenses: number
  netOperational: number
  netCashFlow: number
}

export interface PnlReportDto {
  buildingId: string | null
  year: number
  months: PnlMonthDto[]
}
