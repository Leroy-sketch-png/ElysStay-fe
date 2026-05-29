import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBuildings } from '@/hooks/useBuildings'
import * as buildingQueries from '@/lib/queries/buildings'
import React from 'react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useBuildings hook', () => {
  it('should fetch and return buildings', async () => {
    const mockData = {
      items: [{ id: '1', name: 'Building A' }],
      totalCount: 1,
      page: 1,
      pageSize: 20
    }
    
    vi.spyOn(buildingQueries, 'fetchBuildings').mockResolvedValue(mockData as any)

    const { result } = renderHook(() => useBuildings(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockData)
    expect(buildingQueries.fetchBuildings).toHaveBeenCalled()
  })
})
