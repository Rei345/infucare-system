"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Droplets,
  Activity,
  Cpu,
  Calendar,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Pause,
  FileText,
  Lock,
  WifiOff,
  Settings2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function PatientTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrackingData = async () => {
      try {
        const token = localStorage.getItem("infucare_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${id}/tracking`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await res.json();
        setData(result);
      } catch (error) {
        console.error("Gagal mengambil data tracking:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrackingData();
    // Polling setiap 5 detik agar timeline dan durasi jalan terus
    const intervalId = setInterval(fetchTrackingData, 5000);
    return () => clearInterval(intervalId);
  }, [id]);

  if (isLoading) {
    return <div className="flex justify-center py-20 text-muted-foreground">Memuat data rekam medis...</div>;
  }

  if (!data || !data.patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold">Pasien tidak ditemukan</h2>
        <Link href="/patients">
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Pasien
          </Button>
        </Link>
      </div>
    );
  }

  const { patient, current_session: currentSession, history } = data;

  // ==========================================
  // SINKRONISASI 8 KEJADIAN (EVENT TYPES)
  // ==========================================
  const getEventIcon = (type: string) => {
    switch (type) {
      case "SESSION_START": return <Play className="h-4 w-4 text-emerald-500" />;
      case "BOTTLE_CHANGE": return <RefreshCw className="h-4 w-4 text-primary" />;
      case "BLOOD_DETECTED": 
      case "ALERT_BLOOD": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "SYSTEM_FAILSAFE": return <Lock className="h-4 w-4 text-destructive" />;
      case "FLOW_PAUSE": return <Pause className="h-4 w-4 text-amber-500" />;
      case "FLOW_RESUME": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "DEVICE_OFFLINE": return <WifiOff className="h-4 w-4 text-amber-500" />;
      case "TARGET_TPM_CHANGED": return <Settings2 className="h-4 w-4 text-primary" />;
      case "SESSION_END": return <Square className="h-4 w-4 text-muted-foreground" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "SESSION_START": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Dimulai</Badge>;
      case "BOTTLE_CHANGE": return <Badge className="bg-primary/10 text-primary border-primary/20">Ganti Botol</Badge>;
      case "BLOOD_DETECTED":
      case "ALERT_BLOOD": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Darah Terdeteksi</Badge>;
      case "SYSTEM_FAILSAFE": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Failsafe</Badge>;
      case "FLOW_PAUSE": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Dijeda / Mampet</Badge>;
      case "FLOW_RESUME": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Dilanjutkan</Badge>;
      case "DEVICE_OFFLINE": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Terputus</Badge>;
      case "TARGET_TPM_CHANGED": return <Badge className="bg-primary/10 text-primary border-primary/20">Target TPM</Badge>;
      case "SESSION_END": return <Badge variant="secondary">Selesai</Badge>;
      default: return <Badge variant="outline">Aktivitas</Badge>;
    }
  };

  const getTimelineBorderColor = (type: string) => {
    switch (type) {
      case "BLOOD_DETECTED":
      case "ALERT_BLOOD":
      case "SYSTEM_FAILSAFE": return "border-destructive";
      case "FLOW_PAUSE":
      case "DEVICE_OFFLINE": return "border-amber-500";
      case "SESSION_START":
      case "FLOW_RESUME": return "border-emerald-500";
      default: return "border-primary";
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{patient.name}</h1>
            <p className="text-muted-foreground mt-1">NIK: {patient.registration_no}</p>
          </div>
        </div>
        <Badge
          variant={patient.status === "CRITICAL" ? "destructive" : "secondary"}
          className={cn(patient.status === "WARNING" && "border border-amber-500/50 text-amber-600 bg-amber-500/10", "px-3 py-1 text-sm")}
        >
          {patient.status === "CRITICAL" ? "KRITIS" : patient.status === "WARNING" ? "PERINGATAN" : "NORMAL"}
        </Badge>
      </div>

      {/* Current Session Stats */}
      {currentSession && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durasi Sesi</p>
                  <p className="text-xl font-bold">{currentSession.duration}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Droplets className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Infus (Est.)</p>
                  <p className="text-2xl font-bold">{currentSession.total_ml} ml</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <RefreshCw className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Botol Digunakan</p>
                  <p className="text-2xl font-bold">{currentSession.bottles_used}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Cpu className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Perangkat</p>
                  <p className="text-lg font-bold">{currentSession.device_sn}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Tabs for Current and History */}
      <Tabs defaultValue={currentSession ? "current" : "history"} className="space-y-4">
        <TabsList>
          {currentSession && (
            <TabsTrigger value="current">
              <Activity className="mr-2 h-4 w-4" />
              Sesi Saat Ini
            </TabsTrigger>
          )}
          <TabsTrigger value="history">
            <FileText className="mr-2 h-4 w-4" />
            Riwayat Sesi ({history?.length || 0})
          </TabsTrigger>
        </TabsList>

        {currentSession && (
          <TabsContent value="current" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Lini Masa Kejadian (Live)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Garis vertikal Timeline */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                  <div className="space-y-6">
                    {/* Status Terkini (Paling Atas) */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative flex gap-4 pl-10"
                    >
                      <div className="absolute left-2 top-1 flex h-5 w-5 items-center justify-center">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                        </span>
                      </div>

                      <div className="flex-1 rounded-lg border border-primary/50 bg-primary/5 p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/10 text-primary border-primary/20">Sekarang</Badge>
                          <span className="text-sm text-muted-foreground font-medium">Pemantauan aktif</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold">
                          {currentSession.is_paused ? "Aliran dijeda (Mampet / Alat Offline)" : "Aliran aktif"} - Sisa Cairan: {currentSession.fluid_pct}%
                        </p>
                      </div>
                    </motion.div>

                    {/* Daftar Log Aktivitas */}
                    {currentSession.events?.map((event: any, index: number) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="relative flex gap-4 pl-10"
                      >
                        <div
                          className={cn(
                            "absolute left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background",
                            getTimelineBorderColor(event.type)
                          )}
                        >
                          {getEventIcon(event.type)}
                        </div>

                        <div className="flex-1 rounded-lg border bg-card p-4 shadow-sm hover:bg-muted/30 transition-colors">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                              {getEventBadge(event.type)}
                              <span className="text-sm text-muted-foreground font-medium">
                                {event.time_only}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground hidden sm:block">
                              {event.timestamp}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-foreground/90">{event.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Sesi Pemantauan Sebelumnya
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((session: any, index: number) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="rounded-lg border p-4 bg-card hover:border-primary/30 hover:shadow-sm transition-all"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-primary">
                              Sesi NIK: {patient.registration_no} 
                              <span className="text-muted-foreground font-normal ml-1">
                                (Riwayat ke-{history.length - index})
                              </span>
                            </p>
                            <p className="text-sm text-muted-foreground font-medium mt-0.5">
                              {session.start_time.split(' ')[0]} {/* Menampilkan Tanggal Saja */}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{session.duration}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Droplets className="h-4 w-4 text-muted-foreground" />
                            <span>{session.total_ml} ml</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                            <span>{session.bottles_used} botol</span>
                          </div>
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Selesai
                          </Badge>
                        </div>
                      </div>

                      {/* ======================================================== */}
                      {/* PENAMBAHAN MINI TIMELINE (Dari Referensi Desain Anda) */}
                      {/* ======================================================== */}
                      <div className="mt-4 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                        <div className="bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded">
                          Mulai: {session.start_time.split(' ')[1]}
                        </div>
                        <div className="flex-1 h-px bg-border relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-[10px] text-muted-foreground/50 uppercase tracking-widest">
                            {session.duration}
                          </div>
                        </div>
                        <div className="bg-muted px-2 py-1 rounded">
                          Akhir: {session.end_time}
                        </div>
                      </div>
                      
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/30" />
                  <h3 className="mt-4 text-lg font-medium">Belum Ada Riwayat Sesi</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pasien ini baru pertama kali dipantau atau belum ada sesi yang selesai.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}