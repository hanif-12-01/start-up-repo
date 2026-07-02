import type { ApplianceEfficiencyAppliance } from "./appliance-efficiency";

export interface SavingAction {
  title: string;
  affectedApplianceName: string;
  actionType: string;
  beforeKwh: number;
  afterKwh: number;
  savedKwh: number;
  estimatedSavingIdr: number;
  contributionToTargetPercent: number; // will be calculated/updated relative to the target saving IDR
  assumption: string;
  whyItSaves: string;
  practicalSteps: string[];
  difficulty: "Mudah" | "Sedang" | "Sulit";
}

export interface SavingsPlanResult {
  targetSavingIdr: number;
  effectiveTariff: number;
  actions: SavingAction[];
  totalActionSavingIdr: number;
  isRealistic: boolean;
  coveragePercent: number;
  isTariffEstimated: boolean;
}

// Keyword detection helper
function detectCategory(name: string): "ac" | "cold" | "lighting" | "laundry_heat" | "cooking" | "other" {
  const lower = name.toLowerCase();
  if (/ac|air conditioner|pendingin ruangan/i.test(lower)) return "ac";
  if (/freezer|chiller|showcase|kulkas|cold|pendingin|beku|refrigerator|walk-in/i.test(lower)) return "cold";
  if (/lampu|lighting|led|neon|penerangan/i.test(lower)) return "lighting";
  if (/dryer|pengering|boiler|setrika/i.test(lower)) return "laundry_heat";
  if (/kompor|oven|rice cooker|microwave|cooking|pemasak/i.test(lower)) return "cooking";
  return "other";
}

export function generateSavingsPlan({
  businessType,
  appliances,
  currentMonthlyBill,
  targetPercent,
  latestEntryCost,
  latestEntryKwh,
}: {
  businessType: string;
  appliances: ApplianceEfficiencyAppliance[];
  currentMonthlyBill: number;
  targetPercent: number;
  latestEntryCost?: number | null;
  latestEntryKwh?: number | null;
}): SavingsPlanResult {
  // 1. Calculate effective tariff
  let effectiveTariff = 1450;
  let isTariffEstimated = true;

  if (latestEntryCost && latestEntryKwh && latestEntryKwh > 0) {
    effectiveTariff = Math.round(latestEntryCost / latestEntryKwh);
    isTariffEstimated = false;
  }

  // 2. Calculate target saving IDR
  const targetSavingIdr = Math.round((currentMonthlyBill * targetPercent) / 100);

  if (appliances.length === 0) {
    return {
      targetSavingIdr,
      effectiveTariff,
      actions: [],
      totalActionSavingIdr: 0,
      isRealistic: false,
      coveragePercent: 0,
      isTariffEstimated,
    };
  }

  const candidateActions: SavingAction[] = [];

  // Generate actions from actual active appliances
  appliances.forEach((app) => {
    const category = detectCategory(app.name);
    const beforeKwh = Math.round((app.powerWatt * app.quantity * app.dailyUsageHours * 30) / 1000);
    if (beforeKwh <= 0) return;

    // We build plan actions based on category & business type
    if (category === "cold") {
      if (businessType === "COLD_STORAGE") {
        // Cold Storage specific actions (DO NOT suggest turning off essential equipment)
        candidateActions.push({
          title: `Optimasi Karet Gasket & Pintu ${app.name}`,
          affectedApplianceName: app.name,
          actionType: "gasket_check",
          beforeKwh,
          afterKwh: Math.round(beforeKwh * 0.90), // 10% saving
          savedKwh: Math.round(beforeKwh * 0.10),
          estimatedSavingIdr: Math.round(beforeKwh * 0.10 * effectiveTariff),
          contributionToTargetPercent: 0, // calculated later
          assumption: "Mengurangi kebocoran udara dingin dengan memperbaiki gasket pintu.",
          whyItSaves: "Kompresor tidak perlu menyala terus-menerus untuk menjaga suhu dingin akibat kebocoran karet pintu.",
          practicalSteps: [
            "Lakukan tes selipan kertas untuk mengecek kerapatan karet pintu.",
            "Bersihkan permukaan magnet gasket secara berkala dari kotoran.",
            "Ganti karet gasket segera jika ada keretakan atau tidak rapat."
          ],
          difficulty: "Mudah",
        });

        candidateActions.push({
          title: `Disiplin Buka-Tutup Pintu ${app.name}`,
          affectedApplianceName: app.name,
          actionType: "door_discipline",
          beforeKwh,
          afterKwh: Math.round(beforeKwh * 0.92), // 8% saving
          savedKwh: Math.round(beforeKwh * 0.08),
          estimatedSavingIdr: Math.round(beforeKwh * 0.08 * effectiveTariff),
          contributionToTargetPercent: 0,
          assumption: "Mengurangi frekuensi dan durasi pintu terbuka selama operasional.",
          whyItSaves: "Udara hangat luar yang masuk saat pintu terbuka membuat kompresor bekerja lebih keras memulihkan suhu.",
          practicalSteps: [
            "Batasi waktu buka pintu maksimal 10-15 detik per akses.",
            "Buat jadwal teratur untuk memasukkan atau mengeluarkan barang.",
            "Pasang tirai plastik (strip curtain) pada pintu cold room."
          ],
          difficulty: "Mudah",
        });

        candidateActions.push({
          title: `Optimasi Pengaturan Suhu ${app.name}`,
          affectedApplianceName: app.name,
          actionType: "temperature_optimization",
          beforeKwh,
          afterKwh: Math.round(beforeKwh * 0.95), // 5% saving
          savedKwh: Math.round(beforeKwh * 0.05),
          estimatedSavingIdr: Math.round(beforeKwh * 0.05 * effectiveTariff),
          contributionToTargetPercent: 0,
          assumption: "Suhu disetel pada standar optimal produk, bukan suhu terdingin ekstrim.",
          whyItSaves: "Setiap kenaikan setpoint suhu sebesar 1°C dapat menghemat konsumsi energi chiller/freezer sekitar 2-3%.",
          practicalSteps: [
            "Setel suhu freezer beku pada kisaran -18°C hingga -20°C (bukan -25°C jika tidak diperlukan).",
            "Gunakan termometer eksternal mandiri untuk memverifikasi suhu aktual di dalam.",
            "Pastikan sensor suhu bersih dari tumpukan bunga es."
          ],
          difficulty: "Sedang",
        });

        candidateActions.push({
          title: `Pembersihan & Aliran Udara Kondensor ${app.name}`,
          affectedApplianceName: app.name,
          actionType: "airflow_improvement",
          beforeKwh,
          afterKwh: Math.round(beforeKwh * 0.93), // 7% saving
          savedKwh: Math.round(beforeKwh * 0.07),
          estimatedSavingIdr: Math.round(beforeKwh * 0.07 * effectiveTariff),
          contributionToTargetPercent: 0,
          assumption: "Kondensor dibersihkan dari debu dan diberi jarak udara minimal 15-20 cm dari dinding.",
          whyItSaves: "Kondensor yang bersih membuang panas lebih cepat, sehingga siklus pendinginan berjalan lebih pendek.",
          practicalSteps: [
            "Bersihkan sirip-sirip kondensor dari debu dengan kuas atau vacuum setiap bulan.",
            "Pastikan tidak ada barang yang menumpuk di sekitar unit kompresor luar.",
            "Beri jarak ventilasi yang cukup agar udara panas kondensor bebas keluar."
          ],
          difficulty: "Sedang",
        });
      } else {
        // Cold equipment on FNB/Retail (e.g. Showcase, Refrigerator)
        candidateActions.push({
          title: `Disiplin Pintu Showcase/Chiller ${app.name}`,
          affectedApplianceName: app.name,
          actionType: "door_discipline",
          beforeKwh,
          afterKwh: Math.round(beforeKwh * 0.90), // 10% saving
          savedKwh: Math.round(beforeKwh * 0.10),
          estimatedSavingIdr: Math.round(beforeKwh * 0.10 * effectiveTariff),
          contributionToTargetPercent: 0,
          assumption: "Pintu tertutup rapat segera setelah pengambilan produk oleh staf atau konsumen.",
          whyItSaves: "Mengurangi hilangnya udara dingin secara drastis sehingga kompresor showcase jarang menyala.",
          practicalSteps: [
            "Pasang stiker pengingat 'Tutup Rapat' di kaca showcase.",
            "Pastikan sistem penutup pintu otomatis (self-closing mechanism) berfungsi dengan baik.",
            "Matikan lampu showcase di malam hari saat toko tutup jika memungkinkan."
          ],
          difficulty: "Mudah",
        });
      }
    } else if (category === "ac") {
      // AC Optimization
      candidateActions.push({
        title: `Optimasi Suhu AC ${app.name} ke 24-25°C`,
        affectedApplianceName: app.name,
        actionType: "ac_temperature",
        beforeKwh,
        afterKwh: Math.round(beforeKwh * 0.90), // 10% saving
        savedKwh: Math.round(beforeKwh * 0.10),
        estimatedSavingIdr: Math.round(beforeKwh * 0.10 * effectiveTariff),
        contributionToTargetPercent: 0,
        assumption: "Suhu AC diatur ke 24-25°C dari sebelumnya 18-20°C.",
        whyItSaves: "Kompresor AC bekerja jauh lebih ringan saat target suhu ruangan mendekati suhu udara luar.",
        practicalSteps: [
          "Setel remote kontrol AC pada suhu 24°C atau 25°C.",
          "Gunakan mode 'Cool' dengan fan speed sedang, hindari menyetel fan penuh.",
          "Gunakan tirai pada jendela untuk menghalangi panas matahari masuk langsung."
        ],
        difficulty: "Mudah",
      });

      if (app.dailyUsageHours > 4) {
        candidateActions.push({
          title: `Optimasi Jadwal Nyala-Matikan AC ${app.name}`,
          affectedApplianceName: app.name,
          actionType: "ac_schedule",
          beforeKwh,
          afterKwh: Math.round(beforeKwh * ( (app.dailyUsageHours - 1) / app.dailyUsageHours )), // reduce 1 hour
          savedKwh: Math.round(beforeKwh / app.dailyUsageHours),
          estimatedSavingIdr: Math.round((beforeKwh / app.dailyUsageHours) * effectiveTariff),
          contributionToTargetPercent: 0,
          assumption: "Mengurangi durasi nyala AC selama 1 jam sehari.",
          whyItSaves: "Pemotongan jam pakai langsung memangkas penggunaan kWh harian secara linear.",
          practicalSteps: [
            "Matikan AC 30 menit sebelum jam tutup toko/kantor selesai.",
            "Gunakan fitur timer otomatis agar AC menyala sesaat sebelum jam buka saja.",
            "Gunakan ventilasi udara alami di pagi hari jika udara masih sejuk."
          ],
          difficulty: "Mudah",
        });
      }
    } else if (category === "lighting") {
      // Lighting Optimization
      candidateActions.push({
        title: `Optimalisasi Jadwal Penerangan ${app.name}`,
        affectedApplianceName: app.name,
        actionType: "lighting_schedule",
        beforeKwh,
        afterKwh: Math.round(beforeKwh * 0.80), // 20% saving (reduces 20% hours or counts)
        savedKwh: Math.round(beforeKwh * 0.20),
        estimatedSavingIdr: Math.round(beforeKwh * 0.20 * effectiveTariff),
        contributionToTargetPercent: 0,
        assumption: "Lampu dimatikan di area kosong dan luar setelah jam operasional berakhir.",
        whyItSaves: "Menghindari pemborosan energi saat tidak ada aktivitas usaha.",
        practicalSteps: [
          "Matikan lampu papan nama/etalase tepat setelah jam tutup menggunakan timer.",
          "Gunakan sensor gerak (motion sensor) untuk toilet atau gudang penyimpanan.",
          "Maksimalkan pencahayaan alami jendela di siang hari."
        ],
        difficulty: "Mudah",
      });
    } else if (category === "laundry_heat" && businessType === "LAUNDRY") {
      // Laundry specific heating (Dryer/Boiler)
      candidateActions.push({
        title: `Optimasi Kapasitas Batch Pengeringan ${app.name}`,
        affectedApplianceName: app.name,
        actionType: "batch_optimization",
        beforeKwh,
        afterKwh: Math.round(beforeKwh * 0.85), // 15% saving
        savedKwh: Math.round(beforeKwh * 0.15),
        estimatedSavingIdr: Math.round(beforeKwh * 0.15 * effectiveTariff),
        contributionToTargetPercent: 0,
        assumption: "Mengeringkan cucian dengan kapasitas optimal (tidak setengah kosong / overload).",
        whyItSaves: "Jumlah siklus pengeringan berkurang karena pengisian mesin dimaksimalkan per jalan.",
        practicalSteps: [
          "Timbang berat cucian sebelum dimasukkan ke dalam mesin pengering.",
          "Gabungkan beberapa cucian sejenis hingga mencapai 80% kapasitas mesin.",
          "Lakukan pemisahan jenis bahan tebal dan tipis sebelum dikeringkan."
        ],
        difficulty: "Sedang",
      });

      candidateActions.push({
        title: `Pengurangan Jam Kosong Mesin Pengering ${app.name}`,
        affectedApplianceName: app.name,
        actionType: "reduce_usage_hours",
        beforeKwh,
        afterKwh: Math.round(beforeKwh * ( (app.dailyUsageHours - 1) / app.dailyUsageHours )), // reduce 1 hour/day
        savedKwh: Math.round(beforeKwh / app.dailyUsageHours),
        estimatedSavingIdr: Math.round((beforeKwh / app.dailyUsageHours) * effectiveTariff),
        contributionToTargetPercent: 0,
        assumption: "Mengurangi penggunaan mesin pengering selama 1 jam per hari melalui efisiensi operasional.",
        whyItSaves: "Penurunan langsung pada jam operasional mesin berdaya besar menurunkan konsumsi kWh harian secara linear.",
        practicalSteps: [
          "Gunakan mesin peras (spin extractor) dengan kecepatan tinggi agar cucian lebih kesat sebelum masuk pengering.",
          "Hindari membuka pintu dryer di tengah siklus karena membuang panas instan.",
          "Bersihkan saringan lint filter setiap 2-3 siklus pemakaian agar aliran udara optimal."
        ],
        difficulty: "Sedang",
      });
    } else {
      // Other appliances or generic optimization
      candidateActions.push({
        title: `Kurangi Jam Pakai Standby ${app.name}`,
        affectedApplianceName: app.name,
        actionType: "standby_reduction",
        beforeKwh,
        afterKwh: Math.round(beforeKwh * 0.90), // 10% saving
        savedKwh: Math.round(beforeKwh * 0.10),
        estimatedSavingIdr: Math.round(beforeKwh * 0.10 * effectiveTariff),
        contributionToTargetPercent: 0,
        assumption: "Mematikan colokan utama alat saat toko/usaha tutup agar tidak ada daya standby.",
        whyItSaves: "Banyak alat elektronik tetap mengonsumsi daya 5-10 watt meskipun dalam keadaan mati (standby mode).",
        practicalSteps: [
          "Gunakan stop kontak bersaklar untuk memudahkan mematikan beberapa alat sekaligus.",
          "Cabut charger, dispenser, dan adapter komputer di akhir hari operasional.",
          "Terapkan checklist SOP penutupan usaha bagi karyawan."
        ],
        difficulty: "Mudah",
      });
    }
  });

  // Sort candidate actions by savings IDR descending
  candidateActions.sort((a, b) => b.estimatedSavingIdr - a.estimatedSavingIdr);

  // Select actions up to the target saving (plus a little margin) or select all if target is high
  const selectedActions: SavingAction[] = [];
  let currentAccumulatedSavingIdr = 0;

  for (const action of candidateActions) {
    selectedActions.push(action);
    currentAccumulatedSavingIdr += action.estimatedSavingIdr;
    
    // Stop if we have met/exceeded the target saving IDR, unless we want to show a reasonable subset
    if (currentAccumulatedSavingIdr >= targetSavingIdr && selectedActions.length >= 2) {
      break;
    }
  }

  // Calculate contributions based on targetSavingIdr
  selectedActions.forEach((act) => {
    act.contributionToTargetPercent = targetSavingIdr > 0 
      ? Math.min(100, Math.round((act.estimatedSavingIdr / targetSavingIdr) * 100))
      : 0;
  });

  const totalActionSavingIdr = selectedActions.reduce((sum, act) => sum + act.estimatedSavingIdr, 0);
  const coveragePercent = targetSavingIdr > 0 
    ? Math.round((totalActionSavingIdr / targetSavingIdr) * 100)
    : 0;

  // Realistic if coverage is >= 95%
  const isRealistic = totalActionSavingIdr >= targetSavingIdr || coveragePercent >= 90;

  return {
    targetSavingIdr,
    effectiveTariff,
    actions: selectedActions,
    totalActionSavingIdr,
    isRealistic,
    coveragePercent,
    isTariffEstimated,
  };
}
