"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import {
  Bell,
  Menu,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  X,
  LogOut,
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { SidebarToggle } from "./app-sidebar"

interface TopBarProps {
  onMenuClick: () => void
  isSidebarOpen: boolean
  onSidebarToggle: () => void
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'critical' | 'warning' | 'info'
  time: string
  read: boolean
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Blood Detected - Bed 1',
    message: 'Siti Aminah: Blood reflux detected. Flow locked.',
    type: 'critical',
    time: '2 min ago',
    read: false
  },
  {
    id: '2',
    title: 'Low Fluid - Bed 5',
    message: 'Rina Pratiwi: Fluid level below 10%.',
    type: 'warning',
    time: '5 min ago',
    read: false
  },
  {
    id: '3',
    title: 'Device Paired',
    message: 'ESP32-003 connected to Ratna Wulandari.',
    type: 'info',
    time: '15 min ago',
    read: true
  }
]

export function TopBar({ onMenuClick, isSidebarOpen, onSidebarToggle }: TopBarProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [notifications, setNotifications] = useState(mockNotifications)
  const [isOnline] = useState(true)
  const activeNodes: number = 5 // const activeNodes = 5
  const totalNodes: number = 6 // const totalNodes = 6

  const handleLogout = () => {
    // 1. Hapus token keamanan dari memori browser
    localStorage.removeItem("infucare_token")
    localStorage.removeItem("infucare_user")
    
    // 2. Redirect ke halaman login
    router.push("/")
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const hasCritical = notifications.some(n => n.type === 'critical' && !n.read)

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const [userData, setUserData] = useState<{name: string, username: string} | null>(null)

  useEffect(() => {
    // Tarik data profil saat top-bar dirender
    const user = localStorage.getItem("infucare_user")
    if (user) {
      setUserData(JSON.parse(user))
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <SidebarToggle isOpen={isSidebarOpen} onClick={onSidebarToggle} />

        {/* Gateway Status */}
        <div className="hidden items-center gap-4 sm:flex">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-critical" />
            )}
            <span className="text-sm font-medium">
              Gateway: <span className={isOnline ? "text-success" : "text-critical"}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </span>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <div className="flex h-2 w-2 items-center justify-center">
              <span className={cn(
                "h-2 w-2 rounded-full",
                activeNodes === totalNodes ? "bg-success" : "bg-warning"
              )} />
            </div>
            <span className="text-sm font-medium">
              Perangkat Aktif: <span className={activeNodes === totalNodes ? "text-success" : "text-warning"}>
                {activeNodes}/{totalNodes}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Ubah tema</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <motion.div
                animate={hasCritical ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5, repeat: hasCritical ? Infinity : 0 }}
              >
                <Bell className={cn("h-5 w-5", hasCritical && "text-critical")} />
              </motion.div>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white",
                    hasCritical ? "bg-critical" : "bg-primary"
                  )}
                >
                  {unreadCount}
                </motion.span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-3">
              <h3 className="font-semibold">Notifikasi</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Tandai telah dibaca
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              <AnimatePresence>
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <DropdownMenuItem
                      className={cn(
                        "flex cursor-pointer flex-col items-start gap-1 p-3",
                        !notification.read && "bg-muted/50"
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex w-full items-start justify-between">
                        <div className="flex items-center gap-2">
                          {notification.type === 'critical' && (
                            <AlertTriangle className="h-4 w-4 text-critical" />
                          )}
                          {notification.type === 'warning' && (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                          {notification.type === 'info' && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                          <span className="font-medium">{notification.title}</span>
                        </div>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {notification.time}
                      </span>
                    </DropdownMenuItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu with Logout */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  BD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
              <div className="flex flex-col">
                {/* Gunakan nama dari database, atau 'Bidan Desa' jika gagal ditarik */}
                <span className="font-medium">{userData?.name || "Bidan Desa"}</span>
                <span className="text-xs text-muted-foreground">@{userData?.username || "bidan_desa"}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
