"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Zap, Store, ArrowRight, ArrowLeft, Plus, Trash2, Loader2, Sparkles, Check, X } from "lucide-react";
import { BusinessType } from "@prisma/client";
import { createOnboardingBusiness } from "@/app/actions/business";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/common";

const businessSchema = z.object({
  name: z.string().min(3, "Nama usaha minimal 3 karakter"),
  type: z.nativeEnum(BusinessType, {
    message: "Pilih jenis usaha yang valid",
  }),
  address: z.string().min(5, "Alamat minimal 5 karakter"),
  powerVA: z.number().min(450, "Daya listrik minimal 450 VA"),
  operatingHours: z.string().min(2, "Jam operasional wajib diisi (misal: 08:00 - 20:00)"),
  appliances: z.array(
    z.object({
      name: z.string().min(2, "Nama alat minimal 2 karakter"),
      powerWatt: z.number().min(1, "Daya watt minimal 1 W"),
      quantity: z.number().min(1, "Jumlah minimal 1"),
      dailyUsageHours: z.number().min(0.1, "Lama pemakaian minimal 0.1 jam").max(24, "Maksimal 24 jam"),
    })
  ).min(1, "Tambahkan minimal 1 peralatan elektronik utama"),
});

type BusinessFormData = {
  name: string;
  type: BusinessType;
  address: string;
  powerVA: number;
  operatingHours: string;
  appliances: {
    name: string;
    powerWatt: number;
    quantity: number;
    dailyUsageHours: number;
  }[];
};

const BUSINESS_TYPES = [
  { value: BusinessType.LAUNDRY, label: "Jasa Laundry / Cuci Pakaian" },
  { value: BusinessType.FNB, label: "Makanan & Minuman (F&B / Warung / Cafe)" },
  { value: BusinessType.RETAIL, label: "Ritel (Toko Kelontong / Minimarket)" },
  { value: BusinessType.MANUFACTURE, label: "Manufaktur / Produksi Skala Kecil" },
  { value: BusinessType.COLD_STORAGE, label: "Cold Storage / Pembekuan" },
  { value: BusinessType.OTHER, label: "Usaha Lainnya" },
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
    { name: "Lampu Utama", powerWatt: 50, quantity: 4, dailyUsageHours: 10 },
  ],
};

export default function TambahUsahaPage() {
  const router = useRouter();
  const { toast } = useToast();
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
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: "",
      type: undefined,
      address: "",
      powerVA: 1300,
      operatingHours: "08:00 - 20:00",
      appliances: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "appliances",
  });

  const selectedType = watch("type");

  const fillSuggestedAppliances = () => {
    if (selectedType && SUGGESTED_APPLIANCES[selectedType]) {
      replace(SUGGESTED_APPLIANCES[selectedType]);
    }
  };

  const handleNext = async () => {
    setErrorMsg("");
    let isValid = false;

    if (step === 1) {
      isValid = await trigger(["name", "type", "address", "powerVA", "operatingHours"]);
      if (isValid) {
        setStep(2);
        // Auto-fill suggested appliances if empty
        if (fields.length === 0 && selectedType) {
          replace(SUGGESTED_APPLIANCES[selectedType] || []);
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

  const onSubmit = async (data: BusinessFormData) => {
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const res = await createOnboardingBusiness(data);
      if (res.success) {
        toast("Usaha baru berhasil didaftarkan!", "success");
        router.push("/dashboard");
        router.refresh();
      } else {
        setErrorMsg(res.error || "Gagal membuat profil usaha.");
      }
    } catch (e: any) {
      setErrorMsg("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Daftarkan Usaha Baru"
        subtitle="Tambahkan cabang atau lini bisnis baru Anda ke ekosistem WattWise AI untuk pemantauan terpusat."
      />

      <div className="card mt-6 space-y-6">
        {/* Progress Tracker Bar */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>
              {step === 1 && "Langkah 1: Profil Usaha Baru"}
              {step === 2 && "Langkah 2: Daftar Peralatan Listrik Utama"}
              {step === 3 && "Langkah 3: Konfirmasi & Simpan"}
            </span>
            <span>Langkah {step} dari 3 • {Math.round((step / 3) * 100)}% Selesai</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-green transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex gap-2">
            <span className="font-semibold">Galat:</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-brand-ink flex items-center gap-2">
                  <Store className="h-5 w-5 text-brand-blue" />
                  Profil Cabang / Usaha Baru
                </h2>
                <p className="text-xs text-slate-500">
                  Lengkapi data profil agar algoritma kami dapat menyesuaikan rekomendasi hemat listrik.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Usaha / Toko
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    placeholder="Contoh: Laundry Berkah Cabang 2"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green transition-all"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Usaha
                  </label>
                  <select
                    {...register("type")}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green bg-white transition-all"
                  >
                    <option value="">Pilih Jenis Usaha...</option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Lengkap Usaha
                  </label>
                  <input
                    type="text"
                    {...register("address")}
                    placeholder="Contoh: Jl. Sudirman No. 88, Purwokerto"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-green transition-all"
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
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
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100 hover:bg-rose-50 px-4 py-2.5 rounded-xl"
                >
                  <X className="h-4 w-4" />
                  Batal
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
                  <h2 className="text-base font-bold text-brand-ink flex items-center gap-2">
                    <Zap className="h-5 w-5 text-brand-green" />
                    Peralatan Elektronik Utama
                  </h2>
                  <p className="text-xs text-slate-500">
                    Masukkan peralatan dengan konsumsi listrik terbesar pada unit usaha ini.
                  </p>
                </div>
                {selectedType && (
                  <button
                    type="button"
                    onClick={fillSuggestedAppliances}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-blue bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-all"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Rekomendasi Template
                  </button>
                )}
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
                        placeholder="Mesin Cuci, Freezer, AC..."
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
                <h2 className="text-base font-bold text-brand-ink flex items-center gap-2">
                  <Check className="h-5 w-5 text-brand-green" />
                  Konfirmasi Profil Usaha Baru
                </h2>
                <p className="text-xs text-slate-500">
                  Periksa kembali detail data usaha baru Anda sebelum menyimpannya ke database.
                </p>
              </div>

              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-y-2.5 border-b border-slate-100 pb-3">
                  <span className="text-slate-500 text-xs">Nama Usaha:</span>
                  <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("name")}</span>

                  <span className="text-slate-500 text-xs">Jenis Usaha:</span>
                  <span className="col-span-2 font-semibold text-brand-ink text-right">
                    {BUSINESS_TYPES.find((t) => t.value === selectedType)?.label || selectedType}
                  </span>

                  <span className="text-slate-500 text-xs">Alamat:</span>
                  <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("address")}</span>

                  <span className="text-slate-500 text-xs">Daya Listrik:</span>
                  <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("powerVA")} VA</span>

                  <span className="text-slate-500 text-xs">Jam Operasional:</span>
                  <span className="col-span-2 font-semibold text-brand-ink text-right">{watch("operatingHours")}</span>
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
                      Simpan &amp; Aktifkan Usaha
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
