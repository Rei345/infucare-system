"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Cpu,
  Battery,
  Wifi,
  WifiOff,
  Thermometer,
  Timer,
  Volume2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Key,
  Hash,
  Tag,
  MoreVertical,
  Edit,
  Trash,
  AlertTriangle,
  Droplet
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast" // 1. IMPORT TOAST

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const getSignalStrength = (rssi: number) => {
  if (rssi >= -60) return { label: "Sangat Kuat", color: "text-emerald-500" }
  if (rssi >= -75) return { label: "Bagus", color: "text-emerald-500" }
  if (rssi >= -85) return { label: "Lemah", color: "text-warning" }
  return { label: "Sangat Lemah", color: "text-destructive" }
}

const getBatteryColor = (percent: number) => {
  if (percent > 60) return "text-emerald-500"
  if (percent > 20) return "text-warning"
  return "text-destructive"
}

interface ExtendedIoTDevice {
  id: string
  sn: string
  aliasName: string
  patientId: string | null
  patientName: string | null
  batteryVoltage: number
  batteryPercent: number
  rssi: number
  uptime: string
  internalTemp: number
  volume: number
  isOnline: boolean
  lastSeen: string
  autoLockBlood: boolean
  autoLockEmpty: boolean
}

export default function HardwarePage() {
  const { toast } = useToast() // 2. INISIALISASI TOAST
  const [devices, setDevices] = useState<ExtendedIoTDevice[]>([])
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // State untuk Konfirmasi Hapus Modal (Pengganti window.confirm)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null)

  const [newDevice, setNewDevice] = useState({
    serialNumber: "",
    secretKey: "",
    alias: ""
  })

  const onlineCount = devices.filter(d => d.isOnline).length
  const offlineCount = devices.filter(d => !d.isOnline).length

  // ==========================================
  // 1. GET: MENAMPILKAN DAFTAR ALAT AKTIF
  // ==========================================
  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem("infucare_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/devices`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (!response.ok) throw new Error("Gagal mengambil data")
      
      const result = await response.json()
      
      const mappedDevices = result.data.map((d: any) => ({
        id: d.SN,
        sn: d.SN,
        aliasName: d.AliasName || d.SN,
        patientId: d.current_patient_id || null,
        patientName: d.current_patient_name || null,
        batteryPercent: d.latest_telemetry?.battery_pct || 0,
        batteryVoltage: 3.7, 
        rssi: d.latest_telemetry?.signal_dbm || -100,
        uptime: d.latest_telemetry ? `${Math.floor(d.latest_telemetry.uptime_seconds / 60)} m` : "-",
        internalTemp: d.latest_telemetry?.internal_temp || 0,
        volume: d.DeviceSetting?.SpeakerVolume ?? 50,
        isOnline: d.Status === "ONLINE",
        lastSeen: d.last_seen || "Belum pernah aktif",
        autoLockBlood: d.DeviceSetting?.AutoStopBlood ?? true,
        autoLockEmpty: d.DeviceSetting?.AutoStopEmpty ?? true
      }))
      
      setDevices(mappedDevices)
    } catch (error) {
      console.error("Error fetch devices:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 5000)
    return () => clearInterval(interval)
  }, [])

  // ==========================================
  // 2. POST: AKTIVASI ALAT
  // ==========================================
  const handleAddDevice = async () => {
    if (!newDevice.serialNumber || !newDevice.secretKey) return
    
    try {
      const token = localStorage.getItem("infucare_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          sn: newDevice.serialNumber,
          secret_key: newDevice.secretKey,
          alias_name: newDevice.alias
        })
      })

      if (!response.ok) {
        const err = await response.json()
        toast({ title: "Gagal Aktivasi Perangkat", description: err.error, variant: "destructive" })
        return
      }

      toast({ title: "Perangkat Berhasil Diaktifkan", description: `Node ${newDevice.serialNumber} siap digunakan.` })
      fetchDevices()
      setNewDevice({ serialNumber: "", secretKey: "", alias: "" })
      setIsAddDeviceOpen(false)
    } catch (error) {
      toast({ title: "Kesalahan Jaringan", description: "Gagal terhubung ke server utama.", variant: "destructive" })
    }
  }

  // ==========================================
  // 3. PUT: UPDATE PENGATURAN PARAMETER ALAT
  // ==========================================
  const handleUpdateSettings = async (sn: string, updatedFields: Partial<ExtendedIoTDevice>) => {
    const currentDevice = devices.find(d => d.sn === sn)
    if (!currentDevice) return

    const payload = {
      alias_name: updatedFields.aliasName ?? currentDevice.aliasName,
      speaker_volume: updatedFields.volume ?? currentDevice.volume,
      auto_stop_blood: updatedFields.autoLockBlood ?? currentDevice.autoLockBlood,
      auto_stop_empty: updatedFields.autoLockEmpty ?? currentDevice.autoLockEmpty
    }

    try {
      const token = localStorage.getItem("infucare_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/devices/${sn}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error("Gagal memperbarui pengaturan")
      
      setDevices(prev => prev.map(d => d.sn === sn ? { ...d, ...updatedFields } : d))
      toast({ title: "Pengaturan Tersimpan", description: `Konfigurasi alat ${sn} berhasil disinkronkan.` })
    } catch (error) {
      toast({ title: "Gagal Sinkronisasi", description: "Perangkat mungkin sedang offline.", variant: "destructive" })
    }
  }

  // ==========================================
  // 4. DELETE: RESET / LEPAS IKATAN ALAT KEMBALI
  // ==========================================
  const confirmDeleteAction = (sn: string) => {
    setDeviceToDelete(sn)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return
    
    try {
      const token = localStorage.getItem("infucare_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/devices/${deviceToDelete}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })

      if (response.ok) {
        setDevices(prev => prev.filter(d => d.sn !== deviceToDelete))
        toast({ title: "Perangkat Dihapus", description: "Ikatan IoT Node berhasil dilepas dari ruangan." })
      } else {
        const err = await response.json()
        toast({ title: "Gagal Menghapus", description: err.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Kesalahan Jaringan", description: "Tidak dapat terhubung ke server.", variant: "destructive" })
    } finally {
      setIsDeleteModalOpen(false)
      setDeviceToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* 3. MODAL KONFIRMASI HAPUS (Pengganti Window.Confirm) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash className="h-5 w-5" /> Lepas Ikatan Perangkat
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus perangkat keras <b>{deviceToDelete}</b> dari unit Anda? Anda harus melakukan pairing ulang menggunakan Secret Key untuk menggunakannya kembali.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex sm:justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteDevice}>Ya, Hapus Permanen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Top Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kesehatan Perangkat Keras</h1>
          <p className="text-muted-foreground">Kelola dan pantau node IoT</p>
        </div>
        
        <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Perangkat
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Perangkat Baru</DialogTitle>
              <DialogDescription>
                Masukkan kredensial perangkat untuk memasangkan node IoT baru
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="serialNumber" className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  Nomor Seri
                </Label>
                <Input
                  id="serialNumber"
                  value={newDevice.serialNumber}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder="ESP32-INF-001"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="secretKey" className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  Kunci Pemasangan Rahasia
                </Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={newDevice.secretKey}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, secretKey: e.target.value }))}
                  placeholder="Masukkan kunci rahasia pabrik"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="alias" className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Alias Perangkat (Opsional)
                </Label>
                <Input
                  id="alias"
                  value={newDevice.alias}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, alias: e.target.value }))}
                  placeholder="mis., Node Kamar 1"
                />
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Batal</Button>
              </DialogClose>
              <Button 
                onClick={handleAddDevice}
                disabled={!newDevice.serialNumber || !newDevice.secretKey}
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Perangkat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ringkasan Status Total */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Perangkat</p>
                <p className="text-2xl font-bold">{devices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-2xl font-bold text-emerald-500">{onlineCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold text-destructive">{offlineCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid Render Kartu Perangkat */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
           <div className="col-span-full py-10 text-center text-muted-foreground">Memuat infrastruktur alat...</div>
        ) : devices.length === 0 ? (
           <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl text-muted-foreground">
             Belum ada perangkat keras terdaftar untuk unit Anda. Silakan klik tombol tambah di atas.
           </div>
        ) : devices.map((device, index) => {
          const signalStrength = getSignalStrength(device.rssi)
          const batteryColor = getBatteryColor(device.batteryPercent)
          
          return (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <Card className={cn(
                "transition-all border-2",
                device.isOnline ? "border-border" : "border-muted opacity-60"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        device.isOnline ? "bg-emerald-500/10" : "bg-muted"
                      )}>
                        <Cpu className={cn(
                          "h-5 w-5",
                          device.isOnline ? "text-emerald-500" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">{device.aliasName}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">
                          SN: {device.sn}
                        </p>
                        <p className="text-sm text-primary font-medium mt-0.5">
                          {device.patientName || "Belum dipasang pada pasien"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={device.isOnline ? "default" : "secondary"}>
                        {device.isOnline ? "Online" : "Offline"}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            const newAlias = prompt("Masukkan nama alias baru:", device.aliasName)
                            if(newAlias) handleUpdateSettings(device.sn, { aliasName: newAlias })
                          }}>
                            <Edit className="mr-2 h-4 w-4" /> Ubah Nama Alias
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                            onClick={() => confirmDeleteAction(device.sn)}
                          >
                            <Trash className="mr-2 h-4 w-4" /> Lepas Ikatan Alat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {device.isOnline ? (
                    <>
                      {/* Telemetry Real-time Matrix Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <Battery className={cn("h-3 w-3", batteryColor)} />
                            <span>Baterai</span>
                          </div>
                          <p className={cn("mt-1 text-base font-bold", batteryColor)}>
                            {device.batteryPercent}%
                          </p>
                        </div>

                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <Wifi className={cn("h-3 w-3", signalStrength.color)} />
                            <span>Kualitas Sinyal</span>
                          </div>
                          <p className={cn("mt-1 text-base font-bold", signalStrength.color)}>
                            {device.rssi} dBm
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {signalStrength.label}
                          </p>
                        </div>

                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <Thermometer className="h-3 w-3" />
                            <span>Suhu Int. Node</span>
                          </div>
                          <p className="mt-1 text-base font-bold">
                            {device.internalTemp}°C
                          </p>
                        </div>

                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <Timer className="h-3 w-3" />
                            <span>Waktu Aktif</span>
                          </div>
                          <p className="mt-1 text-sm font-bold tracking-tight">
                            {device.uptime}
                          </p>
                        </div>
                      </div>

                      {/* Volume Slider Kontrol Akses */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase">
                            <Volume2 className="h-4 w-4" />
                            <span>Volume SPEAKER Node</span>
                          </div>
                          <span className="font-bold text-sm text-primary">{device.volume}%</span>
                        </div>
                        <Slider
                          value={[device.volume]}
                          onValueChange={(value) => setDevices(prev => prev.map(d => d.sn === device.sn ? { ...d, volume: value[0] } : d))}
                          onValueCommit={(value) => handleUpdateSettings(device.sn, { volume: value[0] })}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      {/* Konfigurasi Sakelar Penguncian Klem Otomatis */}
                      <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kunci Aktuator Otomatis</label>
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="text-xs font-medium">Refluks Darah Terdeteksi</span>
                          </div>
                          <Switch
                            checked={device.autoLockBlood}
                            onCheckedChange={(checked) => handleUpdateSettings(device.sn, { autoLockBlood: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <Droplet className="h-4 w-4 text-warning" />
                            <span className="text-xs font-medium">Volume Cairan Habis</span>
                          </div>
                          <Switch
                            checked={device.autoLockEmpty}
                            onCheckedChange={(checked) => handleUpdateSettings(device.sn, { autoLockEmpty: checked })}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-dashed">
                      <WifiOff className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-xs font-semibold text-muted-foreground">
                        Node Tidak Memancarkan Sinyal LoRa
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        Status: {device.lastSeen}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}