"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Droplets,
  TrendingUp,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState({
    total_pasien: 0,
    avg_tpm: 0,
    total_ml: 0,
    total_botol: 0,
  });
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    // Ambil token dari localStorage
    const token = localStorage.getItem("infucare_token");
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // 1. Ambil Data Summary
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/summary`, {
      headers: authHeaders,
    })
      .then((res) => res.json())
      .then((d) => setSummary(d || {}));

    // 2. Ambil Daftar Pasien Aktif
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/active`, {
      headers: authHeaders,
    })
      .then((res) => res.json())
      .then((d) => setPatients(d.data || []));
  }, []);

  // Helper terjemahan status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "CRITICAL": return "Kritis";
      case "WARNING": return "Peringatan";
      default: return "Normal";
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Gambaran Umum Analisis</h1>
        <p className="text-muted-foreground">
          Pilih pasien untuk melihat analisis infus secara rinci
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Pasien" 
          val={summary.total_pasien || 0} 
          sub="Terpantau saat ini" 
          icon={<Activity className="h-4 w-4 text-muted-foreground" />} 
          delay={0} 
        />
        <StatCard 
          title="Rata-rata Laju Tetesan" 
          val={`${summary.avg_tpm || 0} TPM`} 
          sub="Pada semua pasien" 
          icon={<Droplets className="h-4 w-4 text-muted-foreground" />} 
          delay={0.1} 
        />
        <StatCard 
          title="Total ML Hari Ini" 
          val={`${(summary.total_ml || 0).toLocaleString()} ml`} 
          sub="Infus gabungan" 
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} 
          delay={0.2} 
        />
        <StatCard 
          title="Total Botol" 
          val={summary.total_botol || 0} 
          sub="Digunakan hari ini" 
          icon={<Clock className="h-4 w-4 text-muted-foreground" />} 
          delay={0.3} 
        />
      </div>

      {/* Patient List */}
      <div className="space-y-3 mt-8">
        <h2 className="text-lg font-semibold">
          Pilih Pasien untuk Analisis Terperinci
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p, index) => (
            <motion.div
              key={p.session_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link href={`/analytics/${p.session_id}`}>
                <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md bg-card/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      
                      {/* Avatar */}
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full font-bold",
                          p.status === "CRITICAL"
                            ? "bg-destructive/10 text-destructive"
                            : p.status === "WARNING"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-emerald-500/10 text-emerald-600"
                        )}
                      >
                        {p.patient_name.charAt(0)}
                      </div>

                      {/* Info Pasien (NIK dan Badge Sejajar) */}
                      <div>
                        <h3 className="font-semibold">{p.patient_name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {p.registration_no}
                          </p>
                          <Badge
                            variant={p.status === "CRITICAL" ? "destructive" : "secondary"}
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 font-medium", // Membuat badge ramping
                              p.status === "WARNING" && "border border-amber-500/50 text-amber-500 bg-amber-500/10"
                            )}
                          >
                            {getStatusLabel(p.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Komponen Helper StatCard (dengan Framer Motion)
function StatCard({ title, val, sub, icon, delay }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{val}</div>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}