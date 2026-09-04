"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SortAsc, RefreshCw, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Import komponen dan interface yang TEPAT dari PatientCard yang baru
import { PatientCard, ActiveSessionData } from "@/components/dashboard/patient-card";

export default function DashboardPage() {
  const router = useRouter();
  // Gunakan tipe data ActiveSessionData dari komponen kartu
  const [sessions, setSessions] = useState<ActiveSessionData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk menarik data dari Backend Golang
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("infucare_token");
      
      if (!token) {
        router.push("/");
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/active`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem("infucare_token");
        router.push("/");
        return;
      }

      if (!response.ok) throw new Error("Gagal mengambil data");

      const result = await response.json();
      
      // Karena API Golang sudah mencetak JSON yang bentuknya SAMA PERSIS 
      // dengan interface ActiveSessionData, kita tidak perlu melakukan mapping manual lagi!
      setSessions(result.data || []);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Polling data setiap 3 detik agar animasi dan nilai TPM real-time
    const intervalId = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(intervalId);
  }, []);

  // Fungsi untuk menghapus kartu dari layar saat tombol "Akhiri Sesi" diklik
  const handleSessionEnd = (sessionId: number) => {
    setSessions(prev => prev.filter(s => s.session_id !== sessionId));
  };

  // Filter dan Sorting Pasien
  const sortedSessions = useMemo(() => {
    const statusOrder: Record<string, number> = { "CRITICAL": 0, "WARNING": 1, "NORMAL": 2 };

    return [...sessions]
      .filter(
        (session) =>
          session.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.registration_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.device_sn.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [sessions, searchQuery]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const criticalCount = sessions.filter((s) => s.status === "CRITICAL").length;
  const warningCount = sessions.filter((s) => s.status === "WARNING").length;
  const normalCount = sessions.filter((s) => s.status === "NORMAL").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Monitoring</h1>
          <p className="text-muted-foreground">
            Pemantauan infus secara real-time untuk semua pasien
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-destructive">Kritis</span>
            <span className="text-2xl font-bold text-destructive">
              {criticalCount}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-warning/30 bg-warning/5 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-warning">Peringatan</span>
            <span className="text-2xl font-bold text-warning">
              {warningCount}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-600">Normal</span>
            <span className="text-2xl font-bold text-emerald-600">
              {normalCount}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari NIK, Nama Pasien, atau Serial Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon" className="shrink-0">
          <SortAsc className="h-4 w-4" />
        </Button>
      </div>

      {/* Patient Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Menghubungkan ke Gateway...</div>
      ) : (
        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {sortedSessions.map((session) => (
              <PatientCard
                key={session.session_id}
                session={session} // <--- Lemparan Prop yang TEPAT!
                onSessionEnd={handleSessionEnd}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty State */}
      {sortedSessions.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg mt-4 bg-muted/10">
          <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-bold">Tidak ada pasien aktif</h3>
          <p className="text-sm text-muted-foreground max-w-sm text-center mt-1">
            Mulai sesi infus baru melalui menu manajemen pasien untuk memantaunya di sini.
          </p>
        </div>
      )}
    </div>
  );
}