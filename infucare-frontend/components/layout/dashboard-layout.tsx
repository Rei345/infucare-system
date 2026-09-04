"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "./app-sidebar"
import { TopBar } from "./top-bar"
import { useIsMobile } from "@/hooks/use-mobile"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  
  // State untuk memastikan halaman tidak berkedip sebelum token dicek
  const [isAuthorized, setIsAuthorized] = useState(false)

  // 1. Pengecekan Keamanan (Route Guard)
  useEffect(() => {
    const token = localStorage.getItem("infucare_token")
    if (!token) {
      // Jika peretas langsung mengubah URL tanpa login, tendang ke luar
      router.push("/")
    } else {
      setIsAuthorized(true)
    }
  }, [router])

  // 2. Tutup sidebar mobile saat resize
  useEffect(() => {
    if (!isMobile) {
      setIsMobileSidebarOpen(false)
    }
  }, [isMobile])

  // Jika belum tervalidasi, tampilkan layar kosong / loading
  if (!isAuthorized) {
    return null 
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AppSidebar
        isOpen={isMobile ? isMobileSidebarOpen : isSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          isSidebarOpen={isSidebarOpen}
          onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}