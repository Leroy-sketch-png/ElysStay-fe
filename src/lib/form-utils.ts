import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './api-client'

/**
 * Map backend field validation errors (FluentValidation) to react-hook-form field errors.
 *
 * Backend returns PascalCase property names (`TotalFloors`).
 * Frontend forms use camelCase field names (`totalFloors`).
 * This converts automatically.
 *
 * @returns `true` if at least one field error was mapped (caller can skip the generic toast).
 */
export function mapApiErrorsToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || !error.errors) return false

  let mapped = false
  for (const [key, messages] of Object.entries(error.errors)) {
    if (!messages.length) continue
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1)
    setError(camelKey as Path<T>, { type: 'server', message: messages[0] })
    mapped = true
  }
  return mapped
}
