'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Gauge, Info, Loader2, Building2, AlertTriangle } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { PageTransition } from '@/components/Motion'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toaster'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import { DROPDOWN_PAGE_SIZE } from '@/lib/domain-constants'
import { roomKeys, fetchRooms } from '@/lib/queries/rooms'
import { serviceKeys, fetchBuildingServices } from '@/lib/queries/services'
import {
  meterReadingKeys,
  fetchMeterReadings,
  bulkUpsertMeterReadings,
} from '@/lib/queries/meter-readings'
import type { MeterReadingEntry } from '@/types/api'
import { formatBillingPeriod, getCurrentBillingPeriod } from '@/lib/utils'

// ─── Page ───────────────────────────────────────────────

export default function MeterReadingsPage() {
  const queryClient = useQueryClient()
  const defaultPeriod = getCurrentBillingPeriod()

  // ─── State ─────────────────────────────────────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [billingYear, setBillingYear] = useState(defaultPeriod.year)
  const [billingMonth, setBillingMonth] = useState(defaultPeriod.month)

  // Map of roomId-serviceId → currentReading (user edits)
  const [editedReadings, setEditedReadings] = useState<Record<string, number>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // ─── Data: Buildings ───────────────────────────────────
  const { data: buildingsData, isLoading: buildingsLoading, error: buildingsError } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: DROPDOWN_PAGE_SIZE }),
  })

  // ─── Data: Occupied Rooms ──────────────────────────────
  const { data: roomsData, error: roomsError } = useQuery({
    queryKey: roomKeys.list({ buildingId: selectedBuildingId, status: 'Occupied', pageSize: DROPDOWN_PAGE_SIZE }),
    queryFn: () => fetchRooms({ buildingId: selectedBuildingId, status: 'Occupied', pageSize: DROPDOWN_PAGE_SIZE }),
    enabled: !!selectedBuildingId,
  })

  // ─── Data: Building Services (metered only) ────────────
  const { data: servicesData, error: servicesError } = useQuery({
    queryKey: serviceKeys.byBuilding(selectedBuildingId),
    queryFn: () => fetchBuildingServices(selectedBuildingId),
    enabled: !!selectedBuildingId,
  })

  const meteredServices = useMemo(
    () => (servicesData ?? []).filter((s) => s.isMetered),
    [servicesData],
  )

  // ─── Data: Existing Readings ───────────────────────────
  const { data: readingsData, isLoading: readingsLoading, error: readingsError } = useQuery({
    queryKey: meterReadingKeys.list({
      buildingId: selectedBuildingId,
      billingYear,
      billingMonth,
    }),
    queryFn: () =>
      fetchMeterReadings({
        buildingId: selectedBuildingId,
        billingYear,
        billingMonth,
      }),
    enabled: !!selectedBuildingId,
  })

  // Index existing readings by roomId-serviceId
  const readingsMap = useMemo(() => {
    const map: Record<string, { previous: number; current: number }> = {}
    for (const r of readingsData ?? []) {
      map[`${r.roomId}-${r.serviceId}`] = {
        previous: r.previousReading,
        current: r.currentReading,
      }
    }
    return map
  }, [readingsData])

  // Reset edited readings when period/building changes
  useEffect(() => {
    setEditedReadings({})
    setHasChanges(false)
  }, [selectedBuildingId, billingYear, billingMonth])

  // ─── Handlers ──────────────────────────────────────────

  const handleReadingChange = (roomId: string, serviceId: string, value: string) => {
    const key = `${roomId}-${serviceId}`
    setEditedReadings((prev) => {
      const next = { ...prev }

      if (value === '') {
        delete next[key]
      } else {
        const numValue = parseFloat(value)
        if (!Number.isFinite(numValue)) return prev
        next[key] = numValue
      }

      setHasChanges(Object.keys(next).length > 0)
      return next
    })
  }

  const getCurrentValue = (roomId: string, serviceId: string) => {
    const key = `${roomId}-${serviceId}`
    if (key in editedReadings) {
      return editedReadings[key]
    }
    return readingsMap[key]?.current ?? 0
  }

  const getPreviousValue = (roomId: string, serviceId: string) => {
    const key = `${roomId}-${serviceId}`
    return readingsMap[key]?.previous ?? 0
  }

  // ─── Mutation ──────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: () => {
      // Only submit rooms/services that were actually edited by the user
      // or already have existing readings (to allow corrections)
      const readings: MeterReadingEntry[] = []

      for (const [key, value] of Object.entries(editedReadings)) {
        const [roomId, serviceId] = key.split('-')
        const previous = getPreviousValue(roomId, serviceId)
        if (value < previous) {
          throw new Error(`Current reading (${value}) is less than previous reading (${previous}). Please check your entries.`)
        }
        readings.push({
          roomId,
          serviceId,
          currentReading: value,
        })
      }

      if (readings.length === 0) {
        throw new Error('No readings were changed.')
      }

      return bulkUpsertMeterReadings({
        buildingId: selectedBuildingId,
        billingYear,
        billingMonth,
        readings,
      })
    },
    onSuccess: () => {
      toast.success(
        'Đã lưu chỉ số đồng hồ',
        `Chỉ số ${formatBillingPeriod(billingYear, billingMonth)} đã ghi nhận thành công.`,
      )
      queryClient.invalidateQueries({ queryKey: meterReadingKeys.all })
      setEditedReadings({})
      setHasChanges(false)
    },
    onError: (error: Error) => {
      toast.error('Không thể lưu chỉ số', error.message)
    },
  })

  // ─── Render ────────────────────────────────────────────

  const rooms = roomsData?.data ?? []
  const noMeteredServices = meteredServices.length === 0
  const noOccupiedRooms = rooms.length === 0
  const loadError = buildingsError || roomsError || servicesError || readingsError

  // ─── No Buildings Prerequisite ─────────────────────────
  if (buildingsData && (buildingsData.data ?? []).length === 0) {
    return (
      <PageTransition>
      <PageContainer title='Ghi chỉ số đồng hồ' description='Ghi nhận chỉ số đồng hồ tiện ích để tính hóa đơn.'>
        <EmptyState
          icon={<Building2 className='size-12' />}
          title='Chưa có tòa nhà'
          description='Thêm tòa nhà đầu tiên để ghi chỉ số đồng hồ.'
          actionLabel='Đến trang Tòa nhà'
          actionHref='/buildings'
        />
      </PageContainer>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
    <PageContainer
      title='Ghi chỉ số đồng hồ'
      description='Ghi nhận chỉ số đồng hồ tiện ích để tính hóa đơn.'
      actions={
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!selectedBuildingId || !hasChanges || submitMutation.isPending || noMeteredServices || noOccupiedRooms}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className='size-4 animate-spin' />
              Đang lưu…
            </>
          ) : (
            'Lưu chỉ số'
          )}
        </Button>
      }
    >
      {/* Filters */}
      <Card className='mb-6'>
        <CardContent className='pt-6'>
          <div className='grid gap-4 sm:grid-cols-3'>
            {/* Building */}
            <div className='space-y-2'>
              <Label htmlFor='mr-building'>Tòa nhà</Label>
              {buildingsLoading ? (
                <Skeleton className='h-10' />
              ) : (
                <Select
                  id='mr-building'
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                >
                  <option value=''>Chọn tòa nhà…</option>
                  {(buildingsData?.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              )}
            </div>

            {/* Year */}
            <div className='space-y-2'>
              <Label htmlFor='mr-year'>Năm</Label>
              <Select
                id='mr-year'
                value={billingYear}
                onChange={(e) => setBillingYear(Number(e.target.value))}
              >
                {[defaultPeriod.year - 1, defaultPeriod.year, defaultPeriod.year + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>

            {/* Month */}
            <div className='space-y-2'>
              <Label htmlFor='mr-month'>Tháng</Label>
              <Select
                id='mr-month'
                value={billingMonth}
                onChange={(e) => setBillingMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleDateString('vi-VN', { month: 'long' })}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className='mb-6 flex items-start gap-3 rounded-lg border border-info/20 bg-info/5 p-4'>
        <Info className='size-5 text-info shrink-0 mt-0.5' />
        <div className='text-sm text-foreground'>
          <p className='font-medium'>Kỳ thanh toán: {formatBillingPeriod(billingYear, billingMonth)}</p>
          <p className='mt-1 text-info'>
            Nhập chỉ số đồng hồ hiện tại bên dưới. Chỉ số trước được tự động điền từ tháng trước.
            Tiêu thụ = Hiện tại − Trước đó.
          </p>
        </div>
      </div>

      {!selectedBuildingId && !buildingsLoading && !loadError && (
        <EmptyState
          icon={<Building2 className='size-8' />}
          title='Chọn tòa nhà'
          description='Chọn tòa nhà trước khi nhập chỉ số đồng hồ để lưới phòng và dịch vụ được phân định rõ ràng.'
        />
      )}

      {selectedBuildingId && loadError && (
        <EmptyState
          icon={<AlertTriangle className='size-8' />}
          title='Không thể tải chỉ số đồng hồ'
          description={loadError instanceof Error ? loadError.message : 'Đã xảy ra lỗi không mong đợi khi tải dữ liệu chỉ số đồng hồ.'}
          actionLabel='Thử lại'
          onAction={() => {
            queryClient.invalidateQueries({ queryKey: buildingKeys.all })
            queryClient.invalidateQueries({ queryKey: roomKeys.all })
            queryClient.invalidateQueries({ queryKey: serviceKeys.all })
            queryClient.invalidateQueries({ queryKey: meterReadingKeys.all })
          }}
        />
      )}

      {/* Empty States */}
      {!loadError && noMeteredServices && selectedBuildingId && (
        <Card>
          <CardContent className='py-12 text-center'>
            <Gauge className='size-12 text-muted-foreground mx-auto mb-4' />
            <h3 className='font-semibold'>Không có dịch vụ đo đếm</h3>
            <p className='text-sm text-muted-foreground mt-1'>
              Tòa nhà này chưa có dịch vụ đo đếm (ví dụ: điện, nước).
              Hãy thêm dịch vụ đo đếm cho tòa nhà trước.
            </p>
          </CardContent>
        </Card>
      )}

      {!loadError && !noMeteredServices && noOccupiedRooms && selectedBuildingId && (
        <Card>
          <CardContent className='py-12 text-center'>
            <CalendarDays className='size-12 text-muted-foreground mx-auto mb-4' />
            <h3 className='font-semibold'>Không có phòng đang ở</h3>
            <p className='text-sm text-muted-foreground mt-1'>
              Tòa nhà này chưa có phòng nào có người thuê.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Matrix Grid */}
      {!loadError && selectedBuildingId && !noMeteredServices && !noOccupiedRooms && (
        readingsLoading ? (
          <Card>
            <CardContent className='py-8 space-y-4'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className='h-12' />
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className='text-base flex items-center gap-2'>
                <Gauge className='size-4' />
                Nhập chỉ số ({rooms.length} phòng × {meteredServices.length} dịch vụ)
              </CardTitle>
              <CardDescription>
                Nhập giá trị đồng hồ hiện tại cho mỗi phòng và dịch vụ.
              </CardDescription>
            </CardHeader>
            <CardContent className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b'>
                    <th className='text-left font-medium py-2 px-3 min-w-28'>Phòng</th>
                    {meteredServices.map((service) => (
                      <th key={service.id} className='text-left font-medium py-2 px-3 min-w-40'>
                        <div>{service.name}</div>
                        <div className='text-xs text-muted-foreground font-normal'>({service.unit})</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room.id} className='border-b last:border-0'>
                      <td className='py-3 px-3 font-medium'>
                        <div>{room.roomNumber}</div>
                        <div className='text-xs text-muted-foreground'>Tầng {room.floor}</div>
                      </td>
                      {meteredServices.map((service) => {
                        const prevVal = getPreviousValue(room.id, service.id)
                        const currVal = getCurrentValue(room.id, service.id)
                        const consumption = currVal - prevVal

                        return (
                          <td key={service.id} className='py-3 px-3'>
                            <div className='space-y-1'>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs text-muted-foreground w-12'>Trước:</span>
                                <span className='text-xs'>{prevVal.toLocaleString('vi-VN')}</span>
                              </div>
                              <Input
                                type='number'
                                min={0}
                                step={1}
                                value={currVal}
                                onChange={(e) => handleReadingChange(room.id, service.id, e.target.value)}
                                className='w-28 h-8 text-sm'
                                aria-label={`Chỉ số hiện tại ${room.roomNumber} ${service.name}`}
                              />
                              <div className='flex items-center gap-2'>
                                <span className='text-xs text-muted-foreground w-12'>Dùng:</span>
                                <span className={`text-xs font-medium ${consumption < 0 ? 'text-destructive' : ''}`}>
                                  {consumption.toLocaleString('vi-VN')} {service.unit}
                                </span>
                              </div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      )}
    </PageContainer>
    </PageTransition>
  )
}
