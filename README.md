# InfuCare: Sistem Monitoring dan Kontrol Infus Cerdas Berbasis IoT untuk Layanan Home Care

![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-E7352C?style=for-the-badge&logo=espressif&logoColor=white)
![LoRa](https://img.shields.io/badge/LoRa-433MHz-red?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=mqtt&logoColor=white)

**InfuCare** adalah platform telemetri dan kendali medis berbasis Internet of Things (IoT) yang dirancang untuk memantau laju tetesan infus secara real-time dengan komunikasi LoRa, mendeteksi arus balik darah (*blood backflow*), dan mengeksekusi penutupan aliran cairan secara mandiri menggunakan aktuator servo presisi serta memprediksi habisnya cairan infus dengan Logika Fuzzy.

---

## 🏗️ Arsitektur Sistem Terintegrasi

Sistem ini menghubungkan perangkat keras di sisi rumah pasien dengan perangkat pusat di rumah Bidan melalui jaringan nirkabel berlapis (*LoRa Ra-02* dan *MQTT Broker Cloud*):

![Arsitektur Sistem InfuCare](docs/img/system-architecture.png)

### Alur Komunikasi Data:
1. **Sensing Layer:** ESP32 Node membaca volume cairan (HX711), laju tetesan (TCRT5000), dan frekuensi warna darah (TCS3200).
2. **Transmission Layer:** Paket data dikirim via frekuensi radio LoRa 433 MHz menuju Central Gateway, yang kemudian meneruskannya via MQTT ke Cloud Server.
3. **Backend Processing:** Backend Go memproses logika bisnis, kalkulasi estimasi sisa waktu berbasis Logika Fuzzy, pencatatan transaksi PostgreSQL, dan pengiriman notifikasi darurat WhatsApp.
4. **Presentation Layer:** Dashboard Next.js menampilkan visualisasi telemetri real-time dan menyediakan kontrol interaktif bagi tenaga medis.

---

## 📦 Komponen Repositori (Monorepo Structure)

Repositori ini terbagi menjadi 3 modul utama yang berdiri sendiri:

* [📂 hardware-esp32/](./hardware-esp32)  
  Berisi firmware C++ untuk **Node Infus** dan **Central Gateway**, diagram skema pengkabelan (*wiring*), tabel pemetaan pin, serta spesifikasi transmisi paket LoRa.
* [📂 infucare-backend/](./infucare-backend)  
  REST API dan *MQTT Subscriber* berbasis **Golang (Gin)** yang menerapkan *Clean Architecture*, *database transactions*, dan integrasi WhatsApp Gateway.
* [📂 infucare-frontend/](./infucare-frontend)  
  Aplikasi web dashboard berbasis **Next.js (App Router)**, **TypeScript**, dan **Tailwind CSS** untuk pemantauan sesi pasien serta pengiriman perintah jarak jauh ke alat.

---

## 💡 Fitur Kunci & Keamanan Pasien

* **Autonomous Safety Failsafe:** Aktuator servo secara otomatis menutup klem selang infus saat mendeteksi indikasi darah naik atau volume cairan berada di ambang batas kritis.
* **Dual-Level Alarm:** Peringatan audio bertingkat pada perangkat keras serta integrasi pesan darurat otomatis ke WhatsApp petugas medis.
* **Non-Blocking Firmware:** Pemrosesan multi-sensor berbasis `millis()` dan interupsi perangkat keras guna memastikan deteksi tetesan tidak terlewat saat proses transmisi radio berlangsung.
* **Hybrid Telemetry Ingestion:** Mendukung jalur komunikasi utama via protokol MQTT dan jalur cadangan (*HTTP fallback*) jika koneksi broker terputus.

---

## 🚀 Panduan Ringkas Instalasi Sistem

Untuk panduan konfigurasi detail pada tiap modul, silakan merujuk ke berkas README masing-masing:

1. **Firmware:** Buka [Panduan Hardware](./hardware-esp32/README.md) untuk konfigurasi pinout dan flashing via Arduino IDE.
2. **Backend:** Buka [Panduan Backend](./infucare-backend/README.md) untuk setup database PostgreSQL dan environment `.env`.
3. **Frontend:** Buka [Panduan Frontend](./infucare-frontend/README.md) untuk konfigurasi web dashboard Next.js.