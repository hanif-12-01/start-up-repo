"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Zap, Store, ArrowRight, ArrowLeft, Plus, Trash2, LogOut, Loader2, Sparkles, Check } from "lucide-react";
import { BusinessType } from "@prisma/client";
import { createOnboardingBusiness } from "@/app/actions/business";
import { cn } from "@/lib/utils";

const onboardingSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  type: z.nativeEnum(BusinessType, {
    message: "Pilih jenis/kategori yang valid",
  }),
  mode: z.string(),
  revenueRange: z.string().optional(),
  address: z.string().min(5, "Alamat minimal 5 karakter"),
  powerVA: z.number().min(450, "Daya listrik minimal 450 VA"),
  operatingHours: z.string().optional(),
  operatingDays: z.number().optional(),
  numberOfRooms: z.number().optional(),
  numberOfUnits: z.number().optional(),
  sistemListrikKos: z.string().optional(),
  prabayarPascabayar: z.string().optional(),
  rataRataTagihan: z.number().optional(),
  appliances: z.array(
    z.object({
      name: z.string().min(2, "Nama alat minimal 2 karakter"),
      powerWatt: z.number().min(1, "Daya watt minimal 1 W"),
      quantity: z.number().min(1, "Jumlah minimal 1"),
      dailyUsageHours: z.number().min(0.1, "Lama pemakaian minimal 0.1 jam").max(24, "Maksimal 24 jam"),
    })
  ).min(1, "Tambahkan minimal 1 peralatan elektronik utama"),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const BUSINESS_TYPES = [
  { value: BusinessType.LAUNDRY, label: "Jasa Laundry / Cuci Pakaian" },
  { value: BusinessType.FNB, label: "Makanan & Minuman (F&B / Warung / Cafe)" },
  { value: BusinessType.RETAIL, label: "Ritel (Toko Kelontong / Minimarket)" },
  { value: BusinessType.MANUFACTURE, label: "Manufaktur / Produksi Skala Kecil" },
  { value: BusinessType.COLD_STORAGE, label: "Cold Storage / Pembekuan" },
  { value: BusinessType.OTHER, label: "Usaha Lainnya / Kos-kosan / Properti" },
];

const REVENUE_RANGES = [
  { value: "< Rp5jt", label: "< Rp 5 Juta / bulan" },
  { value: "Rp5jt-15jt", label: "Rp 5 Juta – Rp 15 Juta / bulan" },
  { value: "Rp15jt-50jt", label: "Rp 15 Juta – Rp 50 Juta / bulan" },
  { value: "Rp50jt-150jt", label: "Rp 50 Juta – Rp 150 Juta / bulan" },
  { value: "> Rp150jt", label: "> Rp 150 Juta / bulan" },
  { value: "SKIP", label: "Belum ingin mengisi / Lewati" },
];

const SUGGESTED_APPLIANCES: Record<BusinessType, { name: string; powerWatt: number; quantity: number; dailyUsageHours: number }[]> = {
  [BusinessType.LAUNDRY]: [
    { name: "Mesin Cuci", powerWatt: 350, quantity: 2, dailyUsageHours: 8 },
    { name: "Mesin Pengering (Dryer)", powerWatt: 2200, quantity: 1, dailyUsageHours: 6 },
    { name: "Setrika Listrik", powerWatt: 1000, quantity: 2, dailyUsageHours: 5 },
  ],
  [BusinessType.FNB]: [
    { name: "Kulkas Showcase / Chiller", powerWatt: 250, quantity: 1, dailyUsageHours: 24 },
    { name: "Blender", powerWatt: 300, quantity: 1, dailyUsageHours: 2 },
    { name: "Rice Cooker", powerWatt: 400, quantity: 1, dailyUsageHours: 12 },
  ],
  [BusinessType.RETAIL]: [
    { name: "Kulkas Minuman", powerWatt: 300, quantity: 2, dailyUsageHours: 24 },
    { name: "AC Ruangan", powerWatt: 750, quantity: 1, dailyUsageHours: 12 },
    { name: "Lampu Toko", powerWatt: 100, quantity: 1, dailyUsageHours: 14 },
  ],
  [BusinessType.COLD_STORAGE]: [
    { name: "Deep Freezer", powerWatt: 450, quantity: 2, dailyUsageHours: 24 },
    { name: "Air Conditioner (AC)", powerWatt: 1000, quantity: 1, dailyUsageHours: 24 },
  ],
  [BusinessType.MANUFACTURE]: [
    { name: "Mesin Jahit Listrik", powerWatt: 250, quantity: 3, dailyUsageHours: 8 },
    { name: "Kompresor Angin", powerWatt: 750, quantity: 1, dailyUsageHours: 4 },
  ],
  [BusinessType.OTHER]: [
    { name: "AC Kamar Kos", powerWatt: 750, quantity: 8, dailyUsageHours: 9 },
    { name: "Pompa Air", powerWatt: 350, quantity: 1, dailyUsageHours: 3 },
    { name: "Lampu Koridor", powerWatt: 15, quantity: 6, dailyUsageHours: 12 },
  ],
};

export default function OnboardingPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      type: BusinessType.OTHER,
      mode: "KOS_PROPERTY", // Default mode set to Kos/Properti
      revenueRange: "SKIP",
      address: "",
      powerVA: 2200,
      operatingHours: "08:00 - 20:00",
      operatingDays: 7,
      numberOfRooms: 10,
      numberOfUnits: 8,
      sistemListrikKos: "Meteran Terpusat",
      prabayarPascabayar: "Pascabayar (Tagihan)",
      rataRataTagihan: 1200000,
      appliances: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "appliances",
  });

  const selectedType = watch("type");

  const fillSuggestedAppliances = () => {
    const finalType = watch("mode") === "KOS_PROPERTY" ? BusinessType.OTHER : selectedType;
    if (finalType && SUGGESTED_APPLIANCES[finalType]) {
      replace(SUGGESTED_APPLIANCES[finalType]);
    }
  };

  const handleNext = async () => {
    setErrorMsg("");
    let isValid = false;

    if (step === 1) {
      isValid = await trigger(["name", "type", "address", "powerVA"]);
      if (isValid) {
        setStep(2);
        // Auto-fill suggested appliances if empty
        if (fields.length === 0) {
          const finalType = watch("mode") === "KOS_PROPERTY" ? BusinessType.OTHER : selectedType;
          if (finalType) {
            replace(SUGGESTED_APPLIANCES[finalType] || []);
          }
        }
      }
    } else if (step === 2) {
      isValid = await trigger("appliances");
      if (isValid) {
        setStep(3);
      }
    }
  };

  const handleBack = () => {
    setErrorMsg("");
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      // Process fields based on mode
      let finalOperatingHours = "";
      if (data.mode === "KOS_PROPERTY") {
        finalOperatingHours = `Sistem: ${data.sistemListrikKos || "Meteran Terpusat"} | Tipe: ${data.prabayarPascabayar || "Pascabayar"}${data.operatingHours ? ` | Pola: ${data.operatingHours}` : ""}`;
      } else {
        finalOperatingHours = `${data.operatingHours || "08:00 - 20:00"} | Hari: ${data.operatingDays || 7} hari/minggu | Tipe: ${data.prabayarPascabayar || "Pascabayar"}`;
      }

      const payload = {
        ...data,
        type: data.mode === "KOS_PROPERTY" ? BusinessType.OTHER : data.type,
        operatingHours: finalOperatingHours,
        operatingDays: data.mode === "KOS_PROPERTY" ? 30 : Number(data.operatingDays || 30),
      };

      const res = await createOnboardingBusiness(payload);
      if (res.success) {
        await updateSession({ hasBusiness: true });
        router.replace("/dashboard");
        router.refresh();
      } else {
        setErrorMsg(res.error || "Gagal membuat profil.");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-soft p-8 border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green text-white">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-ink">WattWise AI</h1>
              <p className="text-xs text-slate-500">Langkah Awal Efisiensi Energi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Langkah {step} dari 3
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-all border border-slate-200 hover:border-red-100 bg-white hover:bg-red-50/50 py-1 px-2.5 rounded-lg shadow-sm"
              title="Keluar dari Akun"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>
              {step === 1 && "Profil Bisnis & Properti"}
              {step === 2 && "Daftar Peralatan Listrik"}
              {step === 3 && "Konfirmasi Profil"}
            </span>
            <span>{Math.round((step / 3) * 100)}% Selesai</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-green transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex gap-2">
            <span className="font-semibold">Galat:</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-brand-ink flex items-center gap-2">
                  <Zap className="h-5 w-5 text-brand-green" />
                  Mulai dari data listrik paling sederhana
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih apakah Anda mengelola kos/properti atau usaha. WattWise akan menyesuaikan pertanyaan agar mudah diisi.
                </p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">
                  Tidak perlu sempurna. Data ini bisa diperbarui nanti.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Mode Penggunaan (Prioritas Kos &amp; Properti)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                    {/* Prioritize Kos by placing it first */}
                    <label className={`flex flex-col gap-2 p-4 border rounded-2xl cursor-pointer transition-all ${watch("mode") === "KOS_PROPERTY" ? "border-brand-green bg-emerald-50/20 text-brand-ink shadow-sm" : "border-slate-200 text-slate-650 bg-white hover:border-slate-300"}`}>
                      <input
                        type="radio"
                        value="KOS_PROPERTY"
                        {...register("mode")}
                        className="sr-only"
                        onChange={() => {
                          setValue("mode", "KOS_PROPERTY");
                          setValue("type", BusinessType.OTHER);
                          setValue("operatingHours", ""); // Clear for custom pola pemakaian
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <span className={cn("w-4 h-4 rounded-full border flex items-center justify-center", watch("mode") === "KOS_PROPERTY" ? "border-brand-green" : "border-slate-300")}>
                          {watch("mode") === "KOS_PROPERTY" && <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />}
                        </span>
                        <span className="font-extrabold text-sm text-slate-900">Kos / Properti</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium pl-6 leading-relaxed">
                        Untuk kos-kosan, kontrakan, ruko, atau properti kecil.
                      </p>
                    </label>

                    <label className={`flex flex-col gap-2 p-4 border rounded-2xl cursor-pointer transition-all ${watch("mode") === "UMKM" ? "border-brand-green bg-emerald-50/20 text-brand-ink shadow-sm" : "border-slate-200 text-slate-650 bg-white hover:border-slate-300"}`}>
                      <input
                        type="radio"
                        value="UMKM"
                        {...register("mode")}
                        className="sr-only"
                        onChange={() => {
                          setValue("mode", "UMKM");
                          setValue("type", BusinessType.LAUNDRY); // Reset to first UMKM type
                          setValue("operatingHours", "08:00 - 20:00");
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <span className={cn("w-4 h-4 rounded-full border flex items-center justify-center", watch("mode") === "UMKM" ? "border-brand-green" : "border-slate-300")}>
                          {watch("mode") === "UMKM" && <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />}
                        </span>
                        <span className="font-extrabold text-sm text-slate-900">UMKM Padat Energi</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium pl-6 leading-relaxed">
                        Untuk laundry, warung, frozen food, minimarket, atau usaha yang memakai listrik cukup besar.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Common Name field */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {watch("mode") === "KOS_PROPERTY" ? "Nama Kos / Properti" : "Nama Usaha"}
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    placeholder={watch("mode") === "KOS_PROPERTY" ? "Contoh: Kos Sederhana Purwokerto" : "Contoh: Laundry Berkah"}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green transition-all"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                {/* Mode Dependent Fields */}
                {watch("mode") === "KOS_PROPERTY" ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jumlah Kamar
                      </label>
                      <input
                        type="number"
                        {...register("numberOfRooms", { valueAsNumber: true })}
                        placeholder="10"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kamar Terisi (Tersewa)
                      </label>
                      <input
                        type="number"
                        {...register("numberOfUnits", { valueAsNumber: true })}
                        placeholder="8"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Sistem Listrik Kos
                      </label>
                      <select
                        {...register("sistemListrikKos")}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      >
                        <option value="Meteran Terpusat">Meteran Terpusat / Satu Meteran Utama</option>
                        <option value="Meteran Per Kamar">Meteran Per Kamar (Sub-Meteran)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Daya Listrik Terpasang (VA)
                      </label>
                      <select
                        {...register("powerVA", { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      >
                        <option value="900">900 VA</option>
                        <option value="1300">1300 VA</option>
                        <option value="2200">2200 VA</option>
                        <option value="3500">3500 VA</option>
                        <option value="4400">4400 VA</option>
                        <option value="5500">5500 VA</option>
                        <option value="6600">6600 VA</option>
                        <option value="11000">11000 VA atau lebih</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Metode Pembayaran Listrik
                      </label>
                      <select
                        {...register("prabayarPascabayar")}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      >
                        <option value="Prabayar (Token)">Prabayar (Token / Beli Pulsa)</option>
                        <option value="Pascabayar (Tagihan)">Pascabayar (Tagihan Bulanan)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rata-rata Tagihan Listrik Bulanan (Rp)
                      </label>
                      <input
                        type="number"
                        {...register("rataRataTagihan", { valueAsNumber: true })}
                        placeholder="1200000"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green transition-all"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pola Pemakaian Listrik
                      </label>
                      <input
                        type="text"
                        {...register("operatingHours")}
                        placeholder="Contoh: lampu koridor 18:00–05:00, pompa air pagi/sore"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green transition-all"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Tidak perlu sempurna. Data ini bisa diperbarui nanti.</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pendapatan Sewa Bulanan
                      </label>
                      <select
                        {...register("revenueRange")}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      >
                        {REVENUE_RANGES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jenis Usaha
                      </label>
                      <select
                        {...register("type")}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      >
                        <option value="">Pilih Jenis Usaha...</option>
                        {BUSINESS_TYPES.filter(t => t.value !== BusinessType.OTHER).map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                        <option value={BusinessType.OTHER}>Lainnya</option>
                      </select>
                      {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Hari Operasional per Minggu
                      </label>
                      <select
                        {...register("operatingDays", { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      >
                        <option value="5">5 Hari</option>
                        <option value="6">6 Hari</option>
                        <option value="7">7 Hari (Setiap Hari)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jam Operasional per Hari
                      </label>
                      <input
                        type="text"
                        {...register("operatingHours")}
                        placeholder="Contoh: 08:00 - 20:00 (12 Jam)"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green transition-all"
                      />
                      {errors.operatingHours && <p className="text-red-500 text-xs mt-1">{errors.operatingHours.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Daya Listrik Terpasang (VA)
                      </label>
                      <select
                        {...register("powerVA", { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      >
                        <option value="450">450 VA</option>
                        <option value="900">900 VA</option>
                        <option value="1300">1300 VA</option>
                        <option value="2200">2200 VA</option>
                        <option value="3500">3500 VA</option>
                        <option value="4400">4400 VA</option>
                        <option value="5500">5500 VA</option>
                        <option value="6600">6600 VA</option>
                        <option value="11000">11000 VA atau lebih</option>
                      </select>
                      {errors.powerVA && <p className="text-red-500 text-xs mt-1">{errors.powerVA.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Metode Pembayaran Listrik
                      </label>
                      <select
                        {...register("prabayarPascabayar")}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      >
                        <option value="Prabayar (Token)">Prabayar (Token / Beli Pulsa)</option>
                        <option value="Pascabayar (Tagihan)">Pascabayar (Tagihan Bulanan)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rata-rata Tagihan Listrik Bulanan (Rp)
                      </label>
                      <input
                        type="number"
                        {...register("rataRataTagihan", { valueAsNumber: true })}
                        placeholder="1200000"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green transition-all"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Omzet / Pendapatan Bulanan
                      </label>
                      <select
                        {...register("revenueRange")}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      >
                        {REVENUE_RANGES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Common Address field */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {watch("mode") === "KOS_PROPERTY" ? "Alamat Properti" : "Alamat Usaha"}
                  </label>
                  <input
                    type="text"
                    {...register("address")}
                    placeholder="Contoh: Jl. Kampus No. 12, Purwokerto"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green transition-all"
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-600 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Ganti Akun / Log Out
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-xl bg-brand-green px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-greenDark transition-all"
                >
                  Lanjut ke Peralatan
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-brand-ink flex items-center gap-2">
                    <Zap className="h-5 w-5 text-brand-green" />
                    Peralatan Elektronik Utama
                  </h2>
                  <p className="text-xs text-slate-500">
                    Masukkan peralatan dengan konsumsi listrik terbesar di tempat Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fillSuggestedAppliances}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-blue bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Gunakan Template
                </button>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-end relative"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Nama Alat
                      </label>
                      <input
                        type="text"
                        {...register(`appliances.${index}.name` as const)}
                        placeholder="AC Kamar, Freezer, Pompa Air..."
                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      />
                      {errors.appliances?.[index]?.name && (
                        <p className="text-red-500 text-[10px] mt-0.5">{errors.appliances[index]?.name?.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Daya (Watt)
                      </label>
                      <input
                        type="number"
                        {...register(`appliances.${index}.powerWatt` as const, { valueAsNumber: true })}
                        placeholder="Watt"
                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      />
                      {errors.appliances?.[index]?.powerWatt && (
                        <p className="text-red-500 text-[10px] mt-0.5">{errors.appliances[index]?.powerWatt?.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Jumlah (Unit)
                      </label>
                      <input
                        type="number"
                        {...register(`appliances.${index}.quantity` as const, { valueAsNumber: true })}
                        placeholder="Unit"
                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      />
                      {errors.appliances?.[index]?.quantity && (
                        <p className="text-red-500 text-[10px] mt-0.5">{errors.appliances[index]?.quantity?.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Durasi (Jam/Hari)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        {...register(`appliances.${index}.dailyUsageHours` as const, { valueAsNumber: true })}
                        placeholder="Jam"
                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                      />
                      {errors.appliances?.[index]?.dailyUsageHours && (
                        <p className="text-red-500 text-[10px] mt-0.5">{errors.appliances[index]?.dailyUsageHours?.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-1 flex justify-center pb-0.5">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Hapus"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {errors.appliances && !Array.isArray(errors.appliances) && (
                <p className="text-red-500 text-xs">{errors.appliances.message}</p>
              )}

              <button
                type="button"
                onClick={() => append({ name: "", powerWatt: 100, quantity: 1, dailyUsageHours: 5 })}
                className="w-full py-2.5 border border-dashed border-slate-300 hover:border-brand-green text-slate-500 hover:text-brand-green text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all bg-white"
              >
                <Plus className="h-4 w-4" />
                Tambah Peralatan Elektronik Lain
              </button>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-ink transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-xl bg-brand-green px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-greenDark transition-all"
                >
                  Lanjut ke Ringkasan
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-brand-ink flex items-center gap-2">
                  <Check className="h-5 w-5 text-brand-green" />
                  Konfirmasi Profil
                </h2>
                <p className="text-xs text-slate-500">
                  Periksa kembali profil bisnis / properti Anda sebelum menyimpan.
                </p>
              </div>

              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-y-2.5 border-b border-slate-100 pb-3">
                  <span className="text-slate-500 text-xs">Mode Usaha:</span>
                  <span className="col-span-2 font-semibold text-brand-ink text-right">
                    {watch("mode") === "KOS_PROPERTY" ? "Kos / Properti Sewa" : "UMKM / Usaha"}
                  </span>

                  <span className="text-slate-500 text-xs">Nama:</span>
                  <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("name")}</span>

                  {watch("mode") === "KOS_PROPERTY" ? (
                    <>
                      <span className="text-slate-500 text-xs">Jumlah Kamar:</span>
                      <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("numberOfRooms")} Kamar</span>
                      
                      <span className="text-slate-500 text-xs">Kamar Terisi:</span>
                      <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("numberOfUnits")} Kamar</span>

                      <span className="text-slate-500 text-xs">Sistem Listrik:</span>
                      <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("sistemListrikKos")}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 text-xs">Jenis Usaha:</span>
                      <span className="col-span-2 font-semibold text-brand-ink text-right">
                        {BUSINESS_TYPES.find((t) => t.value === selectedType)?.label || selectedType}
                      </span>

                      <span className="text-slate-500 text-xs">Hari Operasional:</span>
                      <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("operatingDays")} hari/minggu</span>
                    </>
                  )}

                  <span className="text-slate-500 text-xs">Estimasi Pendapatan:</span>
                  <span className="col-span-2 font-semibold text-brand-ink text-right">
                    {REVENUE_RANGES.find((r) => r.value === watch("revenueRange"))?.label || "Lewati"}
                  </span>

                  <span className="text-slate-500 text-xs">Alamat:</span>
                  <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("address")}</span>

                  <span className="text-slate-500 text-xs">Daya Listrik:</span>
                  <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("powerVA")} VA</span>

                  {watch("mode") === "KOS_PROPERTY" ? (
                    <>
                      <span className="text-slate-500 text-xs">Pola Pemakaian Listrik:</span>
                      <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("operatingHours") || "-"}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 text-xs">Jam Operasional:</span>
                      <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("operatingHours")}</span>
                    </>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-brand-ink text-xs mb-2">Peralatan Terdaftar ({fields.length}):</h4>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {watch("appliances")?.map((app, i) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-100/50 last:border-0">
                        <span className="text-slate-600">{app.name} ({app.quantity} unit)</span>
                        <span className="font-semibold text-brand-ink">{app.powerWatt} W • {app.dailyUsageHours} jam/hari</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-ink transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-brand-green px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-greenDark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      Simpan &amp; Masuk Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}