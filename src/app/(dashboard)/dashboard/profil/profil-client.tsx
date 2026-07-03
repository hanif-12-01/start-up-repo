"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Edit3, HelpCircle, MapPin, Save, Store, User, Zap, Loader2, Briefcase, Plus, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/common";
import { useToast } from "@/components/ui/toast";
import { updateBusinessProfile, switchActiveBusinessAction } from "@/app/actions/business";
import { BusinessType } from "@prisma/client";

const BUSINESS_TYPES = [
  { value: BusinessType.LAUNDRY, label: "Jasa Laundry / Cuci Pakaian" },
  { value: BusinessType.FNB, label: "Makanan & Minuman (F&B / Warung / Cafe)" },
  { value: BusinessType.RETAIL, label: "Ritel (Toko Kelontong / Minimarket)" },
  { value: BusinessType.MANUFACTURE, label: "Manufaktur / Produksi Skala Kecil" },
  { value: BusinessType.COLD_STORAGE, label: "Cold Storage / Pembekuan" },
  { value: BusinessType.OTHER, label: "Usaha Lainnya" },
];

interface BusinessItem {
  id: string;
  name: string;
  type: BusinessType;
  address: string | null;
  powerVA: number | null;
  operatingHours: string | null;
}

interface ProfilClientProps {
  initialBusiness: {
    id: string;
    name: string;
    type: BusinessType;
    address: string | null;
    powerVA: number | null;
    operatingHours: string | null;
    appliances: {
      id: string;
      name: string;
      powerWatt: number;
      quantity: number;
      dailyUsageHours: number;
    }[];
  };
  allBusinesses?: BusinessItem[];
}

export default function ProfilClient({ initialBusiness, allBusinesses = [] }: ProfilClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [business, setBusiness] = useState(initialBusiness);

  const handleSwitchActive = async (businessId: string) => {
    if (businessId === business.id) return;
    try {
      const res = await switchActiveBusinessAction(businessId);
      if (res.success) {
        toast("Berhasil mengganti usaha aktif!");
        router.refresh();
      } else {
        toast(res.error || "Gagal mengganti usaha.", "error");
      }
    } catch (err) {
      toast("Terjadi kesalahan koneksi.", "error");
    }
  };
  
  const [formData, setFormData] = useState({
    name: business.name,
    type: business.type,
    address: business.address || "",
    powerVA: business.powerVA || 1300,
    operatingHours: business.operatingHours || "",
    peralatanListrik: business.appliances.map((a) => a.name).join(", "),
  });

  const [notifWa, setNotifWa] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  const getBusinessLabel = (type: BusinessType) => {
    return BUSINESS_TYPES.find((t) => t.value === type)?.label || type;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast("Nama usaha tidak boleh kosong.");
      return;
    }
    
    startTransition(async () => {
      const res = await updateBusinessProfile({
        name: formData.name,
        type: formData.type,
        address: formData.address,
        powerVA: Number(formData.powerVA),
        operatingHours: formData.operatingHours,
        peralatanListrik: formData.peralatanListrik,
      });

      if (res.success) {
        setBusiness({
          ...business,
          name: formData.name,
          type: formData.type,
          address: formData.address,
          powerVA: Number(formData.powerVA),
          operatingHours: formData.operatingHours,
          appliances: formData.peralatanListrik
            .split(",")
            .map((n) => n.trim())
            .filter((n) => n.length > 0)
            .map((n, idx) => ({
              id: `temp-${idx}`,
              name: n,
              powerWatt: 150,
              quantity: 1,
              dailyUsageHours: 6,
            })),
        });
        setEditing(false);
        toast("Profil usaha berhasil diperbarui.");
      } else {
        toast(res.error || "Gagal memperbarui profil.");
      }
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Profil Usaha"
        subtitle="Kelola data usaha agar prediksi tagihan dan saran hemat listrik lebih sesuai dengan kondisi nyata."
      />

      <div className="grid gap-6">
        <section className="card">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-green text-2xl font-bold text-white shadow-soft">
                {getInitials(business.name)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-brand-ink">{business.name}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Store className="h-4 w-4" />
                  {getBusinessLabel(business.type)}
                </p>
              </div>
            </div>

            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-outline shrink-0">
                <Edit3 className="h-4 w-4" />
                Edit Profil
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nama Usaha</label>
                  <input
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Jenis Usaha</label>
                  <select
                    className="select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as BusinessType })}
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Lokasi</label>
                  <input
                    className="input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Daya Listrik (VA)</label>
                  <select
                    className="select"
                    value={formData.powerVA}
                    onChange={(e) => setFormData({ ...formData, powerVA: Number(e.target.value) })}
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
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Jam Operasional</label>
                  <input
                    className="input"
                    value={formData.operatingHours}
                    onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                    placeholder="Contoh: 08:00 - 20:00 (12 Jam)"
                  />
                </div>
              </div>

              <div>
                <label className="label">Peralatan Listrik Utama</label>
                <textarea
                  rows={3}
                  className="input resize-none py-3"
                  value={formData.peralatanListrik}
                  onChange={(e) => setFormData({ ...formData, peralatanListrik: e.target.value })}
                />
                <p className="helper">Pisahkan setiap alat dengan koma.</p>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setEditing(false)} className="btn-outline" disabled={isPending}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <MapPin className="h-4 w-4 text-brand-blue" />
                  Lokasi & Usaha
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Usaha</p>
                    <p className="font-medium text-brand-ink">{business.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Jenis Usaha</p>
                    <p className="font-medium text-brand-ink">{getBusinessLabel(business.type)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Lokasi</p>
                    <p className="font-medium text-brand-ink">{business.address || "-"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Zap className="h-4 w-4 text-brand-yellow" />
                  Informasi Listrik
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Daya Listrik</p>
                    <p className="font-medium text-brand-ink">{business.powerVA ? `${business.powerVA} VA` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Golongan Tarif Estimasi</p>
                    <p className="font-medium text-brand-ink">
                      {business.powerVA && business.powerVA <= 900 ? "R-1/TR (Subsidi)" : "R-1/TR (Non-Subsidi)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Jam Operasional</p>
                    <p className="font-medium text-brand-ink">{business.operatingHours || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 sm:col-span-2">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <User className="h-4 w-4 text-brand-green" />
                  Peralatan Listrik Utama
                </h3>
                {business.appliances.length > 0 ? (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {business.appliances.map((alat) => (
                      <li key={alat.id} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        {alat.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Belum ada peralatan terdaftar.</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="card space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-brand-ink flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-brand-green" />
                Kelola Semua Usaha Anda
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Berikut adalah daftar semua usaha Anda. Klik &quot;Jadikan Usaha Aktif&quot; untuk mengganti ruang lingkup dashboard.
              </p>
            </div>
            <Link
              href="/dashboard/tambah-usaha"
              className="btn btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Tambah Usaha
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {allBusinesses.map((b) => {
              const isActive = b.id === business.id;
              return (
                <div
                  key={b.id}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-4 ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50/10 shadow-sm"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-slate-800 truncate">{b.name}</h3>
                      {isActive && (
                        <span className="badge bg-emerald-100 border-emerald-200 text-emerald-800 text-[10px] font-bold py-0.5 px-2.5 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="text-xs space-y-1 text-slate-500">
                      <p>Jenis: <strong className="text-slate-700">{getBusinessLabel(b.type)}</strong></p>
                      <p>Daya: <strong className="text-slate-700">{b.powerVA ? `${b.powerVA} VA` : "-"}</strong></p>
                      <p>Alamat: <strong className="text-slate-700 truncate block">{b.address || "-"}</strong></p>
                    </div>
                  </div>

                  {!isActive && (
                    <button
                      onClick={() => handleSwitchActive(b.id)}
                      className="btn btn-outline py-1.5 text-[11px] font-bold w-full text-center"
                    >
                      Jadikan Usaha Aktif
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>



        <section className="card">
          <h2 className="flex items-center gap-2 font-bold">
            <Bell className="h-5 w-5 text-brand-green" />
            Preferensi Notifikasi
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Pilih media untuk menerima peringatan jika ada pemakaian listrik tidak normal.
          </p>

          <div className="mt-5 space-y-4 rounded-xl bg-slate-50 p-4">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-brand-ink">Notifikasi WhatsApp (Mockup)</p>
                <p className="text-xs text-slate-500">Peringatan saat pemakaian naik drastis.</p>
              </div>
              <input
                type="checkbox"
                checked={notifWa}
                onChange={(e) => setNotifWa(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-brand-green focus:ring-brand-green"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-brand-ink">Laporan Bulanan Email (Mockup)</p>
                <p className="text-xs text-slate-500">Kirim ringkasan laporan setiap awal bulan.</p>
              </div>
              <input
                type="checkbox"
                checked={notifEmail}
                onChange={(e) => setNotifEmail(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-brand-green focus:ring-brand-green"
              />
            </label>
          </div>

          <button
            onClick={() => toast("Preferensi notifikasi berhasil disimpan.")}
            className="btn-primary mt-5"
          >
            Simpan Pengaturan Notifikasi
          </button>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <h4 className="text-xs font-bold text-slate-600">Catatan Demo</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Perubahan profil akan disimpan ke database PostgreSQL Anda. Pada versi lanjutan, data ini disinkronkan dengan smart meter PLN secara real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
