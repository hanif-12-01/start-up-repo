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

---

## 💡 Apa itu WattWise AI?

**WattWise AI** adalah platform asisten efisiensi dan pemantauan energi berbasis kecerdasan buatan (AI) yang dirancang untuk membantu sektor bisnis meminimalkan pengeluaran biaya listrik bulanan secara cerdas dan sistematis. Platform ini bertindak sebagai asisten virtual yang mendeteksi penggunaan daya berlebih, memprediksi pengeluaran, dan memberikan rekomendasi aksi konkret.

---

## 🎯 Target User: UMKM (Usaha Mikro, Kecil, dan Menengah)

WattWise AI secara khusus menargetkan pemilik **UMKM di Indonesia** (seperti usaha laundry, kuliner/F&B, minimarket/ritel, industri rumahan, dan cold storage) yang memiliki keterbatasan sumber daya untuk melakukan audit energi profesional namun menghadapi beban biaya operasional listrik yang tinggi dan fluktuatif.

---

## ⚡ Fitur Utama

### 🛠️ Fitur MVP 1 (Core Foundations)
*   **Autentikasi Pengguna & Registrasi:** Sistem pendaftaran dan masuk akun yang aman bagi pelaku usaha.
*   **Onboarding Profil Usaha:** Pengisian informasi awal profil usaha, daya listrik terpasang (VA), jam operasional, serta inventarisasi peralatan elektronik pertama kali.
*   **Dashboard Pemantauan Konsumsi:** Grafik tren konsumsi kWh bulanan dan biaya riil dalam Rupiah.
*   **Input Data Listrik Manual:** Pencatatan mandiri bulanan untuk angka pemakaian kWh meteran dan total tagihan listrik.
*   **Prediksi Tagihan Bulanan:** Estimasi kasar tagihan listrik berjalan dan sisa hari sebelum jatuh tempo.
*   **Deteksi Anomali Pemakaian:** Notifikasi otomatis jika terjadi lonjakan pemakaian energi yang tidak wajar.
*   **Rekomendasi Hemat Energi:** Rekomendasi taktis untuk mengurangi konsumsi listrik disesuaikan dengan jenis alat elektronik.
*   **Laporan Ringkasan Bulanan:** Preview laporan penggunaan bulanan terintegrasi.
*   **Ekspor Dokumen PDF:** Cetak ringkasan laporan bulanan dalam berkas PDF formal secara instan.

### 🚀 Fitur MVP 2 (Multi-Business & Switcher)
*   **Multi-Business Switcher:** Kemampuan mengelola lebih dari satu profil usaha dalam satu akun pengguna tunggal (contoh: berpindah dari mengelola *Laundry Berkah* ke *Frozen Jaya Purwokerto* secara langsung).
*   **Server-Side Cookie State Isolation:** Menggunakan cookie server (`wattwise_active_business_id`) untuk mengunci sesi usaha aktif secara aman.
*   **Data Scoping:** Seluruh alur input data, visualisasi grafik, anomali, kalkulasi rekomendasi, hingga laporan PDF otomatis terisolasi secara dinamis hanya untuk usaha aktif terpilih.
*   **Database Profile Syncing:** Profil usaha onboard baru langsung tersinkronisasi otomatis dengan session state.

---

## 🛠️ Tech Stack Terbaru

*   **Framework Utama:** Next.js 14.2.5 (App Router)
*   **Bahasa Pemrograman:** TypeScript 5.5
*   **Desain UI / Styling:** Tailwind CSS 3.4 & Lucide Icons
*   **ORM / Database Access Layer:** Prisma Client v5.22.0
*   **Basis Data:** PostgreSQL (dihosting di Supabase Cloud)
*   **Autentikasi & Sesi:** NextAuth.js v4 (Credentials Provider dengan enkripsi sandi `bcryptjs`)
*   **Validasi Data:** React Hook Form & Zod 4.x
*   **Penyusunan Berkas Dokumen:** PDFKit (Server-Side rendering)

---

## 📐 Arsitektur Sistem

WattWise AI dibangun dengan pola aliran data terisolasi dan aman dari client ke cloud database:

```
[ Browser / Client UI ] 
         │
         ▼ (Next.js Server Actions / API Routes)
[ Server Service Layer / NextAuth Session & Cookie Validation ]
         │
         ▼ (Prisma Client ORM)
[ Supabase PostgreSQL Cloud Database ]
```

1.  **Next.js (App Router):** Sebagai entry-point UI, menangani routing halaman statis dan dinamis.
2.  **Server Actions & API Routes:** Layer backend aman yang memproses form input, melakukan perhitungan estimasi, dan menangani session cookies.
3.  **Prisma Client:** Layer ORM terintegrasi dengan konfigurasi `DATABASE_URL` (transaction pooling) dan `DIRECT_URL` (direct connections).
4.  **Supabase PostgreSQL:** Basis data relasional cloud tempat seluruh skema data disimpan dengan aman.

---

## 🔑 Demo Account (Seed Data)

Untuk mempermudah ujicoba platform, gunakan kredensial demo berikut yang terhubung ke data contoh multi-usaha (*Laundry Berkah* & *Frozen Jaya Purwokerto*):

*   **Email:** `owner@wattwise.id`
*   **Password:** `password123`

---

## 📥 Panduan Setup Lokal

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
    Salin berkas `.env.example` menjadi `.env`:
    ```bash
    cp .env.example .env
    ```

4.  **Inisialisasi Database:**
    Jalankan migrasi skema database dan masukkan data demo awal (seeding):
    ```bash
    npx prisma migrate dev
    npx prisma db seed
    ```

5.  **Jalankan Aplikasi:**
    ```bash
    npm run dev
    ```
    Buka `http://localhost:3000` di peramban Anda.

---

## ⚙️ Environment Variables (`.env`)

Konfigurasi berikut wajib diatur di file `.env` lokal maupun panel environment hosting (seperti Vercel):

```env
# Supabase PostgreSQL — Prisma Connection Strings
# Port 6543 (Transaction Pooler) untuk runtime query (wajib menambahkan parameter pgbouncer=true)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Port 5432 (Session Pooler) untuk proses migrasi database (directUrl)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# NextAuth Settings
NEXTAUTH_URL="http://localhost:3000"
# Dapat dibuat via command: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXTAUTH_SECRET="buat-kunci-rahasia-jwt-acak-disini"
```

---

## ⚠️ Disclaimer Hubungan Resmi

> **Pernyataan Penyangkalan (Disclaimer):**  
> *   Seluruh data konsumsi energi, nilai estimasi tagihan listrik bulanan, kalkulasi emisi karbon, prediksi tingkat kehematan, dan peringatan anomali di dalam aplikasi WattWise AI bersifat **simulasi estimasi belaka** dan **bukan merupakan tagihan/laporan resmi dari PT PLN (Persero)**.
> *   Aplikasi ini **TIDAK terhubung secara resmi** dengan sistem IoT, Smart Metering, maupun infrastruktur Advanced Metering Infrastructure (AMI) milik PT PLN (Persero). Segala keputusan bisnis yang diambil atas hasil analisis data platform ini sepenuhnya menjadi tanggung jawab pengguna.

---
*Dibuat oleh Tim Pengembang WattWise AI.*
