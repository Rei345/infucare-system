"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Play,
  Square,
  Pause,
  Lock,
  WifiOff,
  Settings2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast"; // 1. IMPORT HOOK TOAST
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: number;
  timestamp: string;
  patient_name: string;
  event_type: string;
  description: string;
  severity: string;
}

export default function HistoryPage() {
  const { toast } = useToast(); // 2. INISIALISASI TOAST
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Ambil Data dari API
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("infucare_token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/history`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        setLogs(json.data || []);
      } catch (error) {
        console.error("Gagal mengambil riwayat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Filter Data
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = eventTypeFilter === "all" || log.event_type === eventTypeFilter;
    return matchesSearch && matchesType;
  });

  // UI Helpers
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "SESSION_START": return <Play className="h-4 w-4 text-emerald-500" />;
      case "BOTTLE_CHANGE": return <RefreshCw className="h-4 w-4 text-primary" />;
      case "BLOOD_DETECTED": 
      case "ALERT_BLOOD": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "SYSTEM_FAILSAFE": return <Lock className="h-4 w-4 text-destructive" />;
      case "FLOW_PAUSE": return <Pause className="h-4 w-4 text-amber-500" />;
      case "DEVICE_OFFLINE": return <WifiOff className="h-4 w-4 text-muted-foreground" />;
      default: return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case "SESSION_START": return "Sesi Dimulai";
      case "BOTTLE_CHANGE": return "Botol Diganti";
      case "BLOOD_DETECTED": 
      case "ALERT_BLOOD": return "Darah Terdeteksi";
      case "SYSTEM_FAILSAFE": return "Kunci Otomatis (Failsafe)";
      case "FLOW_PAUSE": return "Aliran Dijeda / Mampet";
      case "DEVICE_OFFLINE": return "Alat Terputus";
      case "SESSION_END": return "Sesi Diakhiri";
      case "TARGET_TPM_CHANGED": return "Perubahan Target TPM";
      default: return eventType;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-destructive bg-destructive/10 border-destructive/20";
      case "warning": return "text-amber-600 bg-amber-500/10 border-amber-500/20";
      case "success": return "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";
      default: return "text-primary bg-primary/10 border-primary/20";
    }
  };

  // ==========================================
  // PERBAIKAN UX LOGIKA EKSPOR (MENGGUNAKAN TOAST)
  // ==========================================
  const handleExport = (format: "pdf" | "excel") => {
    if (filteredLogs.length === 0) {
      // Ganti alert kaku dengan toast warning merah
      toast({
        title: "Ekspor Gagal",
        description: "Tidak ada data aktivitas di dalam tabel untuk diekspor.",
        variant: "destructive",
      });
      return;
    }

    if (format === "excel") {
      const headers = ["Waktu Kejadian", "Nama Pasien", "Jenis Kejadian", "Tingkat Keparahan", "Deskripsi"];
      const rows = filteredLogs.map((log) => [
        `"${log.timestamp}"`,
        `"${log.patient_name}"`,
        `"${getEventLabel(log.event_type)}"`,
        `"${log.severity.toUpperCase()}"`,
        `"${log.description}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `Rekap_Riwayat_InfuCare_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Tambahkan umpan balik sukses setelah download terpicu
      toast({
        title: "Ekspor Berhasil",
        description: "Berkas laporan spreadsheet (.csv) berhasil diunduh.",
      });
    } 
    else if (format === "pdf") {
      window.print();
    }
  };

  const eventTypes = [
    { value: "all", label: "Semua Kejadian" },
    { value: "SESSION_START", label: "Sesi Dimulai" },
    { value: "BOTTLE_CHANGE", label: "Botol Diganti" },
    { value: "ALERT_BLOOD", label: "Darah Terdeteksi" },
    { value: "SYSTEM_FAILSAFE", label: "Kunci Otomatis (Failsafe)" },
    { value: "FLOW_PAUSE", label: "Aliran Dijeda" },
    { value: "DEVICE_OFFLINE", label: "Alat Terputus" },
    { value: "TARGET_TPM_CHANGED", label: "Ubah Target TPM" },
    { value: "SESSION_END", label: "Sesi Selesai" },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-20 text-muted-foreground">Memuat riwayat log sistem...</div>;
  }

  return (
    <div className="space-y-6 p-6 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Kejadian</h1>
          <p className="text-muted-foreground">Lihat dan ekspor log kejadian (*Audit Trail*) sistem</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="shadow-sm">
              <Download className="mr-2 h-4 w-4" /> Ekspor Data
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4 text-destructive" /> Cetak / Ekspor PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("excel")} className="cursor-pointer">
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Ekspor ke Excel (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header Khusus Print */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold border-b pb-2">Laporan Riwayat Pemantauan Infus</h1>
        <p className="text-sm mt-2 text-gray-500">Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4 print:hidden">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Kejadian</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kritis / Bahaya</p>
                <p className="text-2xl font-bold text-destructive">
                  {logs.filter((l) => l.severity === "critical").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Peringatan</p>
                <p className="text-2xl font-bold text-amber-600">
                  {logs.filter((l) => l.severity === "warning").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Info Normal</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {logs.filter((l) => l.severity === "info" || l.severity === "success").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center print:hidden bg-muted/30 p-2 rounded-lg border border-border/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama pasien atau deskripsi kejadian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border/50 shadow-sm"
          />
        </div>

        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-full sm:w-[220px] bg-background border-border/50 shadow-sm">
            <SelectValue placeholder="Saring jenis kejadian" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table Card */}
      <Card className="print:border-0 print:shadow-none overflow-hidden border-border/60">
        <CardHeader className="bg-muted/20 border-b border-border/40 py-4 print:hidden">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Daftar Kejadian ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 print:p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30 hover:bg-muted/30">
                <TableRow>
                  <TableHead className="w-[180px] font-semibold">Waktu / Tanggal</TableHead>
                  <TableHead className="font-semibold">Nama Pasien</TableHead>
                  <TableHead className="w-[200px] font-semibold">Jenis Kejadian</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">Deskripsi Aktivitas</TableHead>
                  <TableHead className="w-[140px] text-center font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.02 * Math.min(index, 15) }}
                      className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {log.timestamp}
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        {log.patient_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-md bg-background border shadow-sm print:hidden">
                            {getEventIcon(log.event_type)}
                          </div>
                          <span className="font-medium text-sm whitespace-nowrap">
                            {getEventLabel(log.event_type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] text-sm text-muted-foreground md:whitespace-normal">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("capitalize px-2.5 py-0.5 font-semibold shadow-sm", getSeverityColor(log.severity))}>
                          {log.severity === "critical" ? "Kritis" : log.severity === "warning" ? "Peringatan" : log.severity === "success" ? "Sukses" : "Info"}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center print:hidden bg-muted/10">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Tidak ada kejadian ditemukan</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Coba gunakan kata kunci lain atau ubah filter dropdown untuk menemukan log yang Anda cari.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}