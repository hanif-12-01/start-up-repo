"use client";

import { useState } from "react";
import { Bell, Edit3, HelpCircle, MapPin, Save, Store, User, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/common";
import { useToast } from "@/components/ui/toast";
import { jenisUsahaOptions, profilUsaha } from "@/lib/mock-data";

export default function ProfilPage() {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    namaUsaha: profilUsaha.namaUsaha,
    jenisUsaha: profilUsaha.jenisUsaha,
    lokasi: profilUsaha.lokasi,
    dayaListrik: profilUsaha.dayaListrik,
    peralatanListrik: profilUsaha.peralatanUtama.join(", "),
    notifWa: true,
    notifEmail: false,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setEditing(false);
    toast("Profil usaha berhasil diperbarui.");
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
                LB
              </div>
              <div>
                <h2 className="text-xl font-bold text-brand-ink">{formData.namaUsaha}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Store className="h-4 w-4" />
                  {formData.jenisUsaha}
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
                    value={formData.namaUsaha}
                    onChange={(e) => setFormData({ ...formData, namaUsaha: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Jenis Usaha</label>
                  <select
                    className="select"
                    value={formData.jenisUsaha}
                    onChange={(e) => setFormData({ ...formData, jenisUsaha: e.target.value })}
                  >
                    {jenisUsahaOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Lokasi</label>
                  <input
                    className="input"
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Daya Listrik</label>
                  <input
                    className="input"
                    value={formData.dayaListrik}
                    onChange={(e) => setFormData({ ...formData, dayaListrik: e.target.value })}
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
                <button type="button" onClick={() => setEditing(false)} className="btn-outline">
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  <Save className="h-4 w-4" />
                  Simpan Perubahan
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
                    <p className="font-medium text-brand-ink">{formData.namaUsaha}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Jenis Usaha</p>
                    <p className="font-medium text-brand-ink">{formData.jenisUsaha}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Lokasi</p>
                    <p className="font-medium text-brand-ink">{formData.lokasi}</p>
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
                    <p className="font-medium text-brand-ink">{formData.dayaListrik}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Golongan Tarif</p>
                    <p className="font-medium text-brand-ink">{profilUsaha.tarif}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Jam Operasional</p>
                    <p className="font-medium text-brand-ink">{profilUsaha.jamOperasional}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 sm:col-span-2">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <User className="h-4 w-4 text-brand-green" />
                  Peralatan Listrik Utama
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {formData.peralatanListrik.split(",").map((alat: string) => (
                    <li key={alat} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      {alat.trim()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
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
                checked={formData.notifWa}
                onChange={(e) => setFormData({ ...formData, notifWa: e.target.checked })}
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
                checked={formData.notifEmail}
                onChange={(e) => setFormData({ ...formData, notifEmail: e.target.checked })}
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
              Perubahan profil hanya tersimpan di tampilan demo. Pada versi lanjutan, data bisa
              disinkronkan dengan IoT, smart meter, atau AMI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}