import type { ElectricityInput } from "@/lib/validations/electricity";

export type AIAnalysisResult = {
  potensiHemat: number;
  energyScore: number;
  rekomendasi: string[];
  anomaliTerdeteksi: boolean;
  alasanAnomali?: string;
  prediksiTagihan: number;
};

export async function analyzeElectricityUsage(data: ElectricityInput): Promise<AIAnalysisResult> {
  const rataRataTagihan = Number(data.rataRataTagihan) || 0;
  const tagihanBulanLalu = Number(data.tagihanBulanLalu) || 0;
  const rasio = rataRataTagihan > 0 ? tagihanBulanLalu / rataRataTagihan : 1;
  const anomaliTerdeteksi = rasio > 1.05;

  const rekomendasi = [
    "Matikan lampu dan alat listrik di area yang sedang tidak digunakan.",
    "Jadwalkan penggunaan alat besar agar tidak menyala bersamaan terlalu lama.",
  ];

  if (data.jenisUsaha.toLowerCase().includes("laundry")) {
    rekomendasi.push("Gunakan mesin cuci dalam kapasitas penuh agar kWh per cucian lebih efisien.");
    rekomendasi.push("Periksa mesin pengering dan setrika uap saat tagihan naik tidak wajar.");
  }

  // ponytail: heuristic lokal dulu; ganti ke model ML/LLM saat data historis MVP cukup.
  return {
    potensiHemat: Math.round(tagihanBulanLalu * 0.15),
    energyScore: Math.max(10, Math.min(100, Math.round(85 - (rasio - 1) * 50))),
    rekomendasi,
    anomaliTerdeteksi,
    alasanAnomali: anomaliTerdeteksi
      ? "Kenaikan pemakaian terdeteksi dibanding rata-rata bulanan. Cek peralatan berdaya tinggi."
      : undefined,
    prediksiTagihan: Math.round(tagihanBulanLalu * 0.98),
  };
}