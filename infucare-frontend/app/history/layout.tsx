import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function HistoryLayout({
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
