
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../fixtures/server'
import { server } from '../fixtures/server'
import { http, apiUrl, apiSuccess, apiValidationError, apiError } from '../fixtures/handlers'
import { renderWithProviders } from '../fixtures/render'
import { RecordPaymentDialog } from '@/app/(dashboard)/billing/invoices/[id]/record-payment-dialog'
import type { InvoiceDetailDto } from '@/types/api'

vi.mock('@/components/ui/toaster', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Fixtures ────────────────────────────────────────────

function makeInvoice(overrides: Partial<InvoiceDetailDto> = {}): InvoiceDetailDto {
  return {
    id: 'inv-1',
    contractId: 'contract-1',
    roomId: 'room-1',
    roomNumber: '101',
    buildingId: 'building-1',
    buildingName: 'Tòa A',
    tenantUserId: 'user-1',
    tenantName: 'Nguyễn Văn A',
    billingYear: 2026,
    billingMonth: 5,
    rentAmount: 5000000,
    serviceAmount: 500000,
    penaltyAmount: 0,
    discountAmount: 0,
    totalAmount: 5500000,
    paidAmount: 0,
    status: 'Sent',
    dueDate: '2026-05-10',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    lineItems: [],
    payments: [],
    ...overrides,
  }
}

const DEFAULT_INVOICE = makeInvoice()

function renderDialog(
  props: Partial<{ open: boolean; onOpenChange: ReturnType<typeof vi.fn>; invoice: InvoiceDetailDto }> = {},
) {
  const onOpenChange = props.onOpenChange ?? vi.fn()
  renderWithProviders(
    <RecordPaymentDialog
      open={props.open ?? true}
      onOpenChange={onOpenChange}
      invoice={props.invoice ?? DEFAULT_INVOICE}
    />,
  )
  return { onOpenChange }
}

// ─── Rendering ───────────────────────────────────────────

describe('RecordPaymentDialog — rendering', () => {
  it('renders the dialog title and description', () => {
    renderDialog()
    expect(screen.getByText('Ghi nhận thanh toán')).toBeInTheDocument()
    expect(screen.getByText(/Phòng 101/)).toBeInTheDocument()
  })

  it('shows invoice summary: total, paid, amount due', () => {
    renderDialog()
    // totalAmount = 5,500,000 | paidAmount = 0 → amountDue = 5,500,000
    expect(screen.getByText('Tổng hóa đơn')).toBeInTheDocument()
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument()
    expect(screen.getByText('Còn nợ')).toBeInTheDocument()
  })

  it('pre-fills the amount field with the full amount due', () => {
    renderDialog()
    const amountInput = screen.getByLabelText(/Số tiền thanh toán/)
    expect(amountInput).toHaveValue(5500000)
  })

  it('pre-fills amount due when invoice is partially paid', () => {
    const invoice = makeInvoice({ paidAmount: 2000000 }) // amountDue = 3,500,000
    renderDialog({ invoice })
    const amountInput = screen.getByLabelText(/Số tiền thanh toán/)
    expect(amountInput).toHaveValue(3500000)
  })

  it('renders payment method select', () => {
    renderDialog()
    expect(screen.getByLabelText('Phương thức')).toBeInTheDocument()
  })

  it('renders note textarea', () => {
    renderDialog()
    expect(screen.getByLabelText('Ghi chú')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    renderDialog({ open: false })
    expect(screen.queryByText('Ghi nhận thanh toán')).not.toBeInTheDocument()
  })
})

// ─── "Toàn bộ" button ────────────────────────────────────

describe('RecordPaymentDialog — "Tổng tiền" button', () => {
  it('resets the amount to full amount due', async () => {
    const user = userEvent.setup()
    renderDialog()

    const amountInput = screen.getByLabelText(/Số tiền thanh toán/)
    await user.clear(amountInput)
    await user.type(amountInput, '1000000')

    await user.click(
      screen.getByRole('button', { name: 'Tổng tiền' })
    )

    expect(amountInput).toHaveValue(5500000)
  })
})

// ─── Payment preview ─────────────────────────────────────

describe('RecordPaymentDialog — payment preview', () => {
  it('shows "Đã thanh toán đủ" when the full amount is entered', async () => {
    const user = userEvent.setup()
    renderDialog()

    const amountInput = screen.getByLabelText(/Số tiền thanh toán/)
    await user.clear(amountInput)
    await user.type(amountInput, '5500000')

    expect(await screen.findByText('Đã thanh toán đủ'))
      .toBeInTheDocument()
  })

  it('shows remaining balance for partial payment', async () => {
    const user = userEvent.setup()
    renderDialog()

    const amountInput = screen.getByLabelText(/Số tiền thanh toán/)
    await user.clear(amountInput)
    await user.type(amountInput, '2000000')

    await waitFor(() => {
      // remaining = 5,500,000 - 2,000,000 = 3,500,000
      expect(screen.getByText(/Còn lại/)).toBeInTheDocument()
    })
  })
})

// ─── Validation ──────────────────────────────────────────

describe('RecordPaymentDialog — validation', () => {
  it('shows error when amount is zero', async () => {
    const user = userEvent.setup()
    renderDialog()

    const amountInput = screen.getByLabelText(/Số tiền thanh toán/)
    await user.clear(amountInput)
    await user.type(amountInput, '0')
    await user.click(screen.getByRole('button', { name: 'Ghi nhận' }))

    await waitFor(() => {
      expect(screen.getByText('Số tiền phải dương')).toBeInTheDocument()
    })
  })

  it('shows error when amount exceeds amount due', async () => {
    const user = userEvent.setup()
    renderDialog()

    const amountInput = screen.getByLabelText(/Số tiền thanh toán/)
    await user.clear(amountInput)
    await user.type(amountInput, '9999999')
    await user.click(screen.getByRole('button', { name: 'Ghi nhận' }))

    await waitFor(() => {
      expect(screen.getByText(/Thanh toán không được vượt quá/)).toBeInTheDocument()
    })
  })
})

// ─── Successful submission ────────────────────────────────

describe('RecordPaymentDialog — successful submission', () => {
  it('calls POST /invoices/:id/payments and closes dialog', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null

    server.use(
      http.post(apiUrl('/invoices/inv-1/payments'), async ({ request }) => {
        capturedBody = await request.json()
        return apiSuccess({ id: 'pay-1', amount: 5500000 })
      }),
    )

    const { onOpenChange } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Ghi nhận' }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
    expect(capturedBody).toMatchObject({ amount: 5500000 })
  })

  it('submits selected payment method', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null

    server.use(
      http.post(apiUrl('/invoices/inv-1/payments'), async ({ request }) => {
        capturedBody = await request.json()
        return apiSuccess({ id: 'pay-1', amount: 5500000 })
      }),
    )

    renderDialog()

    const methodSelect = screen.getByLabelText('Phương thức')
    await user.selectOptions(methodSelect, 'Cash')

    await user.click(screen.getByRole('button', { name: 'Ghi nhận' }))

    await waitFor(() => {
      expect(capturedBody).toMatchObject({ paymentMethod: 'Cash' })
    })
  })

  it('submits note when provided', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null

    server.use(
      http.post(apiUrl('/invoices/inv-1/payments'), async ({ request }) => {
        capturedBody = await request.json()
        return apiSuccess({ id: 'pay-1', amount: 5500000 })
      }),
    )

    const { onOpenChange } = renderDialog()

    const noteTextarea = screen.getByLabelText('Ghi chú')
    await user.click(noteTextarea)
    await user.type(noteTextarea, 'MB Bank ref 12345')

    await user.click(screen.getByRole('button', { name: 'Ghi nhận' }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
    expect(capturedBody).toMatchObject({ note: 'MB Bank ref 12345' })
  })
})

// ─── Server-side errors ───────────────────────────────────

describe('RecordPaymentDialog — server errors', () => {
  it('maps validation errors to form fields', async () => {
    const user = userEvent.setup()

    server.use(
      http.post(apiUrl('/invoices/inv-1/payments'), () =>
        apiValidationError({ Amount: ['Số tiền không hợp lệ.'] }),
      ),
    )

    renderDialog()
    await user.click(screen.getByRole('button', { name: 'Ghi nhận' }))

    await waitFor(() => {
      expect(screen.getByText('Số tiền không hợp lệ.')).toBeInTheDocument()
    })
  })

  it('shows toast error for non-validation API errors', async () => {
    const user = userEvent.setup()
    const { toast } = await import('@/components/ui/toaster')

    server.use(
      http.post(apiUrl('/invoices/inv-1/payments'), () =>
        apiError(409, 'Invoice is already fully paid', 'ALREADY_PAID'),
      ),
    )

    renderDialog()
    await user.click(screen.getByRole('button', { name: 'Ghi nhận' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Ghi nhận thanh toán thất bại',
        expect.any(String),
      )
    })
  })
})

// ─── Cancel button ───────────────────────────────────────

describe('RecordPaymentDialog — cancel', () => {
  it('calls onOpenChange(false) when Hủy is clicked', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Hủy' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
