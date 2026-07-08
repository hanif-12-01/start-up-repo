"use client";

import { createApplianceAction, deleteApplianceAction, updateApplianceAction, applyApplianceTemplateAction } from "@/app/actions/appliance";
import { Modal, StatusBadge } from "@/components/ui/common";
import { useToast } from "@/components/ui/toast";
import { estimateMonthlyCost, estimateMonthlyKwh } from "@/services/appliance-estimation";
import { UsageStatus } from "@prisma/client";
import { Edit3, Loader2, Plus, Trash2, Zap, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { CatalogItem } from "@/lib/appliances/types";
import { APPLIANCE_CATALOG } from "@/data/appliance-catalog";

type Appliance = {
  id: string;
  name: string;
  category?: string | null;
  powerWatt: number;
  quantity: number;
  dailyUsageHours: number;
  usageStatus: UsageStatus;
};

type ApplianceForm = Omit<Appliance, "id">;

const blank: ApplianceForm = { name: "", category: "Lainnya", powerWatt: 100, quantity: 1, dailyUsageHours: 8, usageStatus: UsageStatus.ACTIVE };
const statusLabel: Record<UsageStatus, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Tidak Aktif",
  MAINTENANCE: "Perawatan",
};

const fmtKwh = (n: number) => `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kWh`;
const fmtIdr = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export default function PeralatanClient({
  appliances,
  tariffPerKwh,
  businessSegment,
  businessSegmentLabel,
  templateAppliances = [],
}: {
  appliances: Appliance[];
  tariffPerKwh: number;
  businessSegment: string;
  businessSegmentLabel: string;
  templateAppliances: CatalogItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Appliance | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ApplianceForm>(blank);
  const [showTemplatePreview, setShowTemplatePreview] = useState(appliances.length === 0);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      beginCreate();
    }
  }, [searchParams]);

  const beginCreate = () => {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  };

  const beginEdit = (a: Appliance) => {
    setEditing(a);
    setForm({
      name: a.name,
      category: a.category || "Lainnya",
      powerWatt: a.powerWatt,
      quantity: a.quantity,
      dailyUsageHours: a.dailyUsageHours,
      usageStatus: a.usageStatus
    });
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = editing ? await updateApplianceAction(editing.id, form) : await createApplianceAction(form);
      if (!res.success) return toast(res.error || "Gagal menyimpan peralatan.", "error");
      toast(editing ? "Peralatan diperbarui." : "Peralatan ditambahkan.");
      setOpen(false);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!confirm("Hapus peralatan ini?")) return;
    startTransition(async () => {
      const res = await deleteApplianceAction(id);
      if (!res.success) return toast(res.error || "Gagal menghapus peralatan.", "error");
      toast("Peralatan dihapus.");
      router.refresh();
    });
  };

  const handleApplyTemplateClick = () => {
    startTransition(async () => {
      const res = await applyApplianceTemplateAction(businessSegment);
      const { success, appliedCount, skippedCount, error } = res;
      if (!success) {
        return toast(error || "Gagal menerapkan template.", "error");
      }

      if (appliedCount === 0) {
        toast("Beberapa alat sudah ada, jadi tidak ditambahkan ulang.", "info");
      } else if (skippedCount && skippedCount > 0) {
        toast("Template berhasil ditambahkan. Beberapa alat sudah ada, jadi tidak ditambahkan ulang.", "success");
      } else {
        toast("Template berhasil ditambahkan. Silakan hapus alat yang tidak ada atau ubah daya/jam pakainya sesuai kondisi sebenarnya.", "success");
      }

      setShowTemplatePreview(false);
      router.refresh();
    });
  };

  const handleUnknownWatt = () => {
    if (!form.name) {
      toast("Tulis nama alat terlebih dahulu agar kami bisa mencocokkannya.", "info");
      return;
    }

    const match = APPLIANCE_CATALOG.find(
      (a) =>
        form.name.toLowerCase().includes(a.displayName.toLowerCase()) ||
        a.aliases.some((alias) => form.name.toLowerCase().includes(alias.toLowerCase()))
    );

    if (match) {
      setForm({ ...form, powerWatt: match.defaultWatt });
      toast(`Daya otomatis diisi ${match.defaultWatt} W (Standar untuk ${match.displayName}).`, "success");
    } else {
      setForm({ ...form, powerWatt: 150 });
      toast("Daya diisi 150 W sebagai estimasi awal umum.", "success");
    }
  };

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
            Daftar Peralatan
            <span className="cursor-help text-slate-400 group relative inline-block text-xs font-normal">
              ⓘ
              <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-64 rounded-xl bg-slate-900 p-3 text-[10px] leading-relaxed text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 shadow-xl z-20 font-sans font-medium normal-case">
                Perhitungan ini berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.
              </span>
            </span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
            <strong>Estimasi Simulatif:</strong> Perhitungan ini berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat. Rumus: watt × jumlah × jam/hari × 30 ÷ 1000.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {templateAppliances.length > 0 && (
            <button
              onClick={() => setShowTemplatePreview(!showTemplatePreview)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 px-4.5 py-2.5 text-sm font-bold text-indigo-700 transition-all shadow-sm"
              type="button"
            >
              <Sparkles className="h-4 w-4" /> Template
            </button>
          )}
          <button onClick={beginCreate} className="btn-primary" disabled={isPending}>
            <Plus className="h-4 w-4" /> Tambah Alat
          </button>
        </div>
      </div>

      {showTemplatePreview && templateAppliances.length > 0 && (
        <div className="m-5 p-5 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 border border-indigo-100 rounded-2xl space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-650 bg-indigo-100/60 px-2.5 py-0.5 rounded-full">
                  Kategori: {businessSegmentLabel}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-500 fill-current" /> Gunakan Template Peralatan
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Kami menyiapkan daftar alat umum untuk jenis usaha/properti Anda. Anda bisa hapus, tambah, atau ubah dayanya nanti.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleApplyTemplateClick}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 font-bold shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                disabled={isPending}
              >
                {isPending ? "Memproses..." : "Gunakan Template Ini"}
              </button>
              <button
                onClick={() => {
                  setShowTemplatePreview(false);
                  beginCreate();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                type="button"
                disabled={isPending}
              >
                Tambah Manual Saja
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templateAppliances.map((item) => {
              const estKwh = (item.defaultWatt * item.defaultQuantity * item.defaultHoursPerDay * 30) / 1000;
              return (
                <div key={item.id} className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl p-3.5 flex flex-col justify-between hover:shadow-sm transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-800 text-sm">{item.displayName}</h4>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {item.usageNote}
                    </p>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap justify-between items-center text-xs text-slate-650 gap-y-1">
                    <div>
                      <span className="font-bold text-slate-900">{item.defaultWatt} W</span> daya
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">{item.defaultQuantity}</span> unit
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">{item.defaultHoursPerDay}</span> jam/hari
                    </div>
                    <div className="w-full text-[10px] text-slate-400 font-medium mt-1">
                      Estimasi: <span className="font-semibold text-slate-700">{estKwh.toFixed(1)} kWh/bulan</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 flex gap-2.5 text-xs text-amber-800 font-medium font-sans leading-relaxed">
            <span className="shrink-0 text-amber-500">⚠️</span>
            <p>
              <strong>Penting:</strong> Daya alat bisa berbeda tergantung merk, seri, usia alat, dan cara pemakaian. Angka ini hanya estimasi awal dan bisa diubah.
            </p>
          </div>
        </div>
      )}

      {appliances.length === 0 ? (
        <div className="grid place-items-center gap-3 p-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Zap className="h-6 w-6" /></div>
          <div>
            <p className="font-bold text-slate-800">Belum ada data peralatan.</p>
            <p className="text-sm text-slate-400">Tambahkan alat listrik untuk menghitung estimasi pemakaian.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3">Nama &amp; Kode Alat</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Daya</th>
                <th className="px-5 py-3">Jumlah</th>
                <th className="px-5 py-3">Jam/Hari</th>
                <th className="px-5 py-3">Estimasi kWh/Bulan</th>
                <th className="px-5 py-3">Estimasi Biaya/Bulan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appliances.map((a) => {
                const kwh = estimateMonthlyKwh(a);
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      <div>{a.name}</div>
                      <div className="text-[9px] font-mono text-indigo-600 font-extrabold uppercase mt-0.5 tracking-wider" title="Pada MVP 3, alat dapat dihubungkan ke perangkat AIoT untuk pembacaan yang lebih detail.">
                        WW-APP-{a.id.substring(0, 5).toUpperCase()} <span className="text-[8px] bg-indigo-50 border border-indigo-200 px-1 rounded-sm ml-1 font-sans">Siap AIoT</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-bold">{a.category || "Lainnya"}</td>
                    <td className="px-5 py-4 text-slate-600">{a.powerWatt} W</td>
                    <td className="px-5 py-4 text-slate-600">{a.quantity}</td>
                    <td className="px-5 py-4 text-slate-600">{a.dailyUsageHours}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{fmtKwh(kwh)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{fmtIdr(kwh * tariffPerKwh)}</td>
                    <td className="px-5 py-4"><StatusBadge status={statusLabel[a.usageStatus]} /></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => beginEdit(a)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label={`Edit ${a.name}`}><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => remove(a.id)} className="rounded-lg border border-rose-100 p-2 text-rose-500 hover:bg-rose-50" aria-label={`Hapus ${a.name}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Peralatan" : "Tambah Peralatan"}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Nama Alat</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
          </div>
          <div>
            <label className="label">Kategori</label>
            <select
              className="select"
              value={form.category || "Lainnya"}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="Pendingin">Pendingin</option>
              <option value="Mesin produksi">Mesin produksi</option>
              <option value="Pencahayaan">Pencahayaan</option>
              <option value="Dapur">Dapur</option>
              <option value="Laundry">Laundry</option>
              <option value="Elektronik">Elektronik</option>
              <option value="Pompa">Pompa</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 m-0">Daya (Watt)</label>
                <button
                  type="button"
                  onClick={handleUnknownWatt}
                  className="text-[10px] text-indigo-700 hover:underline font-bold"
                >
                  Saya tidak tahu dayanya
                </button>
              </div>
              <input className="input" type="number" min={1} value={form.powerWatt} onChange={(e) => setForm({ ...form, powerWatt: Number(e.target.value) })} />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Lihat label daya pada alat. Biasanya tertulis 250W, 800W, atau 1200W. Jika tidak tahu, pakai estimasi awal dulu.
              </p>
            </div>
            <div>
              <label className="label">Jumlah (Unit)</label>
              <input className="input" type="number" min={1} step={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Jam/Hari</label>
              <input className="input" type="number" min={0} max={24} step={0.1} value={form.dailyUsageHours} onChange={(e) => setForm({ ...form, dailyUsageHours: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Hari/Bulan (Asumsi)</label>
              <input className="input bg-slate-50 cursor-not-allowed text-slate-500 font-medium" type="number" value={30} disabled title="Perhitungan didasarkan pada siklus 30 hari standar." />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={form.usageStatus} onChange={(e) => setForm({ ...form, usageStatus: e.target.value as UsageStatus })}>{Object.values(UsageStatus).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</select>
            </div>
          </div>
          <div className="rounded-xl border border-indigo-50 bg-indigo-50/20 p-3.5 space-y-2 text-xs font-sans leading-relaxed text-slate-700">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              ⚡ Estimasi Simulatif <span className="text-[10px] font-normal text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">Bisa diubah kapan saja</span>
            </div>
            <div className="text-[11px] text-slate-600">
              Penggunaan: <span className="font-bold text-slate-900">{fmtKwh(estimateMonthlyKwh(form))}</span> / bulan · Biaya: <span className="font-bold text-slate-900">{fmtIdr(estimateMonthlyCost(form, tariffPerKwh))}</span> / bulan (Berdasarkan data input).
            </div>
            <div className="text-[10px] text-slate-400 border-t border-indigo-50 pt-1.5">
              ⚠️ Perhitungan ini berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.
            </div>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-[10px] leading-relaxed text-indigo-950 font-semibold font-sans">
            💡 <strong>Roadmap Phase 3:</strong> Pada Phase 3, peralatan dapat disimulasikan terhubung ke perangkat smart plug/AIoT untuk pembacaan detail otomatis.
          </div>
          <button type="submit" className="btn-primary w-full" disabled={isPending}>{isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : "Simpan"}</button>
        </form>
      </Modal>
    </section>
  );
}