'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Settings, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MeteredBadge } from '@/components/ui/status-badge'
import { toast } from '@/components/ui/toaster'
import { formatCurrency } from '@/lib/utils'
import {
  roomServiceKeys,
  fetchRoomServices,
  updateRoomServices,
  removeRoomServiceOverride,
} from '@/lib/queries/room-services'
import { roomKeys } from '@/lib/queries/rooms'
import type { RoomServiceDto, RoomServiceOverride } from '@/types/api'

interface RoomServicesTabProps {
  roomId: string
}

interface ServiceOverrideState {
  isEnabled: boolean
  overrideUnitPrice: string
  overrideQuantity: string
}

export function RoomServicesTab({ roomId }: RoomServicesTabProps) {
  const queryClient = useQueryClient()
  const [overrides, setOverrides] = useState<Record<string, ServiceOverrideState>>({})
  const [isDirty, setIsDirty] = useState(false)

  const { data: services, isLoading, isError } = useQuery({
    queryKey: roomServiceKeys.byRoom(roomId),
    queryFn: () => fetchRoomServices(roomId),
  })

  // Initialize override state from fetched data
  useEffect(() => {
    if (services) {
      const initial: Record<string, ServiceOverrideState> = {}
      for (const svc of services) {
        initial[svc.serviceId] = {
          isEnabled: svc.isEnabled,
          overrideUnitPrice: svc.overrideUnitPrice?.toString() ?? '',
          overrideQuantity: svc.overrideQuantity?.toString() ?? '',
        }
      }
      setOverrides(initial)
      setIsDirty(false)
    }
  }, [services])

  const updateField = (serviceId: string, field: keyof ServiceOverrideState, value: string | boolean) => {
    setOverrides((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], [field]: value },
    }))
    setIsDirty(true)
  }

  const saveMutation = useMutation({
    mutationFn: (payload: RoomServiceOverride[]) => updateRoomServices(roomId, payload),
    onSuccess: () => {
      toast.success('Đã cập nhật dịch vụ phòng')
      queryClient.invalidateQueries({ queryKey: roomServiceKeys.byRoom(roomId) })
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(roomId) })
      setIsDirty(false)
    },
    onError: (error: Error) => toast.error('Lưu dịch vụ thất bại', error.message),
  })

  const handleSave = () => {
    if (!services) return
    const payload: RoomServiceOverride[] = services.map((svc) => {
      const state = overrides[svc.serviceId]
      return {
        serviceId: svc.serviceId,
        isEnabled: state?.isEnabled ?? svc.isEnabled,
        overrideUnitPrice: state?.overrideUnitPrice ? Number(state.overrideUnitPrice) : undefined,
        overrideQuantity: state?.overrideQuantity ? Number(state.overrideQuantity) : undefined,
      }
    })
    saveMutation.mutate(payload)
  }

  const handleReset = () => {
    if (services) {
      const initial: Record<string, ServiceOverrideState> = {}
      for (const svc of services) {
        initial[svc.serviceId] = {
          isEnabled: svc.isEnabled,
          overrideUnitPrice: svc.overrideUnitPrice?.toString() ?? '',
          overrideQuantity: svc.overrideQuantity?.toString() ?? '',
        }
      }
      setOverrides(initial)
      setIsDirty(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='animate-pulse space-y-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='h-14 bg-muted rounded' />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className='p-6 text-center text-sm text-muted-foreground'>
          Đã xảy ra lỗi khi tải dịch vụ phòng.
        </CardContent>
      </Card>
    )
  }

  if (!services || services.length === 0) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center py-12'>
          <Settings className='size-10 text-muted-foreground mb-3' />
          <p className='text-sm text-muted-foreground'>
            Tòa nhà chưa có dịch vụ nào.
          </p>
          <p className='text-xs text-muted-foreground mt-1'>
            Thêm dịch vụ trong cài đặt tòa nhà trước.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Cấu hình dịch vụ</CardTitle>
          <CardDescription>
            Bật/tắt dịch vụ cho phòng và tùy chỉnh giá.
            Thay đổi được lưu cùng lúc.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-0 divide-y'>
          {services.map((svc) => {
            const state = overrides[svc.serviceId]
            if (!state) return null
            return (
              <div
                key={svc.serviceId}
                className={`flex flex-wrap items-center gap-4 py-3 ${!state.isEnabled ? 'opacity-50' : ''}`}
              >
                {/* Toggle + Name */}
                <div className='flex items-center gap-3 min-w-[200px]'>
                  <button
                    type='button'
                    role='switch'
                    aria-checked={state.isEnabled}
                    aria-label={`Bật/tắt ${svc.serviceName}`}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                      state.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                    onClick={() => updateField(svc.serviceId, 'isEnabled', !state.isEnabled)}
                  >
                    <span
                      className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                        state.isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                      } mt-0.5`}
                    />
                  </button>
                  <div>
                    <p className='text-sm font-medium'>{svc.serviceName}</p>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-muted-foreground'>
                        {formatCurrency(svc.buildingUnitPrice)}/{svc.unit}
                      </span>
                      <MeteredBadge metered={svc.isMetered} />
                    </div>
                  </div>
                </div>

                {/* Override fields */}
                {state.isEnabled && (
                  <div className='flex items-center gap-3 ml-auto'>
                    <div className='space-y-1'>
                      <label htmlFor={`price-${svc.serviceId}`} className='text-[11px] text-muted-foreground'>Giá riêng</label>
                      <Input
                        id={`price-${svc.serviceId}`}
                        type='number'
                        min={0}
                        step={100}
                        placeholder='—'
                        value={state.overrideUnitPrice}
                        onChange={(e) => updateField(svc.serviceId, 'overrideUnitPrice', e.target.value)}
                        className='w-28 h-8 text-sm'
                      />
                    </div>
                    {!svc.isMetered && (
                      <div className='space-y-1'>
                        <label htmlFor={`qty-${svc.serviceId}`} className='text-[11px] text-muted-foreground'>SL riêng</label>
                        <Input
                          id={`qty-${svc.serviceId}`}
                          type='number'
                          min={0}
                          step={1}
                          placeholder='—'
                          value={state.overrideQuantity}
                          onChange={(e) => updateField(svc.serviceId, 'overrideQuantity', e.target.value)}
                          className='w-20 h-8 text-sm'
                        />
                      </div>
                    )}
                    <div className='space-y-1'>
                      <label className='text-[11px] text-muted-foreground'>Thực tế</label>
                      <p className='h-8 flex items-center text-sm font-medium'>
                        {formatCurrency(
                          state.overrideUnitPrice
                            ? Number(state.overrideUnitPrice)
                            : svc.buildingUnitPrice,
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Save bar */}
      {isDirty && (
        <div className='flex items-center justify-end gap-2 p-3 bg-muted/50 rounded-lg border'>
          <p className='text-sm text-muted-foreground mr-auto'>Bạn có thay đổi chưa lưu.</p>
          <Button variant='outline' size='sm' onClick={handleReset}>
            <RotateCcw className='size-3.5' />
            Hủy
          </Button>
          <Button size='sm' onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className='size-3.5' />
            {saveMutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </div>
      )}
    </div>
  )
}
