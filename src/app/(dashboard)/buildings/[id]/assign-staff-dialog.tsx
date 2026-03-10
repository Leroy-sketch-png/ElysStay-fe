'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { staffKeys, fetchStaffList, assignStaff } from '@/lib/queries/staff'
import type { UserDto } from '@/types/api'

interface AssignStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  buildingId: string
  /** IDs of staff already assigned to this building (to exclude from pick list) */
  assignedStaffIds: string[]
}

export function AssignStaffDialog({
  open,
  onOpenChange,
  buildingId,
  assignedStaffIds,
}: AssignStaffDialogProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Fetch all staff users. The backend GET /users/staff doesn't support search param,
  // so we fetch a large page and filter client-side.
  const { data, isLoading } = useQuery({
    queryKey: staffKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => fetchStaffList({ page: 1, pageSize: 100 }),
    enabled: open,
  })

  const availableStaff = useMemo(() => {
    if (!data?.data) return []
    const assigned = new Set(assignedStaffIds)
    return data.data
      .filter((u) => !assigned.has(u.id))
      .filter((u) => {
        if (!search) return true
        const q = search.toLowerCase()
        return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      })
  }, [data, assignedStaffIds, search])

  const assignMutation = useMutation({
    mutationFn: (staffId: string) => assignStaff(buildingId, { staffId }),
    onSuccess: () => {
      toast.success('Staff assigned to building')
      queryClient.invalidateQueries({ queryKey: staffKeys.byBuilding(buildingId) })
      setSelectedId(null)
      setSearch('')
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to assign staff', error.message)
    },
  })

  const handleAssign = () => {
    if (selectedId) assignMutation.mutate(selectedId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='sm'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Assign Staff</DialogTitle>
          <DialogDescription>
            Select a staff member to assign to this building. Already assigned members are excluded.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className='space-y-3'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
            <Input
              placeholder='Search by name or email…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-9'
            />
          </div>

          <div className='max-h-[280px] overflow-y-auto rounded-md border'>
            {isLoading ? (
              <div className='p-4 text-center text-sm text-muted-foreground'>Loading staff…</div>
            ) : availableStaff.length === 0 ? (
              <div className='p-4 text-center text-sm text-muted-foreground'>
                {search ? 'No matching staff found.' : 'All staff are already assigned.'}
              </div>
            ) : (
              availableStaff.map((staff) => (
                <button
                  key={staff.id}
                  type='button'
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                    selectedId === staff.id ? 'bg-primary/10 ring-1 ring-primary/20' : ''
                  }`}
                  onClick={() => setSelectedId(selectedId === staff.id ? null : staff.id)}
                >
                  <div className='flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium'>
                    {staff.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='font-medium truncate'>{staff.fullName}</p>
                    <p className='text-xs text-muted-foreground truncate'>{staff.email}</p>
                  </div>
                  {staff.phone && (
                    <span className='text-xs text-muted-foreground shrink-0'>{staff.phone}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedId || assignMutation.isPending}
          >
            <UserPlus className='size-4' />
            {assignMutation.isPending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
