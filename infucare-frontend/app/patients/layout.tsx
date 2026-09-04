import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function PatientsLayout({
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