import type { ApplianceEfficiencyResult, ApplianceEfficiencyStatus } from "./appliance-efficiency";

export type RecommendationDifficulty = "EASY" | "MEDIUM" | "HARD";
export type RecommendationPriority = "Tinggi" | "Sedang" | "Rendah";

export type RecommendationReasoning = {
  id: string;
  title: string;
  priority: RecommendationPriority;
  triggerApplianceName?: string;
  reason: string;
  estimatedSavingIdr: number;
  estimatedSavingKwh: number;
  difficulty: RecommendationDifficulty;
  impact: RecommendationPriority;
  practicalSteps: string[];
  disclaimer: string;
};

export const SAVINGS_DISCLAIMER = "Penghematan adalah estimasi dan tidak dijamin mengurangi tagihan resmi PLN.";

const HIGH_CONTRIBUTION = 30;
const statusRank: Record<ApplianceEfficiencyStatus, number> = {
  Efisien: 0,
  Normal: 1,
  "Perlu Dicek": 2,
  Boros: 3,
  "Sangat Boros": 4,
};

export function buildRecommendationReasoning({
  businessType,
  appliances,
}: {
  businessType: string;
  appliances: ApplianceEfficiencyResult[];
}): RecommendationReasoning[] {
  return appliances
    .filter((appliance) => shouldRecommend(businessType, appliance))
    .sort((a, b) => statusRank[b.status] - statusRank[a.status] || b.contributionPercent - a.contributionPercent)
    .map((appliance) => buildOne(businessType, appliance));
}

function shouldRecommend(businessType: string, appliance: ApplianceEfficiencyResult): boolean {
  if (appliance.status === "Boros" || appliance.status === "Sangat Boros") return true;
  if (!isHighContribution(appliance)) return false;
  if (businessType === "LAUNDRY" && isLaundryHeat(appliance.name)) return true;
  if (businessType === "COLD_STORAGE" && isCold(appliance.name)) return true;
  return isLighting(appliance.name) || isAc(appliance.name);
}

function buildOne(businessType: string, appliance: ApplianceEfficiencyResult): RecommendationReasoning {
  if (businessType === "LAUNDRY" && isHighContribution(appliance) && isLaundryHeat(appliance.name)) {
    return makeRecommendation(appliance, {
      kind: "laundry",
      title: `Optimalkan Siklus ${appliance.name}`,
      rate: 0.12,
      difficulty: "EASY",
      why: `${appliance.name} dominan pada usaha laundry, sehingga batching, jadwal, dan perawatan langsung memengaruhi konsumsi listrik.`,
      practicalSteps: [
        "Batching: gabungkan order/cucian agar mesin berjalan mendekati kapasitas penuh.",
        "Atur jadwal beban besar agar tidak menyala kecil-kecil sepanjang hari.",
        "Bersihkan filter, jalur panas/uap, dan cek kebocoran pada pengering atau boiler.",
      ],
    });
  }

  if (businessType === "COLD_STORAGE" && isHighContribution(appliance) && isCold(appliance.name)) {
    return makeRecommendation(appliance, {
      kind: "cold-storage",
      title: `Kurangi Beban Freezer ${appliance.name}`,
      rate: 0.1,
      difficulty: "MEDIUM",
      why: `${appliance.name} menjadi beban utama cold storage, jadi kebocoran dingin kecil bisa menambah kerja kompresor sepanjang hari.`,
      practicalSteps: [
        "Cek karet gasket pintu dengan tes selipan kertas.",
        "Setel suhu sesuai kebutuhan produk, jangan lebih dingin dari standar operasional.",
        "Rapikan layout stok agar sirkulasi udara tidak tertutup.",
        "Terapkan disiplin buka-tutup pintu: singkat, terjadwal, dan tidak dibiarkan terbuka.",
      ],
    });
  }

  if (isHighContribution(appliance) && isLighting(appliance.name)) {
    return makeRecommendation(appliance, {
      kind: "lighting",
      title: `Optimalkan Penerangan ${appliance.name}`,
      rate: 0.25,
      difficulty: "EASY",
      why: `${appliance.name} memakai porsi listrik tinggi untuk penerangan, sehingga LED dan jadwal nyala memberi dampak cepat.`,
      practicalSteps: [
        "Ganti lampu lama/TL/halogen yang masih tersisa ke LED.",
        "Buat jadwal nyala per zona agar area kosong tidak tetap menyala.",
        "Bersihkan armatur lampu agar terang tidak dikompensasi dengan daya lebih besar.",
      ],
    });
  }

  if (isHighContribution(appliance) && isAc(appliance.name)) {
    return makeRecommendation(appliance, {
      kind: "ac",
      title: `Optimalkan AC ${appliance.name}`,
      rate: 0.1,
      difficulty: "MEDIUM",
      why: `${appliance.name} berkontribusi besar, sehingga suhu terlalu rendah atau filter kotor membuat kompresor bekerja lebih lama.`,
      practicalSteps: [
        "Setel suhu AC di 24–26°C sesuai kenyamanan ruang.",
        "Bersihkan filter minimal tiap 2–4 minggu saat pemakaian padat.",
        "Pertimbangkan AC inverter saat penggantian unit, terutama untuk ruangan yang menyala lama.",
      ],
    });
  }

  return makeRecommendation(appliance, {
    kind: "generic",
    title: `Audit Pemakaian ${appliance.name}`,
    rate: appliance.status === "Sangat Boros" ? 0.18 : 0.12,
    difficulty: "MEDIUM",
    why: `${appliance.name} berstatus ${appliance.status} dari klasifikasi efisiensi peralatan.`,
    practicalSteps: [
      "Cocokkan jam nyala aktual dengan jam operasional usaha.",
      "Gunakan timer atau SOP matikan alat saat tidak dipakai.",
      "Cek umur alat, kebersihan, dan tanda kerusakan yang membuat konsumsi naik.",
    ],
  });
}

function makeRecommendation(
  appliance: ApplianceEfficiencyResult,
  options: {
    kind: string;
    title: string;
    rate: number;
    difficulty: RecommendationDifficulty;
    why: string;
    practicalSteps: string[];
  }
): RecommendationReasoning {
  const estimatedSavingKwh = round1(appliance.monthlyKwh * options.rate);
  const estimatedSavingIdr = Math.round(appliance.estimatedMonthlyCost * options.rate);
  const ratePercent = Math.round(options.rate * 100);
  const contribution = isHighContribution(appliance)
    ? ` Kontribusinya ${appliance.contributionPercent}% dari pemakaian bulanan.`
    : "";

  return {
    id: `generated:${appliance.applianceId}:${options.kind}`,
    title: options.title,
    priority: getPriority(appliance, estimatedSavingIdr),
    triggerApplianceName: appliance.name,
    reason: `${options.why} ${appliance.reason}${contribution} Estimasi memakai asumsi penurunan ${ratePercent}% dari konsumsi alat (${appliance.monthlyKwh.toLocaleString("id-ID")} kWh/bulan).`,
    estimatedSavingIdr,
    estimatedSavingKwh,
    difficulty: options.difficulty,
    impact: getImpact(appliance, estimatedSavingKwh),
    practicalSteps: options.practicalSteps,
    disclaimer: SAVINGS_DISCLAIMER,
  };
}

function getPriority(appliance: ApplianceEfficiencyResult, estimatedSavingIdr: number): RecommendationPriority {
  if (appliance.status === "Sangat Boros" || appliance.contributionPercent >= 50 || estimatedSavingIdr >= 200_000) return "Tinggi";
  if (appliance.status === "Boros" || appliance.contributionPercent >= HIGH_CONTRIBUTION || estimatedSavingIdr >= 50_000) return "Sedang";
  return "Rendah";
}

function getImpact(appliance: ApplianceEfficiencyResult, estimatedSavingKwh: number): RecommendationPriority {
  if (appliance.contributionPercent >= 40 || estimatedSavingKwh >= 50) return "Tinggi";
  if (appliance.contributionPercent >= HIGH_CONTRIBUTION || estimatedSavingKwh >= 15) return "Sedang";
  return "Rendah";
}

function isHighContribution(appliance: ApplianceEfficiencyResult): boolean {
  return appliance.contributionPercent >= HIGH_CONTRIBUTION;
}

function isLaundryHeat(name: string): boolean {
  return /dryer|pengering|boiler/i.test(name);
}

function isCold(name: string): boolean {
  return /freezer|cold|chiller|kulkas|pendingin|beku/i.test(name);
}

function isLighting(name: string): boolean {
  return /lampu|lighting|led|neon|penerangan/i.test(name);
}

function isAc(name: string): boolean {
  return /(^|\s)(ac|a\/c)(\s|$)|air conditioner|pendingin ruangan/i.test(name);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}