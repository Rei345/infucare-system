// app/settings/layout.tsx atau app/hardware/layout.tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout>{children}</DashboardLayout>
  )
}