'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Save, X, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import {
  tenantProfileKeys,
  fetchTenantProfile,
  updateTenantProfile,
} from '@/lib/queries/tenant-profiles'
import type { TenantProfileDto, UpdateTenantProfileRequest } from '@/types/api'

interface TenantProfileTabProps {
  userId: string
}

export function TenantProfileTab({ userId }: TenantProfileTabProps) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateTenantProfileRequest>({})

  const { data: profile, isLoading } = useQuery({
    queryKey: tenantProfileKeys.detail(userId),
    queryFn: () => fetchTenantProfile(userId),
    enabled: !!userId,
  })

  useEffect(() => {
    if (profile) {
      setForm({
        idNumber: profile.idNumber ?? '',
        dateOfBirth: profile.dateOfBirth ?? '',
        gender: profile.gender ?? '',
        permanentAddress: profile.permanentAddress ?? '',
        issuedDate: profile.issuedDate ?? '',
        issuedPlace: profile.issuedPlace ?? '',
      })
    }
  }, [profile])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTenantProfileRequest) => updateTenantProfile(userId, data),
    onSuccess: () => {
      toast.success('Profile updated')
      queryClient.invalidateQueries({ queryKey: tenantProfileKeys.detail(userId) })
      setEditing(false)
    },
    onError: (error: Error) => toast.error('Failed to update profile', error.message),
  })

  const handleSave = () => {
    updateMutation.mutate({
      idNumber: form.idNumber || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      permanentAddress: form.permanentAddress || undefined,
      issuedDate: form.issuedDate || undefined,
      issuedPlace: form.issuedPlace || undefined,
    })
  }

  const handleCancel = () => {
    setEditing(false)
    if (profile) {
      setForm({
        idNumber: profile.idNumber ?? '',
        dateOfBirth: profile.dateOfBirth ?? '',
        gender: profile.gender ?? '',
        permanentAddress: profile.permanentAddress ?? '',
        issuedDate: profile.issuedDate ?? '',
        issuedPlace: profile.issuedPlace ?? '',
      })
    }
  }

  const updateField = (field: keyof UpdateTenantProfileRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='animate-pulse space-y-4'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className='h-10 bg-muted rounded' />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasData = profile && (
    profile.idNumber || profile.dateOfBirth || profile.gender ||
    profile.permanentAddress || profile.issuedDate || profile.issuedPlace
  )

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='text-base'>Citizen ID Profile (CCCD)</CardTitle>
          <CardDescription>
            Identity information from the citizen identification card.
          </CardDescription>
        </div>
        {!editing ? (
          <Button variant='outline' size='sm' onClick={() => setEditing(true)}>
            <Pencil className='size-3.5' />
            Edit
          </Button>
        ) : (
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={handleCancel} disabled={updateMutation.isPending}>
              <X className='size-3.5' />
              Cancel
            </Button>
            <Button size='sm' onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className='size-3.5' />
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!hasData && !editing ? (
          <div className='flex flex-col items-center py-10 text-center'>
            <CreditCard className='size-10 text-muted-foreground mb-3' />
            <p className='text-sm text-muted-foreground'>No ID information recorded yet.</p>
            <p className='text-xs text-muted-foreground mt-1'>
              Click Edit to enter the tenant&apos;s citizen ID details.
            </p>
          </div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2'>
            <ProfileField
              label='ID Number (CCCD)'
              value={form.idNumber}
              editing={editing}
              onChange={(v) => updateField('idNumber', v)}
              placeholder='12-digit number'
              maxLength={12}
            />
            <ProfileField
              label='Date of Birth'
              value={form.dateOfBirth}
              editing={editing}
              onChange={(v) => updateField('dateOfBirth', v)}
              type='date'
            />
            <ProfileField
              label='Gender'
              value={form.gender}
              editing={editing}
              onChange={(v) => updateField('gender', v)}
              placeholder='Male / Female'
            />
            <ProfileField
              label='Permanent Address'
              value={form.permanentAddress}
              editing={editing}
              onChange={(v) => updateField('permanentAddress', v)}
              placeholder='Hometown address'
              className='sm:col-span-2'
            />
            <ProfileField
              label='Issued Date'
              value={form.issuedDate}
              editing={editing}
              onChange={(v) => updateField('issuedDate', v)}
              type='date'
            />
            <ProfileField
              label='Issued Place'
              value={form.issuedPlace}
              editing={editing}
              onChange={(v) => updateField('issuedPlace', v)}
              placeholder='Issuing authority'
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Inline Field ───────────────────────────────────────

function ProfileField({
  label,
  value,
  editing,
  onChange,
  type = 'text',
  placeholder,
  maxLength,
  className,
}: {
  label: string
  value?: string
  editing: boolean
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  maxLength?: number
  className?: string
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={className}>
      <Label htmlFor={editing ? id : undefined} className='text-xs text-muted-foreground'>
        {label}
      </Label>
      {editing ? (
        <Input
          id={id}
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className='mt-1'
        />
      ) : (
        <p className='mt-1 text-sm font-medium'>
          {value || <span className='text-muted-foreground'>—</span>}
        </p>
      )}
    </div>
  )
}
