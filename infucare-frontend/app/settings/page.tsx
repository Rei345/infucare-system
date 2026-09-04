"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, TestTube, AlertTriangle, Phone, CheckCircle2,
  Volume2, VolumeX, BellOff, Activity, BatteryWarning, WifiOff, ShieldAlert, Info, Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast"; // 1. IMPORT HOOK TOAST
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { toast } = useToast(); 
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isLoading, setIsLoading] = useState(true);

  // State Pengaturan Sistem
  const [settings, setSettings] = useState({
    masterMuteWa: false,
    globalMuteHardware: false, 
    muteGatewayBuzzer: false,  
    globalVolume: 50,
    waNumber: "",
    emptyFluidPercentage: 15, 
    autoStopThresholdPct: 80, 
    alertBlood: true,
    alertEmpty: true,
    alert15Min: true,
    alertLowBattery: true,
    alertOffline: true,
    alertFailsafe: true,
  });

  // GET: Tarik Data Saat Halaman Dimuat
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("infucare_token");
        const timestamp = new Date().getTime();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings?t=${timestamp}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store", 
        });
        
        const json = await res.json();
        if (json.data) {
          setSettings(prev => ({ ...prev, ...json.data }));
        }
      } catch (error) {
        console.error("Gagal mengambil pengaturan:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // PUT: Fungsi Auto-Save
  const saveToServer = useCallback(async (dataToSave: typeof settings) => {
    setSaveStatus("saving");
    try {
      const token = localStorage.getItem("infucare_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSave),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan pengaturan");
      
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500); 
    } catch (error: any) {
      console.error(error);
      setSaveStatus("idle");
      // 3. PERBAIKAN: GANTI ALERT GAGAL SAVE DENGAN TOAST
      toast({
        title: "Gagal Menyimpan Pengaturan",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]); // Tambahkan toast di dependency array

  // Handlers
  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings); 
    saveToServer(newSettings); 
  };

  const handleSliderCommit = (value: number[]) => {
    const newSettings = { ...settings, globalVolume: value[0] };
    setSettings(newSettings);
    saveToServer(newSettings);
  };

  const handleInputChange = (key: keyof typeof settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleInputBlur = () => {
    saveToServer(settings);
  };

  const handleTestWhatsApp = async () => {
    if (!settings.waNumber) {
      // 4. PERBAIKAN: GANTI ALERT NOMOR KOSONG DENGAN TOAST
      toast({
        title: "Nomor WhatsApp Kosong",
        description: "Harap masukkan nomor kontak bidan terlebih dahulu sebelum menguji.",
        variant: "destructive",
      });
      return;
    }
    
    // Beri umpan balik bahwa sistem sedang mencoba mengirim
    toast({
        title: "Mengirim Uji Coba...",
        description: "Menghubungi server Fonnte...",
    });

    try {
      const token = localStorage.getItem("infucare_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/test-wa`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        // 5. PERBAIKAN: GANTI ALERT SUKSES DENGAN TOAST
        toast({
            title: "Pesan WhatsApp Terkirim!",
            description: data.message,
        });
      } else {
        // 6. PERBAIKAN: GANTI ALERT ERROR BACKEND DENGAN TOAST
        toast({
            title: "Gagal Mengirim Uji Coba",
            description: data.error,
            variant: "destructive",
        });
      }
    } catch(err) {
      toast({
        title: "Kesalahan Jaringan",
        description: "Gagal menghubungi server backend.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Memuat pengaturan...</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Auto-Save Indicator */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Sistem & Notifikasi</h1>
          <p className="text-muted-foreground">Perubahan akan tersimpan otomatis dan disinkronkan ke alat.</p>
        </div>

        <div className="flex h-10 items-center justify-end min-w-[120px]">
          <AnimatePresence mode="wait">
            {saveStatus === "saving" && (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center text-muted-foreground text-sm font-medium">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
              </motion.div>
            )}
            {saveStatus === "saved" && (
              <motion.div key="saved" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center text-emerald-500 text-sm font-medium">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Tersimpan & Sinkron
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MASTER MUTE BANNER */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={cn("border-2 transition-colors duration-300", settings.masterMuteWa ? "bg-destructive/10 border-destructive/50" : "bg-card border-border")}>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-full", settings.masterMuteWa ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground")}>
                {settings.masterMuteWa ? <BellOff className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
              </div>
              <div>
                <h2 className="text-lg font-bold">Master Mute Notifikasi WhatsApp</h2>
                <p className={cn("text-sm", settings.masterMuteWa ? "text-destructive font-medium" : "text-muted-foreground")}>
                  {settings.masterMuteWa
                    ? "Semua notifikasi darurat ke ponsel saat ini DIMATIKAN."
                    : "Sistem akan mengirimkan notifikasi ke ponsel sesuai aturan di bawah."}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.masterMuteWa}
              onCheckedChange={(val) => handleToggle("masterMuteWa", val)}
              className="data-[state=checked]:bg-destructive"
            />
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* GRID KIRI: Gateway & Audio & Ambang Batas */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-500" />
                <CardTitle>WhatsApp Gateway (Fonnte)</CardTitle>
              </div>
              <CardDescription>Nomor kontak Bidan Desa untuk notifikasi darurat.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="waNumber">Nomor WhatsApp Tujuan</Label>
                <div className="flex gap-2">
                  <Input
                    id="waNumber"
                    type="tel"
                    placeholder="Contoh: 6281234567890"
                    value={settings.waNumber}
                    onChange={(e) => handleInputChange("waNumber", e.target.value)}
                    onBlur={handleInputBlur} 
                    disabled={settings.masterMuteWa}
                  />
                  <Button variant="secondary" onClick={handleTestWhatsApp} disabled={settings.masterMuteWa}>
                    <TestTube className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Uji Coba</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Gunakan kode negara (62) tanpa tanda (+). Klik area luar kotak untuk menyimpan.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-primary" />
                  <CardTitle>Konfigurasi Audio Hardware</CardTitle>
                </div>
              </div>
              <CardDescription>Kendali senyap (Mute) untuk sirine meja dan speaker kamar pasien.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* TOGGLE BARU: MUTE GATEWAY BUZZER */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-destructive">Bungkam Sirine Gateway</Label>
                  <p className="text-[11px] text-muted-foreground">Matikan suara buzzer darurat di meja bidan.</p>
                </div>
                <Switch
                  checked={settings.muteGatewayBuzzer}
                  onCheckedChange={(val) => handleToggle("muteGatewayBuzzer", val)}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>

              {/* TOGGLE LAMA: MUTE NODE SPEAKER */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Bungkam Speaker Kamar (Node)</Label>
                  <p className="text-[11px] text-muted-foreground">Matikan panduan suara DFPlayer di tiang infus pasien.</p>
                </div>
                <Switch
                  checked={settings.globalMuteHardware}
                  onCheckedChange={(val) => handleToggle("globalMuteHardware", val)}
                />
              </div>

              <Separator />

              <div className={cn("space-y-4 pt-2 transition-opacity", settings.globalMuteHardware && "opacity-50 pointer-events-none")}>
                <div className="flex items-center justify-between">
                  <Label>Volume Audio Kamar Pasien</Label>
                  <span className="font-bold">{settings.globalVolume}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[settings.globalVolume]}
                    onValueChange={(val) => handleInputChange("globalVolume", val[0])}
                    onValueCommit={handleSliderCommit}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Ambang Batas Alarm (Threshold)</CardTitle>
              </div>
              <CardDescription>Atur pemicu peringatan persentase volume botol.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Pemicu Peringatan Sisa Cairan</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={settings.emptyFluidPercentage}
                    onChange={(e) => handleInputChange("emptyFluidPercentage", Number(e.target.value))}
                    onBlur={handleInputBlur}
                    className="w-24"
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Batas volume menipis untuk membunyikan alarm persiapan ganti infus.</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Pemicu Kunci Aktuator Otomatis</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={settings.autoStopThresholdPct}
                    onChange={(e) => handleInputChange("autoStopThresholdPct", Number(e.target.value))}
                    onBlur={handleInputBlur}
                    className="w-24 border-destructive/50 focus-visible:ring-destructive"
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
                <p className="text-xs text-muted-foreground text-destructive">
                  Persentase batas mutlak. Alat akan otomatis menjepit selang jika cairan habis menyentuh angka ini.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GRID KANAN: Kategori Notifikasi */}
        <div className={cn("space-y-6 transition-opacity duration-300", settings.masterMuteWa && "opacity-40 pointer-events-none")}>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Peringatan Medis Kritis</CardTitle>
              </div>
              <CardDescription className="text-destructive/80">
                Wajib Respons Cepat. Memicu bunyi sirine ambulans pada Gateway di meja bidan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold cursor-pointer text-destructive">Deteksi Aliran Darah Naik</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Izinkan sirine Gateway dan WA berbunyi saat darah terdeteksi.</p>
                </div>
                <Switch checked={settings.alertBlood} onCheckedChange={(val) => handleToggle("alertBlood", val)} className="data-[state=checked]:bg-destructive" />
              </div>
              <Separator className="bg-destructive/10" />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold cursor-pointer text-destructive">Cairan Infus Habis Total</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Izinkan sirine Gateway dan WA saat cairan 0 ml (Batas Aktuator).</p>
                </div>
                <Switch checked={settings.alertEmpty} onCheckedChange={(val) => handleToggle("alertEmpty", val)} className="data-[state=checked]:bg-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BatteryWarning className="h-5 w-5 text-warning" />
                <CardTitle className="text-warning">Peringatan Perhatian</CardTitle>
              </div>
              <CardDescription className="text-warning/80">
                Memicu bunyi beep lambat pada Gateway di meja bidan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold cursor-pointer text-warning">Sisa Cairan Infus Menipis</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Bunyikan beep saat menyentuh batas {settings.emptyFluidPercentage}%.</p>
                </div>
                <Switch checked={settings.alert15Min} onCheckedChange={(val) => handleToggle("alert15Min", val)} />
              </div>
              <Separator className="bg-warning/10" />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold cursor-pointer text-warning">Baterai Alat (Node) Melemah</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Peringatan jika baterai alat pasien di bawah 15%.</p>
                </div>
                <Switch checked={settings.alertLowBattery} onCheckedChange={(val) => handleToggle("alertLowBattery", val)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle className="text-primary">Status Sistem & Perangkat</CardTitle>
              </div>
              <CardDescription className="text-primary/80">Informasi teknis dan intervensi keamanan alat (Hanya WA).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium cursor-pointer">Node Kehilangan Sinyal / Offline</Label>
                </div>
                <Switch checked={settings.alertOffline} onCheckedChange={(val) => handleToggle("alertOffline", val)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium cursor-pointer">Laporan Failsafe Executed</Label>
                </div>
                <Switch checked={settings.alertFailsafe} onCheckedChange={(val) => handleToggle("alertFailsafe", val)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}