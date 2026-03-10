'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Building2, DoorOpen, Settings, Users, Pencil, MapPin, CalendarDays, Layers,
} from 'lucide-react'
import { PageContainer } from '@/components/layouts/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { buildingKeys, fetchBuildingById } from '@/lib/queries/buildings'
import { formatDate } from '@/lib/utils'
import { BuildingFormDialog } from '../building-form-dialog'
import { BuildingRoomsTab } from './building-rooms-tab'
import { BuildingServicesTab } from './building-services-tab'
import { BuildingStaffTab } from './building-staff-tab'

export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)

  const { data: building, isLoading, error } = useQuery({
    queryKey: buildingKeys.detail(id),
    queryFn: () => fetchBuildingById(id),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <PageContainer>
        <div className='space-y-6'>
          <Skeleton className='h-8 w-64' />
          <div className='grid gap-4 sm:grid-cols-3'>
            <Skeleton className='h-24 rounded-xl' />
            <Skeleton className='h-24 rounded-xl' />
            <Skeleton className='h-24 rounded-xl' />
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error || !building) {
    return (
      <PageContainer>
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <Building2 className='size-12 text-muted-foreground mb-4' />
          <h2 className='text-lg font-semibold'>Building not found</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            This building may have been deleted or you don&apos;t have access.
          </p>
          <Button variant='outline' className='mt-4' onClick={() => router.push('/buildings')}>
            <ArrowLeft className='size-4' />
            Back to Buildings
          </Button>
        </div>
      </PageContainer>
    )
  }

  const occupancyPercent = Math.round(building.occupancyRate * 100)

  return (
    <PageContainer
      title={building.name}
      description={building.address}
      actions={
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => router.push('/buildings')}>
            <ArrowLeft className='size-4' />
            Back
          </Button>
          <Button variant='outline' onClick={() => setEditOpen(true)}>
            <Pencil className='size-4' />
            Edit
          </Button>
        </div>
      }
    >
      {/* Stats Overview */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-primary/10 p-2.5'>
              <DoorOpen className='size-5 text-primary' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Total Rooms</p>
              <p className='text-2xl font-bold'>{building.totalRooms}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-green-100 p-2.5 dark:bg-green-900/20'>
              <Layers className='size-5 text-green-600 dark:text-green-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Occupancy</p>
              <p className='text-2xl font-bold'>{occupancyPercent}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/20'>
              <Layers className='size-5 text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Floors</p>
              <p className='text-2xl font-bold'>{building.totalFloors}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-4 p-5'>
            <div className='rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/20'>
              <CalendarDays className='size-5 text-amber-600 dark:text-amber-400' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Invoice Due</p>
              <p className='text-2xl font-bold'>Day {building.invoiceDueDay}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Info */}
      {building.description && (
        <Card className='mb-6'>
          <CardContent className='p-5'>
            <p className='text-sm text-muted-foreground'>{building.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value='overview'>
            <DoorOpen className='size-4 mr-1.5' />
            Rooms
          </TabsTrigger>
          <TabsTrigger value='services'>
            <Settings className='size-4 mr-1.5' />
            Services
          </TabsTrigger>
          <TabsTrigger value='staff'>
            <Users className='size-4 mr-1.5' />
            Staff
          </TabsTrigger>
        </TabsList>

        <TabsContent value='overview'>
          <BuildingRoomsTab buildingId={id} totalFloors={building.totalFloors} />
        </TabsContent>

        <TabsContent value='services'>
          <BuildingServicesTab buildingId={id} />
        </TabsContent>

        <TabsContent value='staff'>
          <BuildingStaffTab buildingId={id} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <BuildingFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode='edit'
        building={building}
      />
    </PageContainer>
  )
}
