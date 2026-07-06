"use client";

import { createApplianceAction, deleteApplianceAction, updateApplianceAction } from "@/app/actions/appliance";
import { Modal, StatusBadge } from "@/components/ui/common";
import { useToast } from "@/components/ui/toast";
import { estimateMonthlyCost, estimateMonthlyKwh } from "@/services/appliance-estimation";
import { UsageStatus } from "@prisma/client";
import { Edit3, Loader2, Plus, Trash2, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

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

export default function PeralatanClient({ appliances, tariffPerKwh }: { appliances: Appliance[]; tariffPerKwh: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Appliance | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ApplianceForm>(blank);

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

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Daftar Peralatan</h2>
          <p className="text-sm text-slate-400">Rumus: watt × jumlah × jam/hari × 30 ÷ 1000. Estimasi menggunakan asumsi 30 hari pemakaian.</p>
        </div>
        <button onClick={beginCreate} className="btn-primary" disabled={isPending}>
          <Plus className="h-4 w-4" /> Tambah Alat
        </button>
      </div>

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
                <th className="px-5 py-3">kWh/Bulan</th>
                <th className="px-5 py-3">Biaya/Bulan</th>
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
            <div><label className="label">Daya Watt</label><input className="input" type="number" min={1} value={form.powerWatt} onChange={(e) => setForm({ ...form, powerWatt: Number(e.target.value) })} /></div>
            <div><label className="label">Jumlah</label><input className="input" type="number" min={1} step={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
            <div><label className="label">Jam/Hari</label><input className="input" type="number" min={0} max={24} step={0.1} value={form.dailyUsageHours} onChange={(e) => setForm({ ...form, dailyUsageHours: Number(e.target.value) })} /></div>
            <div><label className="label">Status</label><select className="select" value={form.usageStatus} onChange={(e) => setForm({ ...form, usageStatus: e.target.value as UsageStatus })}>{Object.values(UsageStatus).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</select></div>
          </div>
          <p className="helper">Estimasi: {fmtKwh(estimateMonthlyKwh(form))}/bulan · {fmtIdr(estimateMonthlyCost(form, tariffPerKwh))}/bulan.</p>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-[10px] leading-relaxed text-indigo-950 font-semibold">
            💡 <strong>Roadmap IoT MVP 3:</strong> Pada MVP 3, alat dapat dihubungkan ke perangkat AIoT untuk pembacaan pemakaian yang lebih detail dan otomatis.
          </div>
          <button type="submit" className="btn-primary w-full" disabled={isPending}>{isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : "Simpan"}</button>
        </form>
      </Modal>
    </section>
  );
}