import { AuthGuard } from '@/components/layouts/AuthGuard'
import { RoleGuard } from '@/components/layouts/RoleGuard'
import { AppShell } from '@/components/layouts/AppShell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <RoleGuard>
        <AppShell>{children}</AppShell>
      </RoleGuard>
    </AuthGuard>
  )
}
