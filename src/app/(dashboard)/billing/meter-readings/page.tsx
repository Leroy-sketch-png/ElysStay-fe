'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Gauge, Info, Loader2 } from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toaster'
import { buildingKeys, fetchBuildings } from '@/lib/queries/buildings'
import { roomKeys, fetchRooms } from '@/lib/queries/rooms'
import { serviceKeys, fetchBuildingServices } from '@/lib/queries/services'
import {
  meterReadingKeys,
  fetchMeterReadings,
  bulkUpsertMeterReadings,
} from '@/lib/queries/meter-readings'
import type { MeterReadingEntry } from '@/types/api'

// ─── Helpers ────────────────────────────────────────────

function getCurrentBillingPeriod() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

function formatBillingPeriod(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })
}

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
  const { data: buildingsData, isLoading: buildingsLoading } = useQuery({
    queryKey: buildingKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => fetchBuildings({ page: 1, pageSize: 100 }),
  })

  // Auto-select first building
  useEffect(() => {
    if (!selectedBuildingId && buildingsData?.data && buildingsData.data.length > 0) {
      setSelectedBuildingId(buildingsData.data[0].id)
    }
  }, [buildingsData, selectedBuildingId])

  // ─── Data: Occupied Rooms ──────────────────────────────
  const { data: roomsData } = useQuery({
    queryKey: roomKeys.list({ buildingId: selectedBuildingId, status: 'Occupied', pageSize: 200 }),
    queryFn: () => fetchRooms({ buildingId: selectedBuildingId, status: 'Occupied', pageSize: 200 }),
    enabled: !!selectedBuildingId,
  })

  // ─── Data: Building Services (metered only) ────────────
  const { data: servicesData } = useQuery({
    queryKey: serviceKeys.byBuilding(selectedBuildingId),
    queryFn: () => fetchBuildingServices(selectedBuildingId),
    enabled: !!selectedBuildingId,
  })

  const meteredServices = useMemo(
    () => (servicesData ?? []).filter((s) => s.isMetered),
    [servicesData],
  )

  // ─── Data: Existing Readings ───────────────────────────
  const { data: readingsData, isLoading: readingsLoading } = useQuery({
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
    const numValue = value === '' ? 0 : parseFloat(value)
    setEditedReadings((prev) => ({ ...prev, [key]: numValue }))
    setHasChanges(true)
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
      const readings: MeterReadingEntry[] = []
      const rooms = roomsData?.data ?? []

      for (const room of rooms) {
        for (const service of meteredServices) {
          const current = getCurrentValue(room.id, service.id)
          readings.push({
            roomId: room.id,
            serviceId: service.id,
            currentReading: current,
          })
        }
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
        'Meter readings saved',
        `${formatBillingPeriod(billingYear, billingMonth)} readings submitted successfully.`,
      )
      queryClient.invalidateQueries({ queryKey: meterReadingKeys.all })
      setEditedReadings({})
      setHasChanges(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to save readings', error.message)
    },
  })

  // ─── Render ────────────────────────────────────────────

  const rooms = roomsData?.data ?? []
  const noMeteredServices = meteredServices.length === 0
  const noOccupiedRooms = rooms.length === 0

  return (
    <PageContainer
      title='Meter Readings'
      description='Record utility meter readings for billing.'
      actions={
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!hasChanges || submitMutation.isPending || noMeteredServices || noOccupiedRooms}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className='size-4 animate-spin' />
              Saving…
            </>
          ) : (
            'Save Readings'
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
              <Label htmlFor='mr-building'>Building</Label>
              {buildingsLoading ? (
                <Skeleton className='h-10' />
              ) : (
                <Select
                  id='mr-building'
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                >
                  {(buildingsData?.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              )}
            </div>

            {/* Year */}
            <div className='space-y-2'>
              <Label htmlFor='mr-year'>Year</Label>
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
              <Label htmlFor='mr-month'>Month</Label>
              <Select
                id='mr-month'
                value={billingMonth}
                onChange={(e) => setBillingMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className='mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/50'>
        <Info className='size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5' />
        <div className='text-sm text-blue-800 dark:text-blue-200'>
          <p className='font-medium'>Billing Period: {formatBillingPeriod(billingYear, billingMonth)}</p>
          <p className='mt-1 text-blue-700 dark:text-blue-300'>
            Enter current meter readings below. Previous readings are auto-filled from last month.
            Consumption = Current − Previous.
          </p>
        </div>
      </div>

      {/* Empty States */}
      {noMeteredServices && selectedBuildingId && (
        <Card>
          <CardContent className='py-12 text-center'>
            <Gauge className='size-12 text-muted-foreground mx-auto mb-4' />
            <h3 className='font-semibold'>No Metered Services</h3>
            <p className='text-sm text-muted-foreground mt-1'>
              This building has no metered services (e.g., electricity, water).
              Add metered services to the building first.
            </p>
          </CardContent>
        </Card>
      )}

      {!noMeteredServices && noOccupiedRooms && selectedBuildingId && (
        <Card>
          <CardContent className='py-12 text-center'>
            <CalendarDays className='size-12 text-muted-foreground mx-auto mb-4' />
            <h3 className='font-semibold'>No Occupied Rooms</h3>
            <p className='text-sm text-muted-foreground mt-1'>
              This building has no rooms with active tenants.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Matrix Grid */}
      {!noMeteredServices && !noOccupiedRooms && (
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
                Reading Entry ({rooms.length} rooms × {meteredServices.length} services)
              </CardTitle>
              <CardDescription>
                Enter the current meter value for each room and service.
              </CardDescription>
            </CardHeader>
            <CardContent className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b'>
                    <th className='text-left font-medium py-2 px-3 min-w-28'>Room</th>
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
                        <div className='text-xs text-muted-foreground'>Floor {room.floor}</div>
                      </td>
                      {meteredServices.map((service) => {
                        const prevVal = getPreviousValue(room.id, service.id)
                        const currVal = getCurrentValue(room.id, service.id)
                        const consumption = currVal - prevVal

                        return (
                          <td key={service.id} className='py-3 px-3'>
                            <div className='space-y-1'>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs text-muted-foreground w-12'>Prev:</span>
                                <span className='text-xs'>{prevVal.toLocaleString()}</span>
                              </div>
                              <Input
                                type='number'
                                min={0}
                                step={1}
                                value={currVal}
                                onChange={(e) => handleReadingChange(room.id, service.id, e.target.value)}
                                className='w-28 h-8 text-sm'
                                aria-label={`Current reading for ${room.roomNumber} ${service.name}`}
                              />
                              <div className='flex items-center gap-2'>
                                <span className='text-xs text-muted-foreground w-12'>Used:</span>
                                <span className={`text-xs font-medium ${consumption < 0 ? 'text-destructive' : ''}`}>
                                  {consumption.toLocaleString()} {service.unit}
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
  )
}
