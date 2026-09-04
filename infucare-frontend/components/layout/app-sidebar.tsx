"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Activity,
  Users,
  Cpu,
  History,
  Settings,
  Droplets,
  X,
  ChevronLeft,
  LogOut
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AppSidebarProps {
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Pusat Pemantauan"
  },
  {
    title: "Analisis",
    href: "/analytics",
    icon: Activity,
    description: "Pemantauan Mendalam"
  },
  {
    title: "Pasien",
    href: "/patients",
    icon: Users,
    description: "Manajemen Pasien"
  },
  {
    title: "Perangkat Node",
    href: "/hardware",
    icon: Cpu,
    description: "Manajemen Perangkat"
  },
  {
    title: "Riwayat",
    href: "/history",
    icon: History,
    description: "Riwayat Peristiwa"
  },
  {
    title: "Pengaturan",
    href: "/settings",
    icon: Settings,
    description: "Konfigurasi"
  }
]

export function AppSidebar({ isOpen, onClose, isMobile }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    // 1. Hapus token keamanan dari memori browser
    localStorage.removeItem("infucare_token")
    localStorage.removeItem("infucare_user")
    
    // 2. Redirect ke halaman login
    router.push("/")
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo Section */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Droplets className="h-5 w-5 text-primary-foreground" />
            <motion.div
              className="absolute inset-0 rounded-xl bg-primary/20"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-sidebar-foreground">InfuCare</span>
            <span className="text-xs text-muted-foreground">Monitoring & Kontrol Infus</span>
          </div>
        </Link>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && onClose()}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-sidebar-accent/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span>{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="ml-auto h-2 w-2 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer - Clinic Info & Logout */}
      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-lg font-bold text-primary">P</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">POSKESDES</span>
            <span className="text-xs text-muted-foreground">Unit Desa Lumban Jaean</span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </div>
    </div>
  )

  // Mobile sidebar with overlay
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
        {/* Sidebar */}
        <motion.aside
          initial={{ x: "-100%" }}
          animate={{ x: isOpen ? 0 : "-100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed left-0 top-0 z-50 h-full w-72 glass-sidebar lg:hidden"
        >
          {sidebarContent}
        </motion.aside>
      </>
    )
  }

  // Desktop sidebar
  return (
    <motion.aside
      initial={{ width: isOpen ? 280 : 0 }}
      animate={{ width: isOpen ? 280 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden h-screen overflow-hidden glass-sidebar lg:block"
    >
      <motion.div
        initial={{ opacity: isOpen ? 1 : 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        className="w-[280px]"
      >
        {sidebarContent}
      </motion.div>
    </motion.aside>
  )
}

export function SidebarToggle({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="hidden lg:flex"
    >
      <motion.div
        animate={{ rotate: isOpen ? 0 : 180 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronLeft className="h-5 w-5" />
      </motion.div>
    </Button>
  )
}
