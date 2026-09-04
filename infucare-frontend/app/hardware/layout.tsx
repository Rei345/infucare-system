import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function HardwareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}
