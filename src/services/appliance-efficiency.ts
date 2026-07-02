export type ApplianceEfficiencyStatus = "Efisien" | "Normal" | "Perlu Dicek" | "Boros" | "Sangat Boros";

export type ApplianceEfficiencyAppliance = {
  id: string;
  name: string;
  powerWatt: number;
  quantity: number;
  dailyUsageHours: number;
};

export type ApplianceEfficiencyEntry = {
  month: number;
  year: number;
  usageKwh: number;
  costIdr?: number | null;
};

export type ApplianceEfficiencyInput = {
  businessType: string;
  appliances: ApplianceEfficiencyAppliance[];
  electricityEntries: ApplianceEfficiencyEntry[];
  currentMonth?: number;
  currentYear?: number;
};

export type ApplianceEfficiencyResult = {
  applianceId: string;
  name: string;
  monthlyKwh: number;
  estimatedMonthlyCost: number;
  contributionPercent: number;
  status: ApplianceEfficiencyStatus;
  reason: string;
  practicalAdvice: string;
};

type Context = {
  businessType: string;
  totalMonthlyKwh: number;
  tariff: number;
  increasedOver30: boolean;
  increasedVs3MonthAvg: boolean;
};

const COLD_KEYWORDS = ["freezer", "chiller", "showcase", "kulkas", "cold", "pendingin", "refrigerator", "walk-in", "beku", "es"];
const LAUNDRY_KEYWORDS = ["mesin cuci", "washer", "dryer", "pengering", "setrika", "boiler", "laundry"];
const FNB_KEYWORDS = ["kompor", "oven", "rice cooker", "mixer", "grinder", "kulkas", "freezer", "chiller"];
const RETAIL_KEYWORDS = ["lampu", "showcase", "etalase", "kasir", "pos", "kulkas"];
const MANUFACTURE_KEYWORDS = ["mesin", "motor", "compressor", "kompresor", "pompa", "conveyor", "produksi"];
const NOT_24H_KEYWORDS = ["ac", "air conditioner", "lampu", "setrika", "mesin cuci", "dryer", "pengering", "pompa", "oven", "kompor", "boiler"];

export function classifyApplianceEfficiency(input: ApplianceEfficiencyInput): ApplianceEfficiencyResult[] {
  const appliances = input.appliances.filter((a) => a.powerWatt > 0 && a.quantity > 0 && a.dailyUsageHours > 0);
  const entries = [...input.electricityEntries].sort((a, b) => a.year - b.year || a.month - b.month);
  const current = findCurrentEntry(entries, input.currentMonth, input.currentYear);
  const previous = current ? entries[entries.indexOf(current) - 1] : null;
  const previous3 = current ? entries.slice(Math.max(0, entries.indexOf(current) - 3), entries.indexOf(current)) : [];
  const applianceTotalKwh = appliances.reduce((sum, a) => sum + estimateMonthlyKwh(a), 0);
  const totalMonthlyKwh = current?.usageKwh && current.usageKwh > 0 ? current.usageKwh : applianceTotalKwh;
  const tariff = current?.costIdr && current.usageKwh > 0 ? current.costIdr / current.usageKwh : 1450;
  const previousAvg = previous3.length ? previous3.reduce((sum, e) => sum + e.usageKwh, 0) / previous3.length : 0;
  const context: Context = {
    businessType: input.businessType,
    totalMonthlyKwh,
    tariff,
    increasedOver30: Boolean(current && previous && previous.usageKwh > 0 && (current.usageKwh - previous.usageKwh) / previous.usageKwh > 0.3),
    increasedVs3MonthAvg: Boolean(current && previousAvg > 0 && (current.usageKwh - previousAvg) / previousAvg > 0.3),
  };

  return appliances.map((appliance) => classifyOne(appliance, context));
}

function classifyOne(appliance: ApplianceEfficiencyAppliance, context: Context): ApplianceEfficiencyResult {
  const monthlyKwh = round1(estimateMonthlyKwh(appliance));
  const contributionPercent = context.totalMonthlyKwh > 0 ? round1((monthlyKwh / context.totalMonthlyKwh) * 100) : 0;
  const estimatedMonthlyCost = Math.round(monthlyKwh * context.tariff);
  const name = appliance.name;
  const isColdStorage = context.businessType === "COLD_STORAGE";
  const isColdEquipment = hasAny(name, COLD_KEYWORDS);
  const isExpected = isExpectedForBusiness(context.businessType, name);
  const runs24h = appliance.dailyUsageHours >= 23.5;
  const allowed24h = isColdStorage && isColdEquipment;
  const veryHigh = contributionPercent > 50;
  const high = contributionPercent > 40;

  let status: ApplianceEfficiencyStatus = "Normal";
  let reason = "Pemakaian alat masih sesuai pola umum usaha.";
  let practicalAdvice = "Pantau jam pakai dan bersihkan alat secara berkala.";

  if (isColdStorage && isColdEquipment && veryHigh && context.increasedVs3MonthAvg) {
    status = "Perlu Dicek";
    reason = "Freezer/pendingin adalah alat utama cold storage, tetapi kontribusinya sangat tinggi dan pemakaian naik dibanding rata-rata 3 bulan.";
    practicalAdvice = "Cek karet pintu, suhu setelan, bunga es, dan jadwal buka-tutup freezer.";
  } else if (veryHigh && context.increasedOver30) {
    status = "Sangat Boros";
    reason = "Kontribusi alat di atas 50% dan total pemakaian usaha naik lebih dari 30% dari bulan sebelumnya.";
    practicalAdvice = "Prioritaskan audit alat ini: cek kerusakan, jam operasi, dan SOP pemakaian harian.";
  } else if (runs24h && !allowed24h && (hasAny(name, NOT_24H_KEYWORDS) || !isExpected)) {
    status = "Boros";
    reason = "Alat tercatat berjalan 24 jam, padahal jenis alat ini umumnya tidak perlu menyala penuh sehari.";
    practicalAdvice = "Gunakan timer atau jadwal operasi sesuai jam produksi/usaha.";
  } else if (high) {
    status = isExpected ? "Perlu Dicek" : "Boros";
    reason = isExpected
      ? "Alat ini wajar menjadi beban utama untuk jenis usaha Anda, tetapi kontribusinya sudah di atas 40%."
      : "Kontribusi alat di atas 40% dari pemakaian bulanan, lebih tinggi dari pola normal.";
    practicalAdvice = isExpected
      ? "Bandingkan jam pakai dengan omzet/produksi dan cek efisiensi alat rutin."
      : "Kurangi jam pakai, cek kapasitas alat, atau pindahkan beban ke alat yang lebih efisien.";
  } else if (monthlyKwh <= 30 && contributionPercent <= 8) {
    status = "Efisien";
    reason = "Estimasi kWh bulanan rendah dan kontribusinya kecil terhadap total pemakaian.";
    practicalAdvice = "Pertahankan pola pakai saat ini.";
  } else if (isExpected || contributionPercent <= 25) {
    status = "Normal";
    reason = isExpected
      ? "Pemakaian alat masih sesuai kebutuhan utama jenis usaha ini."
      : "Kontribusi alat masih dalam rentang wajar terhadap total pemakaian.";
    practicalAdvice = "Pantau jika jam operasi atau tagihan bulanan mulai naik.";
  } else {
    status = "Perlu Dicek";
    reason = "Kontribusi alat mulai menonjol dan perlu dipantau agar tidak menjadi sumber pemborosan.";
    practicalAdvice = "Cek jadwal pakai, umur alat, dan kebiasaan mematikan alat setelah digunakan.";
  }

  return { applianceId: appliance.id, name, monthlyKwh, estimatedMonthlyCost, contributionPercent, status, reason, practicalAdvice };
}

function estimateMonthlyKwh(appliance: ApplianceEfficiencyAppliance): number {
  return (appliance.powerWatt * appliance.quantity * appliance.dailyUsageHours * 30) / 1000;
}

function findCurrentEntry(entries: ApplianceEfficiencyEntry[], month?: number, year?: number): ApplianceEfficiencyEntry | null {
  if (!entries.length) return null;
  if (month && year) return entries.find((e) => e.month === month && e.year === year) ?? entries[entries.length - 1];
  return entries[entries.length - 1];
}

function isExpectedForBusiness(businessType: string, name: string): boolean {
  if (businessType === "LAUNDRY") return hasAny(name, LAUNDRY_KEYWORDS);
  if (businessType === "FNB") return hasAny(name, FNB_KEYWORDS);
  if (businessType === "RETAIL") return hasAny(name, RETAIL_KEYWORDS);
  if (businessType === "MANUFACTURE") return hasAny(name, MANUFACTURE_KEYWORDS);
  if (businessType === "COLD_STORAGE") return hasAny(name, COLD_KEYWORDS);
  return false;
}

function hasAny(value: string, keywords: string[]): boolean {
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}