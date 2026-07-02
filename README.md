# ⚡ WattWise AI — MVP 2

> **Asisten Hemat Listrik Berbasis AI untuk UMKM Indonesia**  
> *Listrik Lebih Cerdas, Biaya Lebih Terkendali.*

---

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-v4-green?style=for-the-badge)](https://next-auth.js.org/)

WattWise AI adalah platform Minimum Viable Product (MVP) Fullstack yang dirancang khusus untuk membantu pemilik Usaha Mikro, Kecil, dan Menengah (UMKM) di Indonesia memantau pemakaian listrik, mendeteksi anomali penggunaan secara real-time, mendapatkan rekomendasi efisiensi tertarget, serta mengunduh laporan bulanan formal dalam format PDF.

---

## 🚀 Fitur Utama (MVP 2)

### 1. Autentikasi & Onboarding UMKM
*   **Secure Authentication:** Sistem login dan register berbasis NextAuth.js v4 Credentials Provider dengan enkripsi sandi menggunakan `bcryptjs`.
*   **Multi-step Onboarding:** Form pendaftaran profil usaha pertama kali secara mulus (Nama Usaha, Jenis Usaha, Daya Listrik, Jam Operasional, dan Daftar Peralatan Elektronik).

### 2. Multi-Business Switcher (Fitur Baru)
*   **Peralihan Usaha Instan:** Menu dropdown di bagian header/sidebar untuk berpindah di antara berbagai profil usaha yang dimiliki pengguna (contoh: *Laundry Berkah* dan *Frozen Jaya Purwokerto*).
*   **Server-Side Cookie State:** Pilihan usaha disimpan secara aman menggunakan server-side cookie (`wattwise_active_business_id`) dengan validasi kepemilikan ketat.
*   **Data Isolation:** Seluruh dashboard, grafik, prediksi, anomali, rekomendasi, dan riwayat input disaring otomatis berdasarkan usaha yang sedang aktif.

### 3. Dashboard Pemantauan & Input Data Manual
*   **Visualisasi Tren:** Grafik interaktif pemakaian listrik (kWh) dan biaya (Rupiah) bulan-ke-bulan menggunakan Recharts.
*   **Input Data Mandiri:** Input bulanan kWh dan tagihan riil dengan validasi data menggunakan React Hook Form + Zod.

### 4. Engine Analisis Energi Pintar
*   **Deteksi Anomali Dinamis:** Menganalisis lonjakan pemakaian listrik yang tidak biasa berdasarkan riwayat pemakaian dan kategori usaha.
*   **Prediksi Tagihan Bulanan:** Menghitung perkiraan tagihan bulan berjalan dan memberikan estimasi sisa hari pemakaian.
*   **Rekomendasi Efisiensi:** Rekomendasi hemat energi berdasarkan daya terpasang (VA) dan jenis operasional usaha.

### 5. Laporan Bulanan & Unduh PDF
*   **Dokumen Profesional:** Preview laporan bulanan lengkap dengan ringkasan konsumsi energi, status efisiensi, deteksi masalah, dan daftar saran perbaikan.
*   **Unduhan PDF Dinamis:** Ekspor laporan formal dengan Kop Surat WattWise AI menggunakan *PDFKit* langsung dari Server Action API.

---

## 🛠️ Arsitektur & Tech Stack

Sistem dibangun menggunakan arsitektur modern Next.js Fullstack:
*   **Framework:** Next.js 14 (App Router)
*   **Bahasa:** TypeScript
*   **Desain Antarmuka:** Tailwind CSS & Lucide Icons
*   **Basis Data:** PostgreSQL (dihosting di Supabase)
*   **ORM / Database Access Layer:** Prisma Client
*   **Manajemen Sesi:** NextAuth.js v4 (JWT session strategy)
*   **Validasi Formulir:** React Hook Form & Zod
*   **Ekspor Dokumen:** PDFKit (Server-Side rendering)

---

## ⚙️ Skema Basis Data (Prisma Schema)

Struktur relasi data dirancang tangguh dan efisien:

```mermaid
erDiagram
    User ||--o{ Business : owns
    Business ||--o{ ElectricityEntry : tracks
    Business ||--o{ DailyUsage : logs
    Business ||--o{ Appliance : contains
    Business ||--o{ AnalysisResult : analyzes
    Business ||--o{ Anomaly : detects
    Business ||--o{ Recommendation : suggests
    Business ||--o{ MonthlyReport : compiles
```

*   **User:** Menyimpan kredensial email dan nama pengguna.
*   **Business:** Menyimpan data UMKM (tipe daya VA, jenis usaha, jam kerja, dan relasi ke data pendukung).
*   **Appliance:** Daftar peralatan listrik untuk estimasi kontribusi kWh (mesin cuci, freezer, lampu, dll.).
*   **ElectricityEntry:** Riwayat data listrik bulanan masukan pengguna.
*   **AnalysisResult & Anomaly:** Hasil kalkulasi performa energi dan peringatan lonjakan tidak wajar.

---

## 📥 Panduan Instalasi Lokal

### Prerequisites
*   Node.js v18 atau v20
*   NPM (bawaan Node.js)
*   PostgreSQL Database (bisa menggunakan Docker atau Supabase gratisan)

### Langkah-langkah
1.  **Kloning Repositori:**
    ```bash
    git clone https://github.com/hanif-12-01/start-up-repo.git
    cd start-up-repo
    ```

2.  **Instalasi Dependensi:**
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment Variables:**
    Salin berkas `.env.example` menjadi `.env` dan lengkapi nilainya:
    ```bash
    cp .env.example .env
    ```
    Isi berkas `.env`:
    ```env
    # Supabase Connection Strings
    DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
    DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

    # NextAuth Settings
    NEXTAUTH_URL="http://localhost:3000"
    NEXTAUTH_SECRET="buat-kunci-rahasia-jwt-acak-disini"
    ```

4.  **Inisialisasi Database:**
    Lakukan migrasi skema dan jalankan seeding data demo bawaan:
    ```bash
    npx prisma migrate dev
    npx prisma db seed
    ```

5.  **Jalankan Server Development:**
    ```bash
    npm run dev
    ```
    Buka `http://localhost:3000` pada peramban Anda.

---

## ☁️ Panduan Deploy ke Vercel

Sistem WattWise AI dikonfigurasi agar siap dideploy ke **Vercel** dengan konfigurasi zero-setup:

1.  **Daftarkan Proyek Baru di Vercel:** Hubungkan akun GitHub dan pilih repositori ini.
2.  **Tambahkan Environment Variables:** Masukkan nilai `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, dan `NEXTAUTH_URL` di pengaturan Vercel.
3.  **Post-Install Hook:** Proyek ini menyertakan script `"postinstall": "prisma generate"` di `package.json`, sehingga Vercel akan otomatis menyusun Prisma Client sebelum proses build dijalankan.
4.  **Selesai:** Vercel akan memproses build (`npm run build`) dan menghasilkan tautan live demo secara otomatis.

---

## ⚠️ Disclaimer Resmi

> **Catatan Penting:** Seluruh estimasi tagihan bulanan, prediksi penghematan biaya, dan deteksi anomali di dalam aplikasi ini bersifat **estimasi simulasi** dan **bukan merupakan tagihan resmi dari PT PLN (Persero)**. Aplikasi ini tidak berafiliasi secara resmi dengan PT PLN (Persero).

---
*Dibuat oleh Tim Pengembang WattWise AI.*
