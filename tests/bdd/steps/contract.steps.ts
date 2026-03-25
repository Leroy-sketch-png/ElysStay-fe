/**
 * Step definitions for contract lifecycle BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

type MockBuilding = {
  id: string
  ownerId: string
  name: string
  address: string
  totalFloors: number
  invoiceDueDay: number
  createdAt: string
  updatedAt: string
}

type MockRoom = {
  id: string
  buildingId: string
  buildingName: string
  roomNumber: string
  floor: number
  area: number
  price: number
  maxOccupants: number
  status: string
  createdAt: string
  updatedAt: string
}

type MockTenantUser = {
  id: string
  email: string
  fullName: string
  phone?: string
  role: 'Tenant'
  status: 'Active'
  createdAt: string
}

type MockContractTenant = {
  id: string
  tenantUserId: string
  tenantName: string
  tenantEmail?: string
  tenantPhone?: string
  isMainTenant: boolean
  moveInDate: string
  moveOutDate?: string
}

type MockContract = {
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
  depositStatus: 'Held' | 'PartiallyRefunded' | 'Refunded' | 'Forfeited'
  status: 'Active' | 'Terminated'
  terminationDate?: string
  terminationNote?: string
  refundAmount?: number
  note?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  tenants: MockContractTenant[]
}

function createMockBuilding(overrides: Partial<MockBuilding> = {}): MockBuilding {
  return {
    id: overrides.id ?? 'building-a',
    ownerId: overrides.ownerId ?? 'owner-1',
    name: overrides.name ?? 'Tòa nhà A',
    address: overrides.address ?? '12 Lý Thường Kiệt, Quận 1',
    totalFloors: overrides.totalFloors ?? 8,
    invoiceDueDay: overrides.invoiceDueDay ?? 10,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00Z',
  }
}

function createMockRoom(overrides: Partial<MockRoom> = {}): MockRoom {
  return {
    id: overrides.id ?? `room-${overrides.roomNumber ?? '101'}`,
    buildingId: overrides.buildingId ?? 'building-a',
    buildingName: overrides.buildingName ?? 'Tòa nhà A',
    roomNumber: overrides.roomNumber ?? '101',
    floor: overrides.floor ?? 1,
    area: overrides.area ?? 24,
    price: overrides.price ?? 5000000,
    maxOccupants: overrides.maxOccupants ?? 3,
    status: overrides.status ?? 'Available',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00Z',
  }
}

function createMockTenant(overrides: Partial<MockTenantUser> = {}): MockTenantUser {
  return {
    id: overrides.id ?? 'tenant-default',
    email: overrides.email ?? 'tenant@elysstay.test',
    fullName: overrides.fullName ?? 'Nguyễn Văn A',
    phone: overrides.phone ?? '0900000000',
    role: 'Tenant',
    status: 'Active',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
  }
}

function createMockContract(overrides: Partial<MockContract> = {}): MockContract {
  const tenantUserId = overrides.tenantUserId ?? 'tenant-a'
  const tenantName = overrides.tenantName ?? 'Nguyễn Văn A'
  const moveInDate = overrides.moveInDate ?? '2026-04-01'

  return {
    id: overrides.id ?? `contract-${overrides.roomNumber ?? '101'}`,
    roomId: overrides.roomId ?? `room-${overrides.roomNumber ?? '101'}`,
    roomNumber: overrides.roomNumber ?? '101',
    buildingId: overrides.buildingId ?? 'building-a',
    buildingName: overrides.buildingName ?? 'Tòa nhà A',
    tenantUserId,
    tenantName,
    reservationId: overrides.reservationId,
    startDate: overrides.startDate ?? '2026-04-01',
    endDate: overrides.endDate ?? '2027-03-31',
    moveInDate,
    monthlyRent: overrides.monthlyRent ?? 5000000,
    depositAmount: overrides.depositAmount ?? 10000000,
    depositStatus: overrides.depositStatus ?? 'Held',
    status: overrides.status ?? 'Active',
    terminationDate: overrides.terminationDate,
    terminationNote: overrides.terminationNote,
    refundAmount: overrides.refundAmount,
    note: overrides.note,
    createdBy: overrides.createdBy ?? 'owner-1',
    createdAt: overrides.createdAt ?? '2026-04-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-04-01T00:00:00Z',
    tenants: overrides.tenants ?? [
      {
        id: `contract-tenant-${tenantUserId}`,
        tenantUserId,
        tenantName,
        tenantEmail: `${tenantUserId}@elysstay.test`,
        tenantPhone: '0900000000',
        isMainTenant: true,
        moveInDate,
      },
    ],
  }
}

function getBuildings(world: Record<string, unknown>): MockBuilding[] {
  if (!Array.isArray(world.mockContractBuildings)) {
    world.mockContractBuildings = [createMockBuilding()]
  }

  return world.mockContractBuildings as MockBuilding[]
}

function getRooms(world: Record<string, unknown>): MockRoom[] {
  if (!Array.isArray(world.mockContractRooms)) {
    world.mockContractRooms = [
      createMockRoom({ roomNumber: '101', floor: 1, price: 4500000 }),
      createMockRoom({ roomNumber: '301', floor: 3, price: 5000000 }),
    ]
  }

  return world.mockContractRooms as MockRoom[]
}

function getTenantUsers(world: Record<string, unknown>): MockTenantUser[] {
  if (!Array.isArray(world.mockContractTenantUsers)) {
    world.mockContractTenantUsers = [
      createMockTenant({ id: 'tenant-a', fullName: 'Nguyễn Văn A', email: 'nguyenvana@elysstay.test' }),
      createMockTenant({ id: 'tenant-b', fullName: 'Trần Thị B', email: 'tranthib@elysstay.test' }),
      createMockTenant({ id: 'tenant-c', fullName: 'Lê Văn C', email: 'levanc@elysstay.test' }),
    ]
  }

  return world.mockContractTenantUsers as MockTenantUser[]
}

function getContracts(world: Record<string, unknown>): MockContract[] {
  if (!Array.isArray(world.mockContracts)) {
    world.mockContracts = [createMockContract()]
  }

  return world.mockContracts as MockContract[]
}

function toContractDto(contract: MockContract) {
  return {
    id: contract.id,
    roomId: contract.roomId,
    roomNumber: contract.roomNumber,
    buildingId: contract.buildingId,
    buildingName: contract.buildingName,
    tenantUserId: contract.tenantUserId,
    tenantName: contract.tenantName,
    reservationId: contract.reservationId,
    startDate: contract.startDate,
    endDate: contract.endDate,
    moveInDate: contract.moveInDate,
    monthlyRent: contract.monthlyRent,
    depositAmount: contract.depositAmount,
    depositStatus: contract.depositStatus,
    status: contract.status,
    terminationDate: contract.terminationDate,
    terminationNote: contract.terminationNote,
    refundAmount: contract.refundAmount,
    note: contract.note,
    createdBy: contract.createdBy,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  }
}

function findContractByRoomNumber(world: Record<string, unknown>, roomNumber: string) {
  return getContracts(world).find((contract) => contract.roomNumber === roomNumber)
}

function requireContract(world: Record<string, unknown>, roomNumber: string) {
  const contract = findContractByRoomNumber(world, roomNumber)
  if (!contract) {
    throw new Error(`Mock contract not found for room ${roomNumber}`)
  }

  return contract
}

async function refreshContractPage(page: Page) {
  if (page.url().includes('/contracts/')) {
    await page.goto(page.url())
  }
}

async function ensureContractApiMocks(page: Page, world: Record<string, unknown>) {
  if (world.contractApiMocked) {
    return
  }

  world.contractApiMocked = true
  const buildings = getBuildings(world)
  const rooms = getRooms(world)
  const tenantUsers = getTenantUsers(world)
  const contracts = getContracts(world)

  await page.unroute('**/api/v1/buildings').catch(() => undefined)
  await page.unroute('**/api/v1/buildings?*').catch(() => undefined)
  await page.unroute('**/api/v1/rooms**').catch(() => undefined)
  await page.unroute('**/api/v1/users/tenants**').catch(() => undefined)
  await page.unroute('**/api/v1/contracts**').catch(() => undefined)

  for (const pattern of ['**/api/v1/buildings', '**/api/v1/buildings?*']) {
    await page.route(pattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: buildings,
          pagination: { page: 1, pageSize: 20, totalItems: buildings.length, totalPages: 1 },
        }),
      })
    })
  }

  await page.route('**/api/v1/rooms**', async (route) => {
    const url = new URL(route.request().url())
    const buildingId = url.searchParams.get('buildingId')
    const status = url.searchParams.get('status')

    const filteredRooms = rooms.filter((room) => {
      const buildingMatches = buildingId ? room.buildingId === buildingId : true
      const statusMatches = status ? room.status === status : true
      return buildingMatches && statusMatches
    })

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: filteredRooms,
        pagination: { page: 1, pageSize: 20, totalItems: filteredRooms.length, totalPages: 1 },
      }),
    })
  })

  await page.route('**/api/v1/users/tenants**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: tenantUsers,
        pagination: { page: 1, pageSize: 20, totalItems: tenantUsers.length, totalPages: 1 },
      }),
    })
  })

  await page.route('**/api/v1/contracts**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^.*\/api\/v1/, '')
    const parts = path.split('/').filter(Boolean)

    if (parts[0] !== 'contracts') {
      await route.continue()
      return
    }

    if (parts.length === 1 && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: contracts.map(toContractDto),
          pagination: { page: 1, pageSize: 20, totalItems: contracts.length, totalPages: 1 },
        }),
      })
      return
    }

    if (parts.length === 1 && request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}') as {
        roomId: string
        tenantUserId: string
        startDate: string
        endDate: string
        moveInDate: string
        monthlyRent: number
        depositAmount: number
        note?: string
      }

      const existingActive = contracts.find((contract) => contract.roomId === body.roomId && contract.status === 'Active')
      if (existingActive) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Phòng đã có hợp đồng' }),
        })
        return
      }

      const room = rooms.find((item) => item.id === body.roomId)
      const tenant = tenantUsers.find((item) => item.id === body.tenantUserId)
      if (!room || !tenant) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Dữ liệu hợp đồng không hợp lệ' }),
        })
        return
      }

      const createdContract = createMockContract({
        id: `contract-${contracts.length + 1}`,
        roomId: room.id,
        roomNumber: room.roomNumber,
        buildingId: room.buildingId,
        buildingName: room.buildingName,
        tenantUserId: tenant.id,
        tenantName: tenant.fullName,
        startDate: body.startDate,
        endDate: body.endDate,
        moveInDate: body.moveInDate,
        monthlyRent: body.monthlyRent,
        depositAmount: body.depositAmount,
        note: body.note,
        tenants: [
          {
            id: `contract-tenant-${tenant.id}`,
            tenantUserId: tenant.id,
            tenantName: tenant.fullName,
            tenantEmail: tenant.email,
            tenantPhone: tenant.phone,
            isMainTenant: true,
            moveInDate: body.moveInDate,
          },
        ],
      })

      contracts.unshift(createdContract)

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: toContractDto(createdContract) }),
      })
      return
    }

    if (parts.length === 2) {
      const contract = contracts.find((item) => item.id === parts[1])
      if (!contract) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Không tìm thấy hợp đồng' }),
        })
        return
      }

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: contract }),
        })
        return
      }
    }

    if (parts.length === 3 && parts[2] === 'terminate') {
      const contract = contracts.find((item) => item.id === parts[1])
      if (!contract) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Không tìm thấy hợp đồng' }) })
        return
      }

      const body = JSON.parse(request.postData() || '{}') as { terminationDate: string; deductions: number; note?: string }
      const deductions = body.deductions ?? 0
      contract.status = 'Terminated'
      contract.terminationDate = body.terminationDate
      contract.terminationNote = body.note
      contract.refundAmount = Math.max(0, contract.depositAmount - deductions)
      contract.depositStatus = deductions === 0 ? 'Refunded' : deductions < contract.depositAmount ? 'PartiallyRefunded' : 'Forfeited'
      contract.updatedAt = '2026-03-24T00:00:00Z'

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: toContractDto(contract) }),
      })
      return
    }

    if (parts.length === 3 && parts[2] === 'renew') {
      const contract = contracts.find((item) => item.id === parts[1])
      if (!contract) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Không tìm thấy hợp đồng' }) })
        return
      }

      const body = JSON.parse(request.postData() || '{}') as { newEndDate: string; newMonthlyRent?: number }
      const renewedContract = createMockContract({
        id: `contract-${contracts.length + 1}`,
        roomId: contract.roomId,
        roomNumber: contract.roomNumber,
        buildingId: contract.buildingId,
        buildingName: contract.buildingName,
        tenantUserId: contract.tenantUserId,
        tenantName: contract.tenantName,
        startDate: contract.endDate,
        endDate: body.newEndDate,
        moveInDate: contract.moveInDate,
        monthlyRent: body.newMonthlyRent ?? contract.monthlyRent,
        depositAmount: contract.depositAmount,
        tenants: contract.tenants.map((tenant) => ({ ...tenant, moveOutDate: undefined })),
      })

      contract.status = 'Terminated'
      contract.updatedAt = '2026-03-24T00:00:00Z'
      contracts.unshift(renewedContract)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: toContractDto(renewedContract) }),
      })
      return
    }

    if (parts.length === 3 && parts[2] === 'tenants' && request.method() === 'POST') {
      const contract = contracts.find((item) => item.id === parts[1])
      const body = JSON.parse(request.postData() || '{}') as { tenantUserId: string; moveInDate: string }
      const tenant = tenantUsers.find((item) => item.id === body.tenantUserId)
      if (!contract || !tenant) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Không tìm thấy khách thuê' }) })
        return
      }

      const contractTenant = {
        id: `contract-tenant-${tenant.id}`,
        tenantUserId: tenant.id,
        tenantName: tenant.fullName,
        tenantEmail: tenant.email,
        tenantPhone: tenant.phone,
        isMainTenant: false,
        moveInDate: body.moveInDate,
      }

      contract.tenants.push(contractTenant)
      contract.updatedAt = '2026-03-24T00:00:00Z'

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: contractTenant }),
      })
      return
    }

    if (parts.length === 4 && parts[2] === 'tenants' && request.method() === 'DELETE') {
      const contract = contracts.find((item) => item.id === parts[1])
      if (!contract) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Không tìm thấy hợp đồng' }) })
        return
      }

      const tenant = contract.tenants.find((item) => item.id === parts[3])
      if (tenant) {
        tenant.moveOutDate = '2026-06-01'
      }
      contract.updatedAt = '2026-03-24T00:00:00Z'

      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.continue()
  })
}

// ─── Navigation ─────────────────────────────────────────

Given('I am viewing the contracts page', async function () {
  const page: Page = this.page
  await ensureContractApiMocks(page, this)
  await page.goto('/contracts')
})

Given('I am viewing the contract detail for room {string}', async function (roomNumber: string) {
  const page: Page = this.page
  await ensureContractApiMocks(page, this)
  this.targetRoomNumber = roomNumber
  const contract = requireContract(this, roomNumber)
  await page.goto(`/contracts/${contract.id}`)
})

// ─── Pre-conditions ─────────────────────────────────────

Given('there is an active contract for room {string}', async function (roomNumber: string) {
  const contract = requireContract(this, roomNumber)
  contract.status = 'Active'
  contract.depositStatus = 'Held'
  this.targetRoomNumber = roomNumber
  this.targetContractStatus = 'Active'
})

Given('the contract is currently active', async function () {
  const contract = requireContract(this, String(this.targetRoomNumber ?? '101'))
  contract.status = 'Active'
  contract.depositStatus = 'Held'
  this.targetContractStatus = 'Active'
  await refreshContractPage(this.page)
})

Given('the contract has status {string}', async function (status: string) {
  const contract = requireContract(this, String(this.targetRoomNumber ?? '101'))
  contract.status = status as MockContract['status']
  this.targetContractStatus = status
  await refreshContractPage(this.page)
})

Given('the contract deposit has status {string}', async function (status: string) {
  const contract = requireContract(this, String(this.targetRoomNumber ?? '101'))
  contract.depositStatus = status as MockContract['depositStatus']
  this.targetDepositStatus = status
  await refreshContractPage(this.page)
})

Given('{string} is a co-tenant on the contract', async function (name: string) {
  const contract = requireContract(this, String(this.targetRoomNumber ?? '101'))
  const tenant = getTenantUsers(this).find((item) => item.fullName === name)
  if (tenant && !contract.tenants.some((item) => item.tenantName === name && !item.moveOutDate)) {
    contract.tenants.push({
      id: `contract-tenant-${tenant.id}`,
      tenantUserId: tenant.id,
      tenantName: tenant.fullName,
      tenantEmail: tenant.email,
      tenantPhone: tenant.phone,
      isMainTenant: false,
      moveInDate: '2026-05-01',
    })
  }
  this.coTenantName = name
  await refreshContractPage(this.page)
})

Given('room {string} already has an active contract', async function (roomNumber: string) {
  const room = getRooms(this).find((item) => item.roomNumber === roomNumber)
  const tenant = getTenantUsers(this)[0]
  if (room && !findContractByRoomNumber(this, roomNumber)) {
    getContracts(this).push(
      createMockContract({
        roomId: room.id,
        roomNumber: room.roomNumber,
        buildingId: room.buildingId,
        buildingName: room.buildingName,
        tenantUserId: tenant.id,
        tenantName: tenant.fullName,
      }),
    )
  }
})

// ─── Form Interaction ───────────────────────────────────

When('I fill in the contract form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  for (const row of dataTable.hashes()) {
    const field = row['field']
    const value = row['value']

    if (/^\s*Phòng\s*$/i.test(field)) {
      const room = getRooms(this).find((item) => item.roomNumber === value)
      if (!room) {
        throw new Error(`Mock room not found for ${value}`)
      }

      await page.getByLabel(/Tòa nhà/).selectOption(room.buildingId)
      await page.getByLabel(/^Phòng/).selectOption(room.id)
      continue
    }

    if (/Khách thuê/i.test(field)) {
      const tenant = getTenantUsers(this).find((item) => item.fullName === value)
      if (!tenant) {
        throw new Error(`Mock tenant not found for ${value}`)
      }

      await page.getByLabel(/Khách thuê/).selectOption(tenant.id)
      continue
    }

    const normalizedField = field.replace('Ngày nhận phòng', 'Ngày dọn vào').replace('Tiền thuê', 'Giá thuê hàng tháng')
    const input = page.getByLabel(new RegExp(normalizedField))
    await input.clear()
    await input.fill(value)
  }
})

When('I submit the contract form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /^Tạo hợp đồng$/ }).click()
})

When('I click on the contract for room {string}', async function (roomNumber: string) {
  const page: Page = this.page
  await page.locator('tr').filter({ has: page.getByText(roomNumber) }).first().click()
  await expect(page).toHaveURL(/\/contracts\//)
})

When('I fill in the termination form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  for (const row of dataTable.hashes()) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the termination form', async function () {
  const page: Page = this.page
  await page.getByRole('dialog').getByRole('button', { name: /Chấm dứt hợp đồng|Xác nhận chấm dứt|Chấm dứt/ }).click()
})

When('I fill in the renewal form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  for (const row of dataTable.hashes()) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the renewal form', async function () {
  const page: Page = this.page
  await page.getByRole('dialog').getByRole('button', { name: /^Gia hạn$/ }).click()
})

When('I select tenant {string}', async function (name: string) {
  const page: Page = this.page
  const tenant = getTenantUsers(this).find((item) => item.fullName === name)
  if (!tenant) {
    throw new Error(`Mock tenant not found for ${name}`)
  }

  await page.getByLabel(/Khách thuê/).selectOption(tenant.id)
})

When('I fill in move-in date {string}', async function (date: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Ngày dọn vào/)
  await input.clear()
  await input.fill(date)
})

When('I submit the co-tenant form', async function () {
  const page: Page = this.page
  await page.getByRole('dialog').getByRole('button', { name: /^Thêm người ở$/ }).click()
})

When('I click remove on tenant {string}', async function (name: string) {
  const page: Page = this.page
  await page.getByRole('button', { name: new RegExp(`Xóa ${name}`) }).click()
})

When('I confirm the removal', async function () {
  const page: Page = this.page
  await page.getByRole('dialog').getByRole('button', { name: /Xóa|Xác nhận/ }).click()
})

When('I try to create a new contract for room {string}', async function (roomNumber: string) {
  const page: Page = this.page
  const room = getRooms(this).find((item) => item.roomNumber === roomNumber)
  const tenant = getTenantUsers(this).find((item) => item.id !== 'tenant-a')
  if (!room || !tenant) {
    throw new Error(`Unable to prepare contract creation for room ${roomNumber}`)
  }

  await page.getByRole('button', { name: /Hợp đồng mới/ }).click()
  await page.getByLabel(/Tòa nhà/).selectOption(room.buildingId)
  await page.getByLabel(/^Phòng/).selectOption(room.id)
  await page.getByLabel(/Khách thuê/).selectOption(tenant.id)
  await page.getByLabel(/Ngày bắt đầu/).fill('2026-04-01')
  await page.getByLabel(/Ngày kết thúc/).fill('2027-03-31')
  await page.getByLabel(/Ngày dọn vào/).fill('2026-04-01')
  await page.getByLabel(/Giá thuê hàng tháng/).fill(String(room.price))
  await page.getByLabel(/Tiền cọc/).fill('10000000')
  await page.getByRole('button', { name: /^Tạo hợp đồng$/ }).click()
})

// ─── Assertions ─────────────────────────────────────────

Then('the contract should appear in the contract list', async function () {
  const page: Page = this.page
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })
})

Then('I should see the contract detail page', async function () {
  const page: Page = this.page
  await expect(page).toHaveURL(/\/contracts\/[^/]+$/)
  await expect(page.getByRole('heading', { name: /Phòng 101/i })).toBeVisible({ timeout: 5000 })
})

Then('I should see contract tenant list', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Khách thuê \(/)).toBeVisible({ timeout: 5000 })
})

Then('I should see deposit information', async function () {
  const page: Page = this.page
  await expect(page.getByText('Tiền cọc').first()).toBeVisible({ timeout: 5000 })
})

Then('the contract status should change to {string}', async function (status: string) {
  const page: Page = this.page
  await expect(page.getByText(status).first()).toBeVisible({ timeout: 5000 })
})

Then('the terminate button should be available', async function () {
  const page: Page = this.page
  await expect(page.getByRole('button', { name: /^Chấm dứt$/ })).toBeVisible({ timeout: 3000 })
})

Then('the terminate button should not be available', async function () {
  const page: Page = this.page
  await expect(page.getByRole('button', { name: /^Chấm dứt$/ })).toHaveCount(0, { timeout: 3000 })
})

Then('the renew button should be available', async function () {
  const page: Page = this.page
  await expect(page.getByRole('button', { name: /^Gia hạn$/ })).toBeVisible({ timeout: 3000 })
})

Then('the renew button should not be available', async function () {
  const page: Page = this.page
  await expect(page.getByRole('button', { name: /^Gia hạn$/ })).toHaveCount(0, { timeout: 3000 })
})

Then('the deposit status should display {string}', async function (label: string) {
  const page: Page = this.page
  await expect(page.getByText(label)).toBeVisible({ timeout: 5000 })
})

Then('{string} should appear in the tenant list', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })
})

Then('{string} should not appear in the tenant list', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByRole('button', { name: new RegExp(`Xóa ${name}`) })).toHaveCount(0, { timeout: 5000 })
})
