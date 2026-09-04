"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  UserPlus,
  Pencil,
  Trash2,
  Check,
  Activity,
  User,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast"; 

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FluidProfile {
  ID: number;
  Name: string;
}
interface ExtendedPatientUI {
  id: string;
  name: string;
  nik: string;
  alamat: string;
  fluidType: string;
  fluidId: string;
  targetTpm: number | null;
  deviceSn: string;
  status: string;
}

export default function PatientsPage() {
  const { toast } = useToast(); 
  const [patients, setPatients] = useState<ExtendedPatientUI[]>([]);
  const [fluidTypes, setFluidTypes] = useState<FluidProfile[]>([]);
  const [allOnlineDevices, setAllOnlineDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State untuk Modal Form
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<ExtendedPatientUI | null>(null);

  // State untuk Modal Hapus (Delete Confirmation)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<ExtendedPatientUI | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    nik: "",
    alamat: "",
    targetTpm: 20,
    fluidId: "",
    deviceSn: "",
    bottleCount: 1,
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("infucare_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [resPatients, resFluids, resDevices, resActiveSessions] =
        await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/fluids`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/devices`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/active`, { headers }),
        ]);

      const dataPatients = resPatients.ok ? await resPatients.json() : { data: [] };
      const dataFluids = resFluids.ok ? await resFluids.json() : { data: [] };
      const dataDevices = resDevices.ok ? await resDevices.json() : { data: [] };
      const dataSessions = resActiveSessions.ok ? await resActiveSessions.json() : { data: [] };

      setFluidTypes(dataFluids.data || []);

      const onlineDevices = (dataDevices.data || []).filter((d: any) => d.Status === "ONLINE");
      setAllOnlineDevices(onlineDevices);

      const mergedPatients: ExtendedPatientUI[] = (dataPatients.data || []).map(
        (p: any) => {
          const activeSession = (dataSessions.data || []).find(
            (s: any) => s.patient_id === p.ID
          );
          return {
            id: p.ID.toString(),
            name: p.Name,
            nik: p.RegistrationNo,
            alamat: p.Address,
            fluidType: activeSession ? activeSession.fluid_name : "-",
            fluidId: activeSession ? activeSession.fluid_id.toString() : "",
            targetTpm: activeSession ? activeSession.target_tpm : null,
            deviceSn: activeSession ? activeSession.device_sn : "-",
            status: activeSession ? activeSession.status.toLowerCase() : "tidak aktif",
          };
        }
      );

      setPatients(mergedPatients);
    } catch (error) {
      console.error("Gagal menarik data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.alamat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: "",
      nik: "",
      alamat: "",
      targetTpm: 20,
      fluidId: "",
      deviceSn: "",
      bottleCount: 1,
    });
    setEditingPatient(null);
  };

  const openEditDialog = (patient: ExtendedPatientUI) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      nik: patient.nik,
      alamat: patient.alamat,
      targetTpm: patient.targetTpm || 20,
      fluidId: patient.fluidId,
      deviceSn: patient.deviceSn === "-" ? "" : patient.deviceSn,
      bottleCount: 1,
    });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("infucare_token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      let patientId = editingPatient?.id;

      // 1. URUSAN PROFIL PASIEN (Bikin Baru atau Edit)
      if (!editingPatient) {
        // A. POST: Bikin Pasien Baru
        const resPatient = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: formData.name,
            registration_no: formData.nik,
            address: formData.alamat,
          }),
        });
        if (!resPatient.ok) throw new Error((await resPatient.json()).error);
        const newPatientData = await resPatient.json();
        patientId = newPatientData.data.ID;
      } else {
        // B. PUT: Edit Profil Pasien Lama
        const resPatient = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${patientId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            name: formData.name,
            registration_no: formData.nik,
            address: formData.alamat,
          }),
        });
        if (!resPatient.ok) throw new Error((await resPatient.json()).error);
      }

      // 2. URUSAN SESI INFUS
      const isReadyForNewSession = !editingPatient || editingPatient.status === "tidak aktif";

      if (formData.deviceSn && formData.fluidId && patientId && isReadyForNewSession) {
        const resSession = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            patient_id: parseInt(patientId.toString()),
            device_sn: formData.deviceSn,
            fluid_id: parseInt(formData.fluidId),
            target_tpm: formData.targetTpm,
            bottle_count: formData.bottleCount,
          }),
        });
        if (!resSession.ok) {
          const err = await resSession.json();
          // PERBAIKAN TOAST 1 (Gagal Sesi)
          toast({
            title: "Gagal Menginisialisasi Sesi Infus",
            description: err.error,
            variant: "destructive",
          });
          return; 
        }
      }

      // Berhasil Keseluruhan
      toast({
        title: "Penyimpanan Berhasil",
        description: editingPatient ? "Data pasien berhasil diperbarui." : "Pasien baru berhasil didaftarkan.",
      });

      fetchData();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      // PERBAIKAN TOAST 2 (Gagal Simpan Pasien)
      toast({
        title: "Gagal Menyimpan Data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Fungsi Eksekusi API Hapus
  const confirmDelete = async () => {
    if (!patientToDelete) return;

    try {
      const token = localStorage.getItem("infucare_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${patientToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      // Hilangkan data dari state setelah sukses dihapus dari backend
      setPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
      setIsDeleteDialogOpen(false);
      setPatientToDelete(null);
      
      toast({
        title: "Pasien Dihapus",
        description: "Data pasien berhasil dihapus dari sistem.",
      });

    } catch (error: any) {
      // PERBAIKAN TOAST 3 (Gagal Hapus)
      toast({
        title: "Penghapusan Ditolak",
        description: error.message,
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    }
  };

  const devicesToShow = allOnlineDevices.filter(
    (d) =>
      !d.current_patient_id ||
      (editingPatient && d.current_patient_id.toString() === editingPatient.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registrasi Pasien</h1>
          <p className="text-muted-foreground">Kelola catatan pasien dan pemasangan perangkat</p>
        </div>

        {/* MODAL FORMULIR (TAMBAH / EDIT) */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Tambah Pasien
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingPatient ? "Edit Pasien" : "Daftarkan Pasien Baru"}</DialogTitle>
              <DialogDescription>Masukkan detail pasien dan pasangkan dengan perangkat yang tersedia</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nama Pasien</Label>
                <Input value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nama lengkap" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>NIK (No. Identitas)</Label>
                  <Input value={formData.nik} onChange={(e) => setFormData((prev) => ({ ...prev, nik: e.target.value }))} placeholder="16 Digit NIK" disabled={!!editingPatient} />
                </div>
                <div className="grid gap-2">
                  <Label>Alamat Lengkap</Label>
                  <Input value={formData.alamat} onChange={(e) => setFormData((prev) => ({ ...prev, alamat: e.target.value }))} placeholder="mis., Desa Lumban Jaean" />
                </div>
              </div>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Sesi Infus (Opsional)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Target TPM</Label>
                  <Input 
                    type="number" 
                    value={formData.targetTpm} 
                    onChange={(e) => setFormData((prev) => ({ ...prev, targetTpm: parseInt(e.target.value) }))} 
                    disabled={editingPatient !== null && editingPatient.status !== "tidak aktif"} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Jenis Cairan</Label>
                  <Select 
                    value={formData.fluidId} 
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, fluidId: value }))} 
                    disabled={editingPatient !== null && editingPatient.status !== "tidak aktif"}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih cairan..." /></SelectTrigger>
                    <SelectContent>
                      {fluidTypes.map((type) => (
                        <SelectItem key={type.ID} value={type.ID.toString()}>{type.Name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Pasangkan dengan Perangkat</Label>
                <Select 
                  value={formData.deviceSn} 
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, deviceSn: value }))} 
                  disabled={editingPatient !== null && editingPatient.status !== "tidak aktif"}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih perangkat yang tersedia" /></SelectTrigger>
                  <SelectContent>
                    {devicesToShow.map((device) => (
                      <SelectItem key={device.SN} value={device.SN}>{device.SN} (Online)</SelectItem>
                    ))}
                    {devicesToShow.length === 0 && <SelectItem value="none" disabled>Tidak ada perangkat menganggur</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild><Button variant="outline" onClick={resetForm}>Batal</Button></DialogClose>
              <Button onClick={handleSubmit} disabled={!formData.name || !formData.nik}>
                <Check className="mr-2 h-4 w-4" /> {editingPatient ? "Simpan Perubahan" : "Daftarkan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari berdasarkan Nama atau NIK..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {/* MODAL KONFIRMASI HAPUS PASIEN */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Konfirmasi Penghapusan
            </DialogTitle>
            <DialogDescription className="pt-3">
              Apakah Anda yakin ingin menghapus data pasien <strong>{patientToDelete?.name}</strong> secara permanen?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
            Perhatian: Tindakan ini tidak dapat dibatalkan. Jika pasien ini memiliki riwayat rekam medis, sistem database akan menolak penghapusan.
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDelete}>Ya, Hapus Pasien</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>Pasien Terdaftar ({filteredPatients.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Jenis Cairan</TableHead>
                  <TableHead>Target TPM</TableHead>
                  <TableHead>Perangkat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-6">Memuat data...</TableCell></TableRow>
                ) : (
                  <AnimatePresence>
                    {filteredPatients.map((patient) => (
                      <motion.tr key={patient.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b">
                        <TableCell className="font-medium flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {patient.name}</TableCell>
                        <TableCell className="font-mono text-xs">{patient.nik}</TableCell>
                        <TableCell>{patient.alamat}</TableCell>
                        <TableCell>{patient.fluidType}</TableCell>
                        <TableCell>{patient.targetTpm ? `${patient.targetTpm} TPM` : "-"}</TableCell>
                        <TableCell>{patient.deviceSn !== "-" ? <Badge variant="outline">{patient.deviceSn}</Badge> : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={patient.status === "critical" ? "destructive" : patient.status === "warning" ? "outline" : patient.status === "normal" ? "default" : "secondary"}>
                            {patient.status === "critical" ? "Kritis" : patient.status === "warning" ? "Peringatan" : patient.status === "normal" ? "Normal" : "Tidak Aktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/patients/${patient.id}`}>
                              <Button variant="ghost" size="icon" title="Lihat Pemantauan"><Activity className="h-4 w-4" /></Button>
                            </Link>
                            <Button variant="ghost" size="icon" title="Edit Pasien" onClick={() => { openEditDialog(patient); setIsAddDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Hapus Pasien" className="text-destructive hover:text-destructive" onClick={() => { setPatientToDelete(patient); setIsDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}