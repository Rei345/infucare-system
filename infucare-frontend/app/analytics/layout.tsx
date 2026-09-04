import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function AnalyticsLayout({
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