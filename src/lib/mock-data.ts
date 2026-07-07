// ================= WattWise AI — Mock Data (frontend-only) =================
// Semua data di sini adalah data contoh (dummy) untuk keperluan demo prototipe.
// ponytail: skipped real backend/API — add when integrating PLN AMI/smart meter atau auth pengguna.

export type StatusPemakaian = "Normal" | "Perlu Dicek" | "Boros";
export type TingkatKesulitan = "Mudah" | "Sedang" | "Lanjutan";
export type RisikoLevel = "Rendah" | "Sedang" | "Tinggi";

// ---- Profil usaha contoh ----
export interface ProfilUsaha {
  namaUsaha: string;
  jenisUsaha: string;
  lokasi: string;
  dayaListrik: string;
  tarif: string;
  tagihanBulanLalu: number;
  rataRataTagihan: number;
  prediksiBulanIni: number;
  potensiHemat: number;
  energyScore: number;
  kwhBulanIni: number;
  jamOperasional: string;
  peralatanUtama: string[];
  kontak: string;
  preferensiNotifikasi: "WhatsApp" | "Email" | "Aplikasi";
}

export const profilUsaha: ProfilUsaha = {
  namaUsaha: "Kos Sederhana Purwokerto",
  jenisUsaha: "Kos-kosan / Properti",
  lokasi: "Banyumas, Purwokerto",
  dayaListrik: "2.200 VA",
  tarif: "R-1/TR",
  tagihanBulanLalu: 1_250_000,
  rataRataTagihan: 1_180_000,
  prediksiBulanIni: 1_420_000,
  potensiHemat: 180_000,
  energyScore: 72,
  kwhBulanIni: 985,
  jamOperasional: "24 Jam",
  peralatanUtama: ["AC Kamar (8 unit)", "Pompa Air (1 unit)", "Lampu Koridor", "Kulkas Bersama"],
  kontak: "Pak Hanif (Pemilik Kos)",
  preferensiNotifikasi: "WhatsApp",
};

// ---- Ringkasan kartu dashboard ----
export const ringkasan = {
  tagihanBulanLalu: 1_250_000,
  prediksiBulanIni: 1_420_000,
  kwhBulanIni: 985,
  potensiHemat: 180_000,
  energyScore: 72,
  statusPemakaian: "Perlu Perhatian" as "Aman" | "Perlu Perhatian" | "Boros",
  kenaikanVsMingguLalu: 18,
};

// ---- 6 bulan tagihan listrik ----
export const tagihanBulanan = [
  { bulan: "Sep", tagihan: 1_050_000, kwh: 730 },
  { bulan: "Okt", tagihan: 1_120_000, kwh: 778 },
  { bulan: "Nov", tagihan: 1_180_000, kwh: 820 },
  { bulan: "Des", tagihan: 1_310_000, kwh: 910 },
  { bulan: "Jan", tagihan: 1_250_000, kwh: 868 },
  { bulan: "Feb", tagihan: 1_420_000, kwh: 985, prediksi: true },
];

// ---- 14 hari pemakaian harian (kWh) bulan berjalan ----
export const pemakaianHarian = [
  { hari: "1", kwh: 28, normal: 30 },
  { hari: "2", kwh: 31, normal: 30 },
  { hari: "3", kwh: 29, normal: 30 },
  { hari: "4", kwh: 33, normal: 31 },
  { hari: "5", kwh: 30, normal: 31 },
  { hari: "6", kwh: 38, normal: 32 },
  { hari: "7", kwh: 41, normal: 32 },
  { hari: "8", kwh: 34, normal: 31 },
  { hari: "9", kwh: 30, normal: 31 },
  { hari: "10", kwh: 36, normal: 32 },
  { hari: "11", kwh: 44, normal: 33 },
  { hari: "12", kwh: 47, normal: 33 },
  { hari: "13", kwh: 39, normal: 33 },
  { hari: "14", kwh: 42, normal: 33 },
];

// ---- Estimasi pemakaian per peralatan ----
export const pemakaianPeralatan = [
  { nama: "Mesin Cuci", kwh: 265, warna: "#2563eb" },
  { nama: "Pengering", kwh: 310, warna: "#16a34a" },
  { nama: "Setrika", kwh: 195, warna: "#eab308" },
  { nama: "Lampu", kwh: 95, warna: "#f97316" },
  { nama: "Pompa Air", kwh: 80, warna: "#8b5cf6" },
  { nama: "Lainnya", kwh: 40, warna: "#94a3b8" },
];

// ---- Prediksi tagihan ----
export const prediksi = {
  prediksiTagihan: 1_420_000,
  tagihanBulanLalu: 1_250_000,
  kenaikanPersen: 13.6,
  risikoLevel: "Sedang" as RisikoLevel,
  alasanUtama: "Pemakaian alat berdaya tinggi meningkat pada jam operasional sore hari (16.00-21.00).",
  penjelasan:
    "Prediksi ini dibuat berdasarkan pola tagihan sebelumnya, jam operasional, dan jenis peralatan listrik yang digunakan. Hasilnya adalah estimasi dan bukan tagihan resmi PLN.",
};

// ---- Proyeksi pemakaian harian sampai akhir bulan ----
export const proyeksiBulanIni = [
  { hari: "1", aktual: 28 as number | null, proyeksi: null as number | null },
  { hari: "5", aktual: 30, proyeksi: null },
  { hari: "10", aktual: 36, proyeksi: null },
  { hari: "14", aktual: 42, proyeksi: 42 },
  { hari: "18", aktual: null, proyeksi: 44 },
  { hari: "22", aktual: null, proyeksi: 46 },
  { hari: "26", aktual: null, proyeksi: 48 },
  { hari: "30", aktual: null, proyeksi: 50 },
];

// ---- Kartu ringkasan anomali ----
export const anomaliCards = {
  judulLonjakan: "Lonjakan Pemakaian Terdeteksi",
  waktu: "18.00 - 21.00",
  kemungkinanPenyebab: "Mesin pengering dan setrika digunakan bersamaan pada jam sibuk malam",
  dampakEstimasi: "Tambahan biaya sekitar Rp45.000 minggu ini",
};

// ---- Tabel deteksi anomali ----
export interface BarisAnomali {
  tanggal: string;
  normal: number;
  terdeteksi: number;
  status: StatusPemakaian;
  saran: string;
}
export const tabelAnomali: BarisAnomali[] = [
  { tanggal: "6 Feb", normal: 32, terdeteksi: 38, status: "Perlu Dicek", saran: "Cek pemakaian pengering sore hari" },
  { tanggal: "7 Feb", normal: 32, terdeteksi: 41, status: "Boros", saran: "Setrika & pengering menyala bersamaan" },
  { tanggal: "8 Feb", normal: 31, terdeteksi: 34, status: "Normal", saran: "Pemakaian masih wajar" },
  { tanggal: "11 Feb", normal: 33, terdeteksi: 44, status: "Boros", saran: "Kurangi beban puncak jam 18.00-21.00" },
  { tanggal: "12 Feb", normal: 33, terdeteksi: 47, status: "Boros", saran: "Jadwalkan ulang penggunaan pengering" },
  { tanggal: "13 Feb", normal: 33, terdeteksi: 39, status: "Perlu Dicek", saran: "Pantau pompa air agar tidak lama menyala" },
  { tanggal: "14 Feb", normal: 33, terdeteksi: 42, status: "Boros", saran: "Sebar penggunaan alat berdaya tinggi" },
];

// ---- Rekomendasi hemat ----
export interface Rekomendasi {
  id: number;
  judul: string;
  penjelasan: string;
  hemat: number | null;
  hematLabel?: string;
  kesulitan: TingkatKesulitan;
  ikon: string;
}
export const rekomendasi: Rekomendasi[] = [
  {
    id: 1,
    judul: "Atur jadwal penggunaan mesin pengering",
    penjelasan: "Hindari menyalakan pengering di jam beban puncak (18.00-21.00). Geser ke siang hari saat pemakaian lebih rendah.",
    hemat: 60_000,
    kesulitan: "Mudah",
    ikon: "clock",
  },
  {
    id: 2,
    judul: "Matikan lampu area yang tidak digunakan",
    penjelasan: "Gunakan lampu hanya di area kerja aktif. Manfaatkan cahaya alami pada siang hari.",
    hemat: 25_000,
    kesulitan: "Mudah",
    ikon: "lightbulb",
  },
  {
    id: 3,
    judul: "Hindari setrika & pengering menyala bersamaan",
    penjelasan: "Kedua alat ini berdaya tinggi. Menyalakan bersamaan membuat lonjakan biaya. Lakukan bergantian.",
    hemat: 45_000,
    kesulitan: "Mudah",
    ikon: "zap",
  },
  {
    id: 4,
    judul: "Cek pompa air agar tidak menyala terlalu lama",
    penjelasan: "Pastikan pelampung tandon berfungsi baik agar pompa mati otomatis saat penuh.",
    hemat: 30_000,
    kesulitan: "Sedang",
    ikon: "droplets",
  },
  {
    id: 5,
    judul: "Catat tagihan listrik setiap bulan",
    penjelasan: "Pencatatan rutin membantu Anda mengenali kenaikan biaya lebih cepat dan mengontrol pemakaian.",
    hemat: null,
    hematLabel: "Meningkatkan kontrol",
    kesulitan: "Mudah",
    ikon: "notebook",
  },
];

// ---- Data laporan bulanan ----
export const laporan = {
  periode: "Februari 2025",
  dibuatPada: "2 Maret 2025",
  ringkasanAnomali: "3 hari dengan pemakaian di atas rata-rata terdeteksi pada minggu ke-2.",
  topRekomendasi: [
    "Atur jadwal mesin pengering — hemat Rp60.000/bulan",
    "Hindari setrika & pengering bersamaan — hemat Rp45.000/bulan",
    "Cek pompa air — hemat Rp30.000/bulan",
  ],
  totalEstimasiHemat: 135_000,
  catatanPenutup:
    "Laporan ini merupakan estimasi berdasarkan data input pengguna dan bukan tagihan resmi PLN. Untuk informasi tagihan resmi, silakan cek PLN Mobile atau hubungi kantor PLN terdekat.",
};

// ---- Paket harga ----
export interface Paket {
  nama: string;
  harga: string;
  hargaSub: string;
  fitur: string[];
  populer?: boolean;
  badge?: string;
}
export const paketHarga: Paket[] = [
  {
    nama: "Free",
    harga: "Rp0",
    hargaSub: "selamanya",
    fitur: ["Ringkasan listrik dasar", "1 lokasi usaha", "Input data manual"],
  },
  {
    nama: "Basic",
    harga: "Rp49.000 [HIPOTESIS HARGA — MASIH VALIDASI]",
    hargaSub: "/bulan",
    fitur: ["Dashboard lengkap", "Prediksi tagihan", "Peringatan anomali", "Laporan bulanan"],
    populer: true,
    badge: "Paling Cocok untuk UMKM Awal",
  },
  {
    nama: "Pro",
    harga: "Rp99.000",
    hargaSub: "/bulan",
    fitur: ["Semua fitur Basic", "Mesin rekomendasi hemat", "Notifikasi WhatsApp/email", "Energy Score"],
  },
  {
    nama: "Business",
    harga: "Rp199.000",
    hargaSub: "/bulan",
    fitur: ["Multi-pengguna", "Laporan lanjutan", "Dashboard multi-lokasi", "Dukungan prioritas"],
  },
];

export const segmenTarget = [
  { nama: "Kos-kosan", ikon: "bed", desc: "Penginapan & properti sewa kecil" },
  { nama: "Laundry", ikon: "shirt", desc: "Cuci, kering, setrika" },
  { nama: "Kuliner", ikon: "utensils", desc: "Warung makan, kafe, minuman" },
  { nama: "Minimarket", ikon: "store", desc: "Toko kelontong, chiller" },
  { nama: "Frozen Food", ikon: "snowflake", desc: "Freezer, cold storage" },
  { nama: "Fotokopi", ikon: "printer", desc: "Percetakan, digital printing" },
];

export const jenisUsahaOptions = [
  "Kos-kosan/Penginapan Kecil",
  "Laundry",
  "Kuliner/Makanan/Minuman",
  "Minimarket/Toko Kelontong",
  "Fotokopi/Percetakan",
  "Frozen Food",
  "Barbershop/Salon",
  "Bengkel",
  "Konveksi/Jahit",
];