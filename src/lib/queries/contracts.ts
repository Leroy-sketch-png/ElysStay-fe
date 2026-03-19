import { api, toQueryString, requireData, type PagedResponse } from '@/lib/api-client'
import type {
  ContractDto,
  ContractDetailDto,
  ContractTenantDto,
  CreateContractRequest,
  UpdateContractRequest,
  TerminateContractRequest,
  RenewContractRequest,
  AddContractTenantRequest,
} from '@/types/api'

// ─── Query Keys ─────────────────────────────────────────

export const contractKeys = {
  all: ['contracts'] as const,
  list: (filters: object) => [...contractKeys.all, 'list', filters] as const,
  detail: (id: string) => [...contractKeys.all, id] as const,
  tenants: (contractId: string) => [...contractKeys.all, contractId, 'tenants'] as const,
}

// ─── Queries ────────────────────────────────────────────

export interface ContractFilters {
  buildingId?: string
  roomId?: string
  tenantUserId?: string
  status?: string
  page?: number
  pageSize?: number
  sort?: string
}

export async function fetchContracts(
  filters: ContractFilters = {},
): Promise<PagedResponse<ContractDto>> {
  const qs = toQueryString({
    buildingId: filters.buildingId,
    roomId: filters.roomId,
    tenantUserId: filters.tenantUserId,
    status: filters.status,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    sort: filters.sort ?? 'createdAt:desc',
  })
  return api.getPaged<ContractDto>(`/contracts${qs}`)
}

export async function fetchContractById(id: string): Promise<ContractDetailDto> {
  const res = await api.get<ContractDetailDto>(`/contracts/${id}`)
  return requireData(res)
}

export async function fetchContractTenants(
  contractId: string,
): Promise<ContractTenantDto[]> {
  const res = await api.get<ContractTenantDto[]>(`/contracts/${contractId}/tenants`)
  return requireData(res)
}

// ─── Mutations ──────────────────────────────────────────

export async function createContract(data: CreateContractRequest): Promise<ContractDto> {
  const res = await api.post<ContractDto>('/contracts', data)
  return requireData(res)
}

export async function updateContract(
  id: string,
  data: UpdateContractRequest,
): Promise<ContractDto> {
  const res = await api.put<ContractDto>(`/contracts/${id}`, data)
  return requireData(res)
}

export async function terminateContract(
  id: string,
  data: TerminateContractRequest,
): Promise<ContractDto> {
  const res = await api.patch<ContractDto>(`/contracts/${id}/terminate`, data)
  return requireData(res)
}

export async function renewContract(
  id: string,
  data: RenewContractRequest,
): Promise<ContractDto> {
  const res = await api.patch<ContractDto>(`/contracts/${id}/renew`, data)
  return requireData(res)
}

// ─── Roommate Mutations ─────────────────────────────────

export async function addContractTenant(
  contractId: string,
  data: AddContractTenantRequest,
): Promise<ContractTenantDto> {
  const res = await api.post<ContractTenantDto>(
    `/contracts/${contractId}/tenants`,
    data,
  )
  return requireData(res)
}

export async function removeContractTenant(
  contractId: string,
  tenantId: string,
): Promise<void> {
  await api.delete(`/contracts/${contractId}/tenants/${tenantId}`)
}
