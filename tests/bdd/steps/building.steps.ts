/**
 * Step definitions for building management BDD scenarios.
 */
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

type MockBuilding = {
  id: string
  ownerId: string
  name: string
  address: string
  description?: string
  totalFloors: number
  invoiceDueDay: number
  createdAt: string
  updatedAt: string
  totalRooms: number
  occupancyRate: number
  hasActiveContracts?: boolean
}

function createMockBuilding(overrides: Partial<MockBuilding> = {}): MockBuilding {
  const timestamp = '2026-01-01T00:00:00Z'

  return {
    id: overrides.id ?? `building-${Math.random().toString(36).slice(2, 10)}`,
    ownerId: overrides.ownerId ?? 'owner-1',
    name: overrides.name ?? 'Tòa nhà mẫu',
    address: overrides.address ?? '1 Demo Street',
    description: overrides.description,
    totalFloors: overrides.totalFloors ?? 5,
    invoiceDueDay: overrides.invoiceDueDay ?? 10,
    createdAt: overrides.createdAt ?? timestamp,
    updatedAt: overrides.updatedAt ?? timestamp,
    totalRooms: overrides.totalRooms ?? 20,
    occupancyRate: overrides.occupancyRate ?? 0.75,
    hasActiveContracts: overrides.hasActiveContracts ?? false,
  }
}

function getBuildingStore(world: Record<string, unknown>): MockBuilding[] {
  if (!Array.isArray(world.mockBuildings)) {
    world.mockBuildings = [
      createMockBuilding({
        id: 'building-a',
        name: 'Tòa nhà A',
        address: '12 Lý Thường Kiệt, Q1',
        description: 'Tòa nhà trung tâm',
        totalFloors: 8,
        totalRooms: 24,
        occupancyRate: 0.88,
      }),
      createMockBuilding({
        id: 'building-test',
        name: 'Tòa nhà Test',
        address: '99 Trần Hưng Đạo, Q5',
        totalFloors: 6,
        totalRooms: 18,
        occupancyRate: 0.5,
      }),
    ]
  }

  return world.mockBuildings as MockBuilding[]
}

function toBuildingDto(building: MockBuilding) {
  return {
    id: building.id,
    ownerId: building.ownerId,
    name: building.name,
    address: building.address,
    description: building.description,
    totalFloors: building.totalFloors,
    invoiceDueDay: building.invoiceDueDay,
    createdAt: building.createdAt,
    updatedAt: building.updatedAt,
  }
}

function toBuildingDetailDto(building: MockBuilding) {
  return {
    ...toBuildingDto(building),
    totalRooms: building.totalRooms,
    occupancyRate: building.occupancyRate,
  }
}

async function ensureBuildingApiMocks(page: Page, world: Record<string, unknown>) {
  if (world.buildingApiMocked) {
    return
  }

  world.buildingApiMocked = true
  const buildings = getBuildingStore(world)

  await page.unroute('**/api/v1/buildings**').catch(() => undefined)

  await page.route('**/api/v1/buildings**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^.*\/api\/v1/, '')
    const pathParts = path.split('/').filter(Boolean)

    if (pathParts[0] !== 'buildings') {
      await route.continue()
      return
    }

    if (pathParts.length === 3 && pathParts[2] === 'rooms') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
        }),
      })
      return
    }

    if (pathParts.length === 1) {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: buildings.map(toBuildingDto),
            pagination: { page: 1, pageSize: 20, totalItems: buildings.length, totalPages: 1 },
          }),
        })
        return
      }

      if (request.method() === 'POST') {
        const body = JSON.parse(request.postData() || '{}') as Partial<MockBuilding>
        const duplicate = buildings.find((item) => item.name === body.name)

        if (duplicate) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Tòa nhà đã tồn tại',
              errorCode: 'VALIDATION_ERROR',
              errors: { Name: ['Tòa nhà đã tồn tại'] },
            }),
          })
          return
        }

        const created = createMockBuilding({
          id: `building-${buildings.length + 1}`,
          name: body.name,
          address: body.address,
          description: body.description,
          totalFloors: body.totalFloors,
          invoiceDueDay: body.invoiceDueDay ?? 10,
          totalRooms: 0,
          occupancyRate: 0,
        })

        buildings.unshift(created)

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: toBuildingDto(created) }),
        })
        return
      }
    }

    if (pathParts.length === 2) {
      const id = pathParts[1]
      const building = buildings.find((item) => item.id === id)

      if (!building) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Không tìm thấy tòa nhà' }),
        })
        return
      }

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: toBuildingDetailDto(building) }),
        })
        return
      }

      if (request.method() === 'PUT') {
        const body = JSON.parse(request.postData() || '{}') as Partial<MockBuilding>
        const duplicate = buildings.find((item) => item.id !== id && item.name === body.name)

        if (duplicate) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Tòa nhà đã tồn tại',
              errorCode: 'VALIDATION_ERROR',
              errors: { Name: ['Tòa nhà đã tồn tại'] },
            }),
          })
          return
        }

        Object.assign(building, {
          name: body.name ?? building.name,
          address: body.address ?? building.address,
          description: body.description ?? building.description,
          totalFloors: body.totalFloors ?? building.totalFloors,
          invoiceDueDay: body.invoiceDueDay ?? building.invoiceDueDay,
          updatedAt: '2026-03-24T00:00:00Z',
        })

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: toBuildingDto(building) }),
        })
        return
      }

      if (request.method() === 'DELETE') {
        if (building.hasActiveContracts) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Tòa nhà có hợp đồng hiệu lực.' }),
          })
          return
        }

        const index = buildings.findIndex((item) => item.id === id)
        if (index >= 0) {
          buildings.splice(index, 1)
        }

        await route.fulfill({ status: 204, body: '' })
        return
      }
    }

    await route.continue()
  })
}

async function fillBaselineBuildingFields(page: Page) {
  await page.getByLabel(/Tên/).fill('Tòa nhà kiểm thử')
  await page.getByLabel(/Địa chỉ/).fill('123 Đường Kiểm Thử')
}

// ─── Navigation ─────────────────────────────────────────

Given('I am viewing the buildings page', async function () {
  const page: Page = this.page
  await ensureBuildingApiMocks(page, this)
  await page.goto('/buildings')
})

// ─── Pre-conditions ─────────────────────────────────────

Given('building {string} exists', async function (name: string) {
  const buildings = getBuildingStore(this)
  if (!buildings.some((building) => building.name === name)) {
    buildings.push(createMockBuilding({ name, address: '123 Test Street' }))
  }
  this.targetBuildingName = name
})

Given('building {string} already exists', async function (name: string) {
  const buildings = getBuildingStore(this)
  if (!buildings.some((building) => building.name === name)) {
    buildings.push(createMockBuilding({ name, address: '456 Lê Lợi' }))
  }
})

Given('building {string} exists with no active contracts', async function (name: string) {
  const buildings = getBuildingStore(this)
  const existing = buildings.find((building) => building.name === name)

  if (existing) {
    existing.hasActiveContracts = false
  } else {
    buildings.push(createMockBuilding({ name, address: '99 Trần Hưng Đạo', hasActiveContracts: false }))
  }

  this.targetBuildingName = name
})

// ─── Form Interaction ───────────────────────────────────

When('I fill in the building form with:', async function (dataTable: DataTable) {
  const page: Page = this.page
  const rows = dataTable.hashes()
  for (const row of rows) {
    const input = page.getByLabel(new RegExp(row['field']))
    await input.clear()
    await input.fill(row['value'])
  }
})

When('I submit the building form', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo tòa nhà|Lưu thay đổi/ }).click()
})

When('I submit the building form without filling required fields', async function () {
  const page: Page = this.page
  await page.getByRole('button', { name: /Tạo tòa nhà|Lưu thay đổi/ }).click()
})

When('I click edit on building {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.locator('tr').filter({ has: page.getByText(name) }).first()
  await row.getByRole('button', { name: /Sửa|Edit/ }).click()
})

When('I change the building name to {string}', async function (name: string) {
  const page: Page = this.page
  const input = page.getByLabel(/Tên/)
  await input.clear()
  await input.fill(name)
})

When('I click on building {string}', async function (name: string) {
  const page: Page = this.page
  await page.locator('tr').filter({ has: page.getByText(name) }).first().click()
})

When('I fill in building floors with {string}', async function (floors: string) {
  const page: Page = this.page
  await fillBaselineBuildingFields(page)
  const input = page.getByLabel(/Số tầng/)
  await input.clear()
  await input.fill(floors)
})

When('I fill in invoice due day with {string}', async function (day: string) {
  const page: Page = this.page
  await fillBaselineBuildingFields(page)
  await page.getByLabel(/Số tầng/).fill('5')
  const input = page.getByLabel(/Ngày hạn hóa đơn|Ngày đến hạn/)
  await input.clear()
  await input.fill(day)
})

When('I click delete on building {string}', async function (name: string) {
  const page: Page = this.page
  const row = page.locator('tr').filter({ has: page.getByText(name) }).first()
  await row.getByRole('button', { name: /Xóa|Delete/ }).click()
})

When('I confirm the deletion', async function () {
  const page: Page = this.page
  await page.getByRole('dialog').getByRole('button', { name: /Xóa|Xác nhận/ }).click()
})

// ─── Assertions ─────────────────────────────────────────

Then('the building {string} should appear in the building list', async function (name: string) {
  const page: Page = this.page
  await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })
})

Then('the building {string} should not appear in the building list', async function (name: string) {
  const page: Page = this.page
  await expect(page.locator('tr').filter({ has: page.getByText(name) })).toHaveCount(0, { timeout: 5000 })
})

Then('the page title should be {string}', async function (title: string) {
  const page: Page = this.page
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5000 })
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible({ timeout: 5000 })
})

Then('I should see the building detail page', async function () {
  const page: Page = this.page
  await expect(page.locator('[data-testid="building-detail"], main')).toBeVisible({ timeout: 5000 })
})

Then('I should see building statistics', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Tổng phòng|Tổng số phòng/)).toBeVisible({ timeout: 5000 })
})

Then('I should see the occupancy rate', async function () {
  const page: Page = this.page
  await expect(page.getByText(/Công suất|Tỷ lệ|lấp đầy/i)).toBeVisible({ timeout: 5000 })
})
