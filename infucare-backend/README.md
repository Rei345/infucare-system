# InfuCare Backend API

![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Gin](https://img.shields.io/badge/Gin-008080?style=for-the-badge&logo=gin&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=mqtt&logoColor=white)
![Clean Architecture](https://img.shields.io/badge/Architecture-Clean-brightgreen?style=for-the-badge)

InfuCare Backend adalah sistem saraf pusat (*Central Nervous System*) untuk platform pemantauan dan pengendalian infus medis berbasis IoT. Dikembangkan dengan **Golang**, sistem ini melayani dua jalur komunikasi secara simultan: **HTTP REST API** untuk antarmuka pengguna (Dashboard Next.js) dan **Protokol MQTT** untuk komunikasi telemetri *real-time* dua arah dengan perangkat keras ESP32.

Proyek ini dibuat sebagai Tugas Akhir, dengan fokus pada arsitektur backend yang scalable dan reliable untuk kebutuhan monitoring medis yang sifatnya kritis (nyawa pasien bergantung pada akurasi dan kecepatan sistem ini merespons).

## Daftar Isi

- [Fitur Unggulan](#fitur-unggulan-enterprise-grade)
- [Struktur Arsitektur](#struktur-arsitektur-clean-architecture)
- [Persyaratan Sistem](#persyaratan-sistem)
- [Panduan Instalasi](#panduan-instalasi--menjalankan-server)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Komunikasi Topik MQTT](#komunikasi-topik-mqtt)
- [Dokumentasi API](#dokumentasi-api)

## Fitur Unggulan (Enterprise Grade)

- **Dual-Protocol Delivery** — Menangani request HTTP dari klien web sekaligus melakukan *listening & broadcasting* pesan MQTT (Fan-out Pattern) ke perangkat keras IoT.
- **Clean Architecture** — Mengisolasi logika bisnis (Usecase), model data (Domain), dan protokol komunikasi (Delivery) untuk skalabilitas dan pemeliharaan jangka panjang.
- **Database Transactions (ACID)** — Menjamin integritas data rekam medis pasien melalui eksekusi transaksi basis data yang ketat.
- **Smart Failsafe Integration** — Memproses data sensor batas warna dan berat untuk mengirimkan perintah darurat ke *motor servo*, guna menghentikan laju cairan infus.
- **WhatsApp Gateway Integration** — Notifikasi peringatan dini otomatis kepada tenaga medis.
- **Graceful Fault Tolerance** — Sistem *fallback* otomatis ke zona waktu `Asia/Jakarta` untuk memastikan validitas pencatatan *timestamp* sistem.

## Struktur Arsitektur (Clean Architecture)

Proyek ini dipisahkan menggunakan pola *Dependency Injection*:

```text
infucare-backend/
├── cmd/api/
│   └── main.go                 # DI Container & Entry Point
├── internal/
│   ├── config/                 # Koneksi Database & Seeder
│   ├── delivery/
│   │   ├── http/               # Gin Handlers & Centralized Router
│   │   └── mqtt/               # Paho MQTT Subscribers
│   ├── domain/                 # Struct Entities (GORM) & DTOs (JSON)
│   └── usecase/                # Business Logic & Transaksi Database
└── pkg/                        # External Libraries (WhatsApp, Auth Middleware, Fuzzy)
```

## Persyaratan Sistem

- Go >= 1.20
- PostgreSQL >= 14
- Broker MQTT (Mosquitto / EMQX / HiveMQ)

## Panduan Instalasi & Menjalankan Server

**1. Clone Repositori**

```bash
git clone https://github.com/Rei345/infucare-system.git
cd infucare-system/infucare-backend
```

**2. Konfigurasi Environment**

Buat file `.env` di root direktori proyek, lalu isi sesuai contoh tabel di bagian [Konfigurasi Environment](#konfigurasi-environment) di bawah.

**3. Unduh Dependensi & Sinkronisasi**

```bash
go mod tidy
```

**4. Jalankan Server**

```bash
go run cmd/api/main.go
```

Kalau berhasil, server akan aktif di `http://localhost:8080` (atau sesuai `PORT` yang ditentukan pada `.env`).

## Konfigurasi Environment

| Variabel | Deskripsi | Contoh Nilai Development |
| :--- | :--- | :--- |
| `PORT` | Port untuk HTTP Server Gin | `8080` |
| `DB_HOST` | Host server PostgreSQL | `localhost` |
| `DB_USER` | Username PostgreSQL | `postgres` |
| `DB_PASSWORD` | Password database PostgreSQL | `password123` |
| `DB_NAME` | Nama database PostgreSQL | `infucare_db` |
| `DB_PORT` | Port koneksi PostgreSQL | `5432` |
| `DB_SSLMODE` | Pengaturan mode SSL database | `disable` |
| `JWT_SECRET` | Kunci rahasia otentikasi token JWT | `rahasia_jwt_super_aman` |
| `MQTT_BROKER` | Host broker MQTT (samakan dengan gateway) | `127.0.0.1` atau `broker.emqx.io` |
| `MQTT_PORT` | Port broker MQTT | `1883` |
| `MQTT_USER` | Username autentikasi broker MQTT | `Admin_InfuCare` |
| `MQTT_PASSWORD` | Password autentikasi broker MQTT | `Rahasia123` |
| `MQTT_TOPIC` | Topik utama telemetri perangkat | `infucare/telemetry/+` |
| `FONNTE_TOKEN` | Token API WhatsApp Gateway (Fonnte) | `YOUR_FONNTE_TOKEN` |

## Komunikasi Topik MQTT

Sistem backend mengelola pertukaran pesan secara asinkron dengan bertindak sebagai **Subscriber** dan **Publisher**:

| Tipe | Topik | Keterangan |
|---|---|---|
| Subscribe | `infucare/telemetry/+` | Menerima metrik *load cell* dan laju aliran fluida dari setiap tiang infus |
| Subscribe | `infucare/emergency/+` | Menerima interupsi sinyal kritis dari perangkat keras secara instan |
| Publish | `infucare/command/{DeviceSN}` | Transmisi konfigurasi (`CFG`, `SET_BLOOD_TH`), *tare reset*, perubahan TPM, dan status *Lock/Unlock* aktuator spesifik |
| Publish | `infucare/gateway/control` | Transmisi perintah kendali global (seperti *Mute/Unmute Buzzer*) ke perangkat *Central Gateway* |

## Dokumentasi Endpoint API

*Base URL:* `http://localhost:8080/api/v1`

Semua *endpoint* (kecuali Login dan HTTP Fallback Telemetry) dilindungi oleh otentikasi JWT. Klien wajib menyertakan *header* `Authorization: Bearer <token>`.

| Method | Endpoint | Modul | Deskripsi |
| :--- | :--- | :--- | :--- |
| **POST** | `/auth/login` | Auth | Autentikasi staf/perawat dan mendapatkan token JWT |
| **GET** | `/dashboard/active` | Dashboard | Mengambil data sesi pemantauan yang sedang berjalan |
| **GET** | `/analytics/summary` | Dashboard | Mengambil ringkasan analitik dan statistik faskes |
| **GET** | `/analytics/session/:id/history` | Dashboard | Memuat riwayat telemetri untuk grafik analitik |
| **GET** | `/health-units` | Health Unit | Mendapatkan daftar unit kesehatan |
| **POST** | `/health-units` | Health Unit | Mendaftarkan unit kesehatan baru |
| **GET** | `/devices` | Device | Melihat status dan daftar alat (ESP32) yang terdaftar |
| **POST** | `/devices` | Device | Mengaktivasi alat baru ke dalam jaringan |
| **PUT** | `/devices/:sn/settings` | Device | Menyinkronkan pengaturan alarm & offset ke alat |
| **DELETE** | `/devices/:sn` | Device | Menghapus tautan perangkat dari sistem |
| **GET** | `/fluids` | Fluid | Memuat profil cairan infus beserta densitasnya |
| **POST** | `/fluids` | Fluid | Menambahkan profil cairan infus baru |
| **GET** | `/patients` | Patient | Mendapatkan daftar profil pasien |
| **POST** | `/patients` | Patient | Mendaftarkan pasien baru ke sistem |
| **PUT** | `/patients/:id` | Patient | Memperbarui data profil pasien |
| **DELETE** | `/patients/:id` | Patient | Menghapus data pasien beserta riwayat medisnya |
| **POST** | `/sessions` | Session | Memulai sesi pemantauan infus baru |
| **PUT** | `/sessions/:id/tare` | Session | Mencatat pergantian botol baru (Reset Timbangan) |
| **PUT** | `/sessions/:id/tpm` | Session | Memperbarui target laju tetesan cairan (TPM) |
| **PUT** | `/sessions/:id/end` | Session | Mengakhiri sesi pemantauan secara manual |
| **POST** | `/control/device/:sn/lock` | Control | Perintah manual mengunci selang ke aktuator linear |
| **POST** | `/control/device/:sn/unlock`| Control | Perintah manual membuka kuncian selang |
| **POST** | `/control/gateway/mute` | Control | Mematikan (mute) alarm suara pada Gateway |
| **POST** | `/control/gateway/unmute` | Control | Menyalakan kembali alarm suara pada Gateway |
| **GET** | `/settings` | Settings | Memuat konfigurasi notifikasi batas kritis sistem |
| **PUT** | `/settings` | Settings | Memperbarui parameter kalibrasi peringatan sistem |
| **POST** | `/settings/test-wa` | Settings | Mengirim pesan uji coba ke WhatsApp Gateway |
| **GET** | `/history` | Tracking | Memuat log aktivitas global (Audit Trail) |
| **GET** | `/patients/:id/tracking` | Tracking | Memuat riwayat medis dan tracking spesifik pasien |
| **POST** | `/telemetry` | Telemetry | *HTTP Fallback:* Menerima data sensor saat MQTT putus |
