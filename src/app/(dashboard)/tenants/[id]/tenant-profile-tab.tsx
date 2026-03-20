'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Save, X, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
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
      toast.success('Đã cập nhật hồ sơ')
      queryClient.invalidateQueries({ queryKey: tenantProfileKeys.detail(userId) })
      setEditing(false)
    },
    onError: (error: Error) => toast.error('Cập nhật hồ sơ thất bại', error.message),
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
          <CardTitle className='text-base'>Hồ sơ CCCD</CardTitle>
          <CardDescription>
            Thông tin căn cước công dân.
          </CardDescription>
        </div>
        {!editing ? (
          <Button variant='outline' size='sm' onClick={() => setEditing(true)}>
            <Pencil className='size-3.5' />
            Sửa
          </Button>
        ) : (
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={handleCancel} disabled={updateMutation.isPending}>
              <X className='size-3.5' />
              Hủy
            </Button>
            <Button size='sm' onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className='size-3.5' />
              {updateMutation.isPending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!hasData && !editing ? (
          <div className='flex flex-col items-center py-10 text-center'>
            <CreditCard className='size-10 text-muted-foreground mb-3' />
            <p className='text-sm text-muted-foreground'>Chưa có thông tin CCCD.</p>
            <p className='text-xs text-muted-foreground mt-1'>
              Nhấn Sửa để nhập thông tin căn cước.
            </p>
          </div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2'>
            <ProfileField
              label='Số CCCD'
              value={form.idNumber}
              editing={editing}
              onChange={(v) => updateField('idNumber', v)}
              placeholder='Số 12 chữ số'
              maxLength={12}
            />
            <ProfileField
              label='Ngày sinh'
              value={form.dateOfBirth}
              editing={editing}
              onChange={(v) => updateField('dateOfBirth', v)}
              type='date'
            />
            <ProfileField
              label='Giới tính'
              value={form.gender}
              editing={editing}
              onChange={(v) => updateField('gender', v)}
              fieldType='select'
              selectOptions={[
                { value: 'Male', label: 'Nam' },
                { value: 'Female', label: 'Nữ' },
              ]}
              placeholder='Chọn giới tính'
            />
            <ProfileField
              label='Địa chỉ thường trú'
              value={form.permanentAddress}
              editing={editing}
              onChange={(v) => updateField('permanentAddress', v)}
              placeholder='Địa chỉ nguyên quán'
              className='sm:col-span-2'
            />
            <ProfileField
              label='Ngày cấp'
              value={form.issuedDate}
              editing={editing}
              onChange={(v) => updateField('issuedDate', v)}
              type='date'
            />
            <ProfileField
              label='Nơi cấp'
              value={form.issuedPlace}
              editing={editing}
              onChange={(v) => updateField('issuedPlace', v)}
              placeholder='Cơ quan cấp'
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
  fieldType = 'input',
  selectOptions,
  placeholder,
  maxLength,
  className,
}: {
  label: string
  value?: string
  editing: boolean
  onChange: (v: string) => void
  type?: string
  fieldType?: 'input' | 'select'
  selectOptions?: { value: string; label: string }[]
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
        fieldType === 'select' && selectOptions ? (
          <Select
            id={id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className='mt-1'
          >
            <option value=''>{placeholder || 'Chọn…'}</option>
            {selectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        ) : (
          <Input
            id={id}
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className='mt-1'
          />
        )
      ) : (
        <p className='mt-1 text-sm font-medium'>
          {value || <span className='text-muted-foreground'>—</span>}
        </p>
      )}
    </div>
  )
}
