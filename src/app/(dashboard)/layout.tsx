import { AuthGuard } from '@/components/layouts/AuthGuard'
import { AppShell } from '@/components/layouts/AppShell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
