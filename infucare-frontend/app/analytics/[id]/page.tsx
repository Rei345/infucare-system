"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Droplets,
  Clock,
  Thermometer,
  Wifi,
  Timer,
  Activity,
  Beaker,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PatientAnalyticsPage({ params }: PageProps) {
  const { id } = use(params);
  
  const [patientData, setPatientData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [deviceLatest, setDeviceLatest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetailData = async () => {
      try {
        const token = localStorage.getItem("infucare_token");
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // 1. Fetch Sesi Pasien
        const resActive = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/active`, { headers });
        const dataActive = await resActive.json();
        const session = dataActive.data?.find((s: any) => String(s.session_id) === id);
        if (session) setPatientData(session);

        // 2. Fetch Riwayat Telemetri (Grafik)
        const resHistory = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/session/${id}/history`, { headers });
        const dataHistory = await resHistory.json();

        if (dataHistory.data && dataHistory.data.length > 0) {
          const formattedCharts = dataHistory.data.map((item: any) => {
            const rawDate = item.created_at || item.CreatedAt;
            const dateObj = new Date(rawDate);
            const timeStr = isNaN(dateObj.getTime()) 
              ? "--:--" 
              : dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
            
            const rawWeight = item.weight_gram ?? item.WeightGram ?? 0;
            const beratBersih = Math.max(0, rawWeight - 15);
            const levelPct = Math.min(100, (beratBersih / 500) * 100);

            return {
              time: timeStr,
              level: Math.round(levelPct),
              rate: item.tpm ?? item.Tpm ?? 0,
            };
          });
          setChartData(formattedCharts);
          setDeviceLatest(dataHistory.data[dataHistory.data.length - 1]);
        }
      } catch (error) {
        console.error("Gagal mengambil data detail:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetailData();
    const intervalId = setInterval(fetchDetailData, 5000);
    return () => clearInterval(intervalId);
  }, [id]);

  const getSignalInfo = (dbm: number) => {
    if (dbm >= -60) return { label: "Sangat Baik", color: "text-emerald-500" };
    if (dbm >= -75) return { label: "Baik", color: "text-success" };
    if (dbm >= -85) return { label: "Cukup", color: "text-warning" };
    return { label: "Lemah", color: "text-destructive" };
  };

  if (isLoading) {
    return <div className="flex justify-center py-12">Memuat data analisis...</div>;
  }

  if (!patientData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Sesi Pasien tidak ditemukan atau sudah berakhir</h2>
        <Link href="/analytics">
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Analisis
          </Button>
        </Link>
      </div>
    );
  }

  const signal = getSignalInfo(deviceLatest?.signal_dbm || deviceLatest?.SignalDbm || -90);
  const sisaCairanMl = Math.round((patientData.fluid_level_pct / 100) * 500);

  // =========================================================================
  // PERBAIKAN STYLE: Membedakan warna chart agar unik dan menarik
  // =========================================================================
  const fluidColor = "oklch(0.55 0.2 250)"; // Warna Biru/Ungu Elegan (Indigo)
  const tpmColor = "#10b981";               // Emerald Green untuk Kecepatan TPM

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/analytics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{patientData.patient_name}</h1>
            <Badge
              variant={patientData.status === "CRITICAL" ? "destructive" : "secondary"}
              className={cn(patientData.status === "WARNING" && "border border-amber-500/50 text-amber-500 bg-amber-500/10")}
            >
              {patientData.status === "CRITICAL" ? "KRITIS" : patientData.status === "WARNING" ? "PERINGATAN" : "NORMAL"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            NIK: {patientData.registration_no} | Perangkat: {patientData.device_sn} | Cairan: {patientData.fluid_name}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sisa Cairan (ml)</CardTitle>
              <Droplets className="h-4 w-4 text-primary" style={{ color: fluidColor }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sisaCairanMl} ml</div>
              <Progress value={patientData.fluid_level_pct} className="mt-2" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Botol Digunakan</CardTitle>
              <Beaker className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patientData.total_botol || 0} Botol</div>
              <p className="text-xs text-muted-foreground mt-1">Selama sesi ini</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">TPM Saat Ini</CardTitle>
              <Activity className="h-4 w-4" style={{ color: tpmColor }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patientData.current_tpm} TPM</div>
              <p className="text-xs text-muted-foreground mt-1">Target: {patientData.target_tpm} TPM</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimasi Sisa Waktu</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", patientData.status === "CRITICAL" ? "text-destructive" : "")}>
                {patientData.estimated_end_at}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Berdasarkan kalkulasi Fuzzy</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CHART 1: FLUID LEVEL (Menggunakan warna Biru/Ungu Oklch) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" style={{ color: fluidColor }} />
                Riwayat Level Cairan (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="fluidGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={fluidColor} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={fluidColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      minTickGap={30} 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      className="text-muted-foreground" 
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={[0, 100]} 
                      className="text-muted-foreground" 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} 
                      itemStyle={{ color: fluidColor, fontWeight: "bold" }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      name="Level Cairan"
                      stroke={fluidColor} 
                      strokeWidth={3} 
                      fill="url(#fluidGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CHART 2: DRIP RATE TPM (Menggunakan warna Emerald) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" style={{ color: tpmColor }} />
                Konsistensi Tetesan (TPM)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      minTickGap={30} 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      className="text-muted-foreground" 
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={["auto", "auto"]} 
                      className="text-muted-foreground" 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} 
                      itemStyle={{ color: tpmColor, fontWeight: "bold" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      name="Aktual TPM"
                      stroke={tpmColor} 
                      strokeWidth={3} 
                      dot={false} 
                      activeDot={{ r: 6, fill: tpmColor, stroke: "var(--card)", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Device Information */}
      {deviceLatest && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle>Pemantauan Perangkat Darurat ({patientData.device_sn})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                  <Thermometer className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Suhu Internal</p>
                    <p className="text-lg font-semibold">{deviceLatest.internal_temp || deviceLatest.InternalTemp || 0}°C</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                  <Timer className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Waktu Aktif (Uptime)</p>
                    <p className="text-lg font-semibold">
                      {Math.floor((deviceLatest.uptime_seconds || deviceLatest.UptimeSeconds || 0) / 60)} Menit
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                  <Wifi className={cn("h-5 w-5", signal.color)} />
                  <div>
                    <p className="text-sm text-muted-foreground">Kekuatan Sinyal</p>
                    <p className="text-lg font-semibold">
                      {deviceLatest.signal_dbm || deviceLatest.SignalDbm || 0} dBm
                      <span className={cn("ml-2 text-sm", signal.color)}>
                        ({signal.label})
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pembaruan Terakhir</p>
                    <p className="text-lg font-semibold">
                      {isNaN(new Date(deviceLatest.created_at || deviceLatest.CreatedAt).getTime())
                        ? "Baru saja"
                        : new Date(deviceLatest.created_at || deviceLatest.CreatedAt).toLocaleTimeString("id-ID")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}