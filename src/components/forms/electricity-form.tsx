"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { submitElectricityDataAction } from "@/actions/electricity";
import { jenisUsahaOptions } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

const emptyForm = {
  namaUsaha: "Laundry Berkah",
  jenisUsaha: "Laundry",
  lokasiUsaha: "Purwokerto",
  dayaListrik: "2.200 VA",
  rataRataTagihan: "1180000",
  tagihanBulanLalu: "1250000",
  pemakaianKwh: "868",
  jamOperasional: "08.00 - 21.00",
  peralatanListrik: "Mesin cuci 2 unit, mesin pengering, setrika uap, pompa air, lampu LED",
  catatan: "",
};

export function ElectricityForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const update = (key: keyof typeof formData, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.namaUsaha.trim() || !formData.jenisUsaha || !formData.lokasiUsaha.trim()) {
      toast("Mohon lengkapi nama usaha, jenis usaha, dan lokasi usaha.", "error");
      return;
    }

    if (Number(formData.tagihanBulanLalu) <= 0 || Number(formData.rataRataTagihan) <= 0) {
      toast("Tagihan listrik harus lebih dari Rp0.", "error");
      return;
    }

    setLoading(true);
    const result = await submitElectricityDataAction(formData);
    setLoading(false);

    if (!result.ok) {
      toast(result.error, "error");
      return;
    }

    localStorage.setItem("wattwise-input-data", JSON.stringify(formData));
    setSuccess(true);
    toast("Data berhasil disimpan. WattWise AI siap membuat analisis penggunaan listrik usaha Anda.");
  };

  return (
    <>
      {success && (
        <div className="mb-6 rounded-2xl border border-green-100 bg-brand-greenSoft p-5 text-brand-greenDark shadow-card">
          <h2 className="font-bold">Data Berhasil Disimpan</h2>
          <p className="mt-1 text-sm leading-relaxed">
            Data berhasil disimpan. WattWise AI siap membuat analisis penggunaan listrik usaha Anda.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-7">
        <section>
          <h2 className="font-bold text-brand-ink">Profil Usaha</h2>
          <p className="mt-1 text-xs text-slate-500">Informasi dasar tempat usaha Anda.</p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Nama Usaha *</label>
              <input
                className="input"
                value={formData.namaUsaha}
                onChange={(e) => update("namaUsaha", e.target.value)}
                placeholder="Contoh: Laundry Berkah"
              />
            </div>

            <div>
              <label className="label">Jenis Usaha *</label>
              <select
                className="select"
                value={formData.jenisUsaha}
                onChange={(e) => update("jenisUsaha", e.target.value)}
              >
                {jenisUsahaOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Lokasi Usaha *</label>
              <input
                className="input"
                value={formData.lokasiUsaha}
                onChange={(e) => update("lokasiUsaha", e.target.value)}
                placeholder="Contoh: Purwokerto"
              />
              <p className="helper">Cukup tulis kota/kecamatan jika tidak ingin menulis alamat lengkap.</p>
            </div>

            <div>
              <label className="label">Daya listrik jika diketahui</label>
              <input
                className="input"
                value={formData.dayaListrik}
                onChange={(e) => update("dayaListrik", e.target.value)}
                placeholder="Contoh: 2.200 VA"
              />
              <p className="helper">Bisa dilihat di meteran, struk PLN, atau PLN Mobile.</p>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-6">
          <h2 className="font-bold text-brand-ink">Data Tagihan</h2>
          <p className="mt-1 text-xs text-slate-500">Masukkan angka tanpa titik. Contoh: 1250000.</p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Rata-rata tagihan listrik per bulan *</label>
              <input
                type="number"
                min="0"
                className="input"
                value={formData.rataRataTagihan}
                onChange={(e) => update("rataRataTagihan", e.target.value)}
                placeholder="Contoh: 1180000"
              />
              <p className="helper">Perkiraan biaya listrik normal setiap bulan.</p>
            </div>

            <div>
              <label className="label">Tagihan bulan lalu *</label>
              <input
                type="number"
                min="0"
                className="input"
                value={formData.tagihanBulanLalu}
                onChange={(e) => update("tagihanBulanLalu", e.target.value)}
                placeholder="Contoh: 1250000"
              />
              <p className="helper">Nominal total tagihan atau token listrik satu bulan.</p>
            </div>

            <div>
              <label className="label">Pemakaian kWh bulan lalu</label>
              <input
                type="number"
                min="0"
                className="input"
                value={formData.pemakaianKwh}
                onChange={(e) => update("pemakaianKwh", e.target.value)}
                placeholder="Contoh: 868"
              />
              <p className="helper">Opsional, tetapi membantu prediksi lebih akurat.</p>
            </div>

            <div>
              <label className="label">Jam operasional usaha</label>
              <input
                className="input"
                value={formData.jamOperasional}
                onChange={(e) => update("jamOperasional", e.target.value)}
                placeholder="Contoh: 08.00 - 21.00"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-6">
          <h2 className="font-bold text-brand-ink">Peralatan Listrik</h2>
          <p className="mt-1 text-xs text-slate-500">Sebutkan alat yang paling sering menyala atau dayanya besar.</p>

          <div className="mt-4 space-y-5">
            <div>
              <label className="label">Peralatan listrik utama</label>
              <textarea
                rows={3}
                className="input resize-none py-3"
                value={formData.peralatanListrik}
                onChange={(e) => update("peralatanListrik", e.target.value)}
                placeholder="Contoh: Mesin cuci 2 unit, pengering, setrika, freezer, pompa air"
              />
            </div>

            <div>
              <label className="label">Catatan tambahan</label>
              <textarea
                rows={2}
                className="input resize-none py-3"
                value={formData.catatan}
                onChange={(e) => update("catatan", e.target.value)}
                placeholder="Contoh: Ada penambahan alat baru minggu lalu"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setFormData({
                namaUsaha: "",
                jenisUsaha: "Laundry",
                lokasiUsaha: "",
                dayaListrik: "",
                rataRataTagihan: "",
                tagihanBulanLalu: "",
                pemakaianKwh: "",
                jamOperasional: "",
                peralatanListrik: "",
                catatan: "",
              });
              setSuccess(false);
            }}
          >
            Kosongkan
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            <Save className="h-4 w-4" />
            {loading ? "Menyimpan dan Menganalisis..." : "Simpan dan Analisis"}
          </button>
        </div>
      </form>
    </>
  );
}