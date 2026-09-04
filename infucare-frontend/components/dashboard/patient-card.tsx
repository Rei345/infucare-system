"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Droplet, AlertTriangle, Lock, Clock, Activity, ChevronRight,
  Droplets, RefreshCw, Power, CheckCircle2, Plus, Minus, Settings2
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast" // TAMBAHKAN HOOK TOAST SHADCN

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

export interface ActiveSessionData {
  session_id: number
  patient_id: number
  patient_name: string
  registration_no: string
  device_sn: string
  fluid_id: number
  fluid_name: string
  target_tpm: number
  current_tpm: number
  fluid_level_pct: number
  blood_raw_value: number // BARU: Tambahkan properti sensor warna darah
  status: string 
  estimated_end_at?: string 
}

interface PatientCardProps {
  session: ActiveSessionData
  onSessionEnd: (sessionId: number) => void 
}

export function PatientCard({ session, onSessionEnd }: PatientCardProps) {
  const { toast } = useToast() // Inisialisasi Toast

  // Pengecekan Darurat Bertingkat
  const isBloodEmergency = session.blood_raw_value >= 515 // Batas deteksi darah dari sensor TCS3200 Anda
  const isCritical = session.status === "CRITICAL" || isBloodEmergency
  const isWarning = session.status === "WARNING" && !isCritical
  const isEmergency = isCritical 
  
  const [targetTpm, setTargetTpm] = useState(session.target_tpm)
  const [isUpdatingTpm, setIsUpdatingTpm] = useState(false)

  // ================= STATE UNTUK SEMUA MODAL =================
  const [isTpmModalOpen, setIsTpmModalOpen] = useState(false)
  const [tempTpm, setTempTpm] = useState(session.target_tpm)

  const [isTareModalOpen, setIsTareModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState(false)
  // ===========================================================
  
  const flowActive = !isEmergency && session.fluid_level_pct > 5

  // (Efek Suara Tetap Sama)
  useEffect(() => {
    if (isCritical) {
      const playAlertSound = () => {
        try {
          const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          oscillator.frequency.value = 880
          oscillator.type = 'sine'
          gainNode.gain.value = 0.1
          oscillator.start()
          setTimeout(() => { oscillator.stop(); audioContext.close() }, 200)
        } catch {}
      }
      playAlertSound()
    }
  }, [isCritical])

  // =========================================================
  // PERBAIKAN UX: GANTI ALERT DENGAN TOAST
  // =========================================================

  const handleResetServo = async () => {
    try {
      const token = localStorage.getItem("infucare_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/control/device/${session.device_sn}/unlock`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (response.ok) {
        setIsResetModalOpen(false) 
        toast({
          title: "Berhasil Membuka Aliran",
          description: `Perintah Buka Servo telah dikirim ke perangkat ${session.device_sn}. Sensor darah akan memasuki masa pembilasan.`,
          variant: "default", // Hijau/Tema Default
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Gagal Mengirim Perintah",
          description: errorData.error || "Terjadi kesalahan pada server.",
          variant: "destructive", // Merah/Error
        })
      }
    } catch (error) { 
      toast({ title: "Kesalahan Jaringan", description: "Tidak dapat terhubung ke server.", variant: "destructive" })
    }
  }

  const handleSaveTpm = async () => {
    setTargetTpm(tempTpm) 
    setIsUpdatingTpm(true)
    setIsTpmModalOpen(false) 
    
    try {
      const token = localStorage.getItem("infucare_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/${session.session_id}/tpm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ target_tpm: tempTpm })
      })

      if(response.ok) {
        toast({ title: "Laju TPM Diperbarui", description: `Target baru disetel ke ${tempTpm} TPM.` })
      } else {
        toast({ title: "Gagal Menyimpan", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Kesalahan Jaringan", variant: "destructive" })
    } finally {
      setIsUpdatingTpm(false)
    }
  }

  const openTpmModal = () => {
    setTempTpm(targetTpm)
    setIsTpmModalOpen(true)
  }

  const handleTare = async () => {
    try {
      const token = localStorage.getItem("infucare_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/${session.session_id}/tare`, {
        method: "PUT", headers: { "Authorization": `Bearer ${token}` }
      })
      if (response.ok) {
        setIsTareModalOpen(false) 
        toast({
          title: "Kalibrasi Berhasil",
          description: "Perintah Tare Botol Baru sedang diproses oleh alat.",
        })
      } else {
        const err = await response.json()
        toast({ title: "Gagal Kalibrasi", description: err.error, variant: "destructive" })
      }
    } catch (error) { 
        toast({ title: "Kesalahan Jaringan", variant: "destructive" })
    }
  }

  const handleEndSession = async () => {
    try {
      const token = localStorage.getItem("infucare_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/${session.session_id}/end`, {
        method: "PUT", headers: { "Authorization": `Bearer ${token}` }
      })
      if (response.ok) {
        setIsEndSessionModalOpen(false) 
        toast({
          title: "Sesi Diakhiri",
          description: "Jepitan selang telah dibuka. Sesi dipindahkan ke Riwayat.",
        })
        onSessionEnd(session.session_id)
      } else {
        const err = await response.json()
        toast({ title: "Gagal Mengakhiri Sesi", description: err.error, variant: "destructive" })
      }
    } catch (error) { 
        toast({ title: "Kesalahan Jaringan", variant: "destructive" })
    }
  }

  // =======================================================================
  // WARNA DAN DESAIN BANNER (Ditambahkan Logika Darah)
  // =======================================================================
  const getStatusColor = () => {
    if (isCritical) return 'border-destructive bg-destructive/5'
    if (isWarning) return 'border-warning bg-warning/5'
    return 'border-emerald-500/50 bg-emerald-500/5'
  }

  const getProgressColor = () => {
    if (isBloodEmergency) return 'bg-destructive' // Merah jika berdarah
    if (session.fluid_level_pct <= 15) return 'bg-destructive'
    if (session.fluid_level_pct <= 30) return 'bg-warning'
    return 'bg-emerald-500'
  }

  const getProgressBgColor = () => {
    if (isBloodEmergency) return 'bg-destructive/20'
    if (session.fluid_level_pct <= 15) return 'bg-destructive/20'
    if (session.fluid_level_pct <= 30) return 'bg-warning/20'
    return 'bg-emerald-500/20'
  }

  const getProgressTextColor = () => {
    if (isBloodEmergency) return 'text-destructive'
    if (session.fluid_level_pct <= 15) return 'text-destructive'
    if (session.fluid_level_pct <= 30) return 'text-warning'
    return 'text-emerald-500'
  }

  const getBannerConfig = () => {
    // 1. PRIORITAS TERTINGGI: DARAH
    if (isBloodEmergency) {
        return { bg: "bg-destructive", text: "DARURAT: DARAH NAIK", textClass: "text-destructive-foreground", icon: AlertTriangle }
    }
    // 2. PRIORITAS KEDUA: INFUS HABIS
    if (session.fluid_level_pct <= 5) {
      return { bg: "bg-destructive", text: "DARURAT: INFUS HABIS", textClass: "text-destructive-foreground", icon: AlertTriangle }
    }
    // 3. PRIORITAS KETIGA: HAMPIR HABIS
    if (isWarning) {
      return { bg: "bg-warning", text: "PERINGATAN: HAMPIR HABIS", textClass: "text-warning-foreground", icon: AlertTriangle }
    }
    // 4. NORMAL
    return { bg: "bg-emerald-500", text: "STATUS NORMAL", textClass: "text-primary-foreground", icon: CheckCircle2 }
  }

  const banner = getBannerConfig()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-300 flex flex-col h-full",
          getStatusColor(),
          isCritical && "animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]",
          isWarning && "shadow-[0_0_10px_rgba(245,158,11,0.3)]"
        )}
      >
        {/* Banner Dinamis */}
        <motion.div layout className={cn("px-3 py-1.5 transition-colors duration-300 shrink-0", banner.bg)}>
          <div className={cn("flex items-center justify-center gap-1.5", banner.textClass)}>
            <banner.icon className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-sm font-bold tracking-wider truncate">{banner.text}</span>
            {isEmergency && <Lock className="h-3 w-3 shrink-0 ml-1" />}
          </div>
        </motion.div>

        <CardHeader className="pb-2 pt-4 px-4 shrink-0">
          <div className="flex items-start gap-3 overflow-hidden">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-base sm:text-lg font-bold text-primary">
                {session.patient_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1"> 
              <h3 className="font-bold text-base sm:text-lg truncate" title={session.patient_name}>
                {session.patient_name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground font-medium mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{session.device_sn}</Badge>
                <span className="truncate">{session.registration_no}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-4 pb-4 flex-1 flex flex-col justify-between">
          
          <div className="space-y-1.5 mt-1 shrink-0">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5 truncate pr-2">
                <Droplets className="h-3.5 w-3.5 shrink-0" /> 
                <span className="truncate">Cairan ({session.fluid_name})</span>
              </span>
              <span className={cn("font-bold text-sm sm:text-base shrink-0", getProgressTextColor())}>
                {Math.round(session.fluid_level_pct)}%
              </span>
            </div>
            
            <div className="relative">
              <div className={cn("h-2.5 sm:h-3 w-full rounded-full", getProgressBgColor())}>
                <motion.div
                  className={cn("h-full rounded-full", getProgressColor())}
                  initial={{ width: 0 }}
                  animate={{ width: `${session.fluid_level_pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              
              {/* Animasi Tetesan Air di atas Bar */}
              {flowActive && session.current_tpm > 0 && (
                <div className="absolute -right-1 -top-5 overflow-hidden h-5">
                  <motion.div
                    className="flex flex-col items-center"
                    style={{ animationDuration: `${Math.max(0.5, 60 / session.current_tpm)}s` }}
                  >
                    <Droplet className={cn("h-2.5 w-2.5 animate-drip", getProgressTextColor())} />
                  </motion.div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 shrink-0">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-2 sm:p-3 overflow-hidden">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground font-medium">
                <Activity className="h-3 w-3 shrink-0" />
                <span className="truncate">Aktual</span>
              </div>
              <p className={cn(
                "mt-1 text-lg sm:text-xl font-bold tracking-tight truncate text-foreground"
              )}>
                {session.current_tpm} <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground">TPM</span>
              </p>
            </div>
            
            <div className="rounded-lg border border-border/50 bg-muted/30 p-2 sm:p-3 overflow-hidden">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground font-medium">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">Est. Habis</span>
              </div>
              <p className={cn(
                "mt-1 text-sm sm:text-base font-bold tracking-tight truncate",
                session.fluid_level_pct <= 15 ? "text-destructive" : "text-foreground"
              )} title={session.estimated_end_at || "Menghitung..."}>
                {session.estimated_end_at || "Menghitung..."}
              </p>
            </div>
          </div>

          {/* TPM Control Panel */}
          <div className={cn(
            "space-y-2.5 rounded-lg border p-2 sm:p-3 transition-colors shrink-0",
            isUpdatingTpm ? "border-primary/50 bg-primary/5" : "border-border/80 bg-muted/20"
          )}>
            <div className="flex items-center justify-between">
              <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Laju</label>
              <span className="font-bold text-primary text-sm sm:text-base">{targetTpm} TPM</span>
            </div>
            
            {/* Modal TPM */}
            <Dialog open={isTpmModalOpen} onOpenChange={setIsTpmModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full h-8 text-xs font-semibold bg-background hover:bg-muted mt-1"
                  onClick={openTpmModal}
                >
                  <Settings2 className="mr-2 h-3.5 w-3.5" /> Ubah Target Laju
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Atur Kecepatan Infus</DialogTitle>
                  <DialogDescription>
                    Tentukan target Tetes Per Menit (TPM) yang baru untuk perangkat ini.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-8">
                  <div className="flex items-center justify-center gap-6">
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-2" onClick={() => setTempTpm(Math.max(1, tempTpm - 1))}>
                      <Minus className="h-5 w-5" />
                    </Button>
                    <div className="text-center w-24">
                      <span className="text-5xl font-black text-primary">{tempTpm}</span>
                      <span className="block text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">TPM</span>
                    </div>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-2" onClick={() => setTempTpm(Math.min(100, tempTpm + 1))}>
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant={tempTpm === 15 ? "default" : "outline"} onClick={() => setTempTpm(15)}>Lambat</Button>
                    <Button variant={tempTpm === 30 ? "default" : "outline"} onClick={() => setTempTpm(30)}>Sedang</Button>
                    <Button variant={tempTpm === 60 ? "default" : "outline"} onClick={() => setTempTpm(60)}>Cepat</Button>
                  </div>
                </div>
                <DialogFooter className="sm:justify-between">
                  <Button variant="ghost" onClick={() => setIsTpmModalOpen(false)}>Batal</Button>
                  <Button onClick={handleSaveTpm}>Simpan Pengaturan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Action Buttons dengan 3 Modal Masing-masing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-auto pt-2 shrink-0">
            
            {/* 1. MODAL TARE BOTOL */}
            <Dialog open={isTareModalOpen} onOpenChange={setIsTareModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full text-xs font-bold border-border/80 hover:bg-muted h-8">
                  <RefreshCw className="mr-2 h-3.5 w-3.5 shrink-0" /> Tare
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Konfirmasi Tare Botol</DialogTitle>
                  <DialogDescription>
                    Apakah Anda yakin ingin melakukan kalibrasi ulang (Tare) pada sensor berat botol infus? Ini biasanya dilakukan saat Anda mengganti botol infus yang baru.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 flex sm:justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsTareModalOpen(false)}>Batal</Button>
                  <Button onClick={handleTare}>Ya, Lakukan Tare</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* 2. MODAL RESET SERVO */}
            <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full text-xs font-bold border-primary/40 text-primary hover:bg-primary/5 h-8">
                  <RefreshCw className="mr-2 h-3.5 w-3.5 shrink-0 animate-spin-slow" /> Buka Klem
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Konfirmasi Pembukaan Servo</DialogTitle>
                  <DialogDescription>
                    Tindakan ini akan secara manual membuka klem servo dan meluruskan selang infus. Pastikan Anda telah memeriksa kondisi alat pasien secara fisik sebelum melanjutkan.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 flex sm:justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsResetModalOpen(false)}>Batal</Button>
                  <Button onClick={handleResetServo}>Ya, Buka Aliran</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* 3. MODAL AKHIRI SESI */}
            <Dialog open={isEndSessionModalOpen} onOpenChange={setIsEndSessionModalOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full text-xs font-bold shadow-sm h-8">
                  <Power className="mr-2 h-3.5 w-3.5 shrink-0" /> Akhiri
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-destructive">Akhiri Sesi Infus</DialogTitle>
                  <DialogDescription>
                    Apakah Anda yakin ingin mengakhiri sesi infus ini secara permanen? Klem aktuator akan otomatis terbuka dan perhitungan log riwayat akan dihentikan.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 flex sm:justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsEndSessionModalOpen(false)}>Batal</Button>
                  <Button variant="destructive" onClick={handleEndSession}>Ya, Akhiri Sesi</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
          </div>

          {/* Footer Link */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground font-medium pt-2 border-t border-border/40 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500" />
              </span>
              <span>Live Sync</span>
            </div>
            <Link href={`/patients/${session.patient_id}`} className="flex items-center gap-1 text-primary hover:underline truncate ml-2">
              <span className="truncate">Detail Medis</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
            </Link>
          </div>

        </CardContent>
      </Card>
    </motion.div>
  )
}