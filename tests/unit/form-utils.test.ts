/**
 * Unit tests for @/lib/form-utils
 *
 * Covers: mapApiErrorsToForm — PascalCase→camelCase field error mapping.
 */
import { mapApiErrorsToForm } from '@/lib/form-utils'
import { ApiError } from '@/lib/api-client'

describe('mapApiErrorsToForm', () => {
  it('maps a single PascalCase backend field to camelCase form field', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'VALIDATION_ERROR', {
      RoomNumber: ['Số phòng đã tồn tại.'],
    })

    const result = mapApiErrorsToForm(error, setError)

    expect(result).toBe(true)
    expect(setError).toHaveBeenCalledOnce()
    expect(setError).toHaveBeenCalledWith('roomNumber', {
      type: 'server',
      message: 'Số phòng đã tồn tại.',
    })
  })

  it('maps multiple fields at once and uses only the first message per field', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'VALIDATION_ERROR', {
      TotalFloors: ['Phải lớn hơn 0.', 'Tối đa 100 tầng.'],
      Name: ['Tên không được để trống.'],
    })

    mapApiErrorsToForm(error, setError)

    expect(setError).toHaveBeenCalledWith('totalFloors', {
      type: 'server',
      message: 'Phải lớn hơn 0.',
    })
    expect(setError).toHaveBeenCalledWith('name', {
      type: 'server',
      message: 'Tên không được để trống.',
    })
  })

  it('returns false and does not call setError for a generic Error', () => {
    const setError = vi.fn()
    const result = mapApiErrorsToForm(new Error('Network error'), setError)

    expect(result).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })

  it('returns false for an ApiError that has no field errors', () => {
    const setError = vi.fn()
    const error = new ApiError(500, 'INTERNAL_ERROR')

    const result = mapApiErrorsToForm(error, setError)

    expect(result).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })

  it('returns false for non-Error primitives (null, string)', () => {
    const setError = vi.fn()

    expect(mapApiErrorsToForm(null, setError)).toBe(false)
    expect(mapApiErrorsToForm('some message', setError)).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})
