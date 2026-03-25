/**
 * Integration tests for RoomFormDialog.
 *
 * Verifies form rendering, client-side Zod validation, API submission via MSW,
 * and server-side error mapping via mapApiErrorsToForm.
 */
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../fixtures/server'
import { server } from '../fixtures/server'
import { http, apiUrl, apiSuccess, apiValidationError } from '../fixtures/handlers'
import { renderWithProviders } from '../fixtures/render'
import { RoomFormDialog } from '@/app/(dashboard)/rooms/room-form-dialog'

// Mock toast so we can assert on calls without rendering Toaster
vi.mock('@/components/ui/toaster', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock useAuth so components that call it get the test auth context
vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    initialized: true,
    authenticated: true,
    user: {
      keycloakId: '00000000-0000-0000-0000-000000000001',
      email: 'owner@elysstay.test',
      fullName: 'Test Owner',
      roles: ['Owner'],
    },
    token: 'mock-jwt-token',
    authError: null,
    login: vi.fn(),
    loginWithPassword: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn(),
    hasRole: (role: string) => role.toLowerCase() === 'owner',
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const DEFAULT_PROPS = {
  open: true,
  onOpenChange: vi.fn(),
  mode: 'create' as const,
  buildingId: 'building-1',
  totalFloors: 5,
}

describe('RoomFormDialog', () => {
  // ─── Rendering ──────────────────────────────────────────

  it('renders the create dialog with correct title', () => {
    renderWithProviders(<RoomFormDialog {...DEFAULT_PROPS} />)
    expect(screen.getByText('Thêm phòng')).toBeInTheDocument()
  })

  it('renders the edit dialog title when mode is edit', () => {
    const room = {
      id: 'room-1',
      buildingId: 'building-1',
      roomNumber: '101',
      floor: 2,
      area: 30,
      price: 5000000,
      maxOccupants: 3,
      description: 'Nice room',
      status: 'Available' as const,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    }
    renderWithProviders(
      <RoomFormDialog {...DEFAULT_PROPS} mode='edit' room={room} />,
    )
    expect(screen.getByText('Sửa phòng')).toBeInTheDocument()
  })

  it('renders all required fields', () => {
    renderWithProviders(<RoomFormDialog {...DEFAULT_PROPS} />)
    expect(screen.getByLabelText(/Số phòng/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tầng/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Diện tích/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Giá/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Sức chứa/)).toBeInTheDocument()
  })

  // ─── Client-side Validation ─────────────────────────────

  it('shows validation error when room number is empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RoomFormDialog {...DEFAULT_PROPS} />)

    // Clear the room number field and submit
    const roomNumberInput = screen.getByLabelText(/Số phòng/)
    await user.clear(roomNumberInput)

    const submitButton = screen.getByRole('button', { name: 'Tạo phòng' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Số phòng là bắt buộc')).toBeInTheDocument()
    })
  })

  // ─── Successful Create ──────────────────────────────────

  it('calls create API and closes dialog on success', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()

    server.use(
      http.post(apiUrl('/buildings/building-1/rooms'), () =>
        apiSuccess({
          id: 'new-room',
          buildingId: 'building-1',
          roomNumber: '201',
          floor: 2,
          area: 25,
          price: 3000000,
          maxOccupants: 2,
          status: 'Available',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        }),
      ),
    )

    renderWithProviders(
      <RoomFormDialog {...DEFAULT_PROPS} onOpenChange={onOpenChange} />,
    )

    // Fill in the form
    const roomNumberInput = screen.getByLabelText(/Số phòng/)
    await user.clear(roomNumberInput)
    await user.type(roomNumberInput, '201')

    const floorInput = screen.getByLabelText(/Tầng/)
    await user.clear(floorInput)
    await user.type(floorInput, '2')

    const areaInput = screen.getByLabelText(/Diện tích/)
    await user.clear(areaInput)
    await user.type(areaInput, '25')

    const priceInput = screen.getByLabelText(/Giá/)
    await user.clear(priceInput)
    await user.type(priceInput, '3000000')

    const maxInput = screen.getByLabelText(/Sức chứa/)
    await user.clear(maxInput)
    await user.type(maxInput, '2')

    // Submit
    const submitButton = screen.getByRole('button', { name: 'Tạo phòng' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  // ─── Server-side Validation Error Mapping ───────────────

  it('maps server validation errors to form fields', async () => {
    const user = userEvent.setup()

    server.use(
      http.post(apiUrl('/buildings/building-1/rooms'), () =>
        apiValidationError({ RoomNumber: ['Phòng 201 đã tồn tại trong tòa nhà.'] }),
      ),
    )

    renderWithProviders(<RoomFormDialog {...DEFAULT_PROPS} />)

    // Fill form with valid data
    const roomNumberInput = screen.getByLabelText(/Số phòng/)
    await user.clear(roomNumberInput)
    await user.type(roomNumberInput, '201')

    const floorInput = screen.getByLabelText(/Tầng/)
    await user.clear(floorInput)
    await user.type(floorInput, '2')

    const areaInput = screen.getByLabelText(/Diện tích/)
    await user.clear(areaInput)
    await user.type(areaInput, '25')

    const priceInput = screen.getByLabelText(/Giá/)
    await user.clear(priceInput)
    await user.type(priceInput, '3000000')

    const maxInput = screen.getByLabelText(/Sức chứa/)
    await user.clear(maxInput)
    await user.type(maxInput, '2')

    // Submit
    const submitButton = screen.getByRole('button', { name: 'Tạo phòng' })
    await user.click(submitButton)

    // The server error for RoomNumber should appear as a field-level error
    await waitFor(() => {
      expect(screen.getByText('Phòng 201 đã tồn tại trong tòa nhà.')).toBeInTheDocument()
    })
  })

  // ─── Dialog not rendered when closed ────────────────────

  it('does not render content when open is false', () => {
    renderWithProviders(<RoomFormDialog {...DEFAULT_PROPS} open={false} />)
    expect(screen.queryByText('Thêm phòng')).not.toBeInTheDocument()
  })
})
