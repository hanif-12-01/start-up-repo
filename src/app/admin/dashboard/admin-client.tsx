"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Building2,
  CreditCard,
  TrendingUp,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  MessageSquare,
  Calendar,
  ArrowLeft,
  Settings,
  Zap,
  Check,
  X
} from "lucide-react";
import {
  updateUserPlanAction,
  updatePaymentStatusAction,
  updateUserCrmAction
} from "@/app/actions/admin";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  crmStage: string;
  crmNotes: string | null;
  createdAt: Date;
}

interface Business {
  id: string;
  name: string;
  type: string;
  mode: string;
  address: string | null;
  powerVA: number | null;
  user: {
    name: string | null;
    email: string;
  };
  appliances: { id: string }[];
}

interface Payment {
  id: string;
  invoiceNo: string;
  amountIdr: number;
  status: string;
  method: string | null;
  virtualAccount: string | null;
  paidAt: Date | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
  plan: {
    name: string;
    code: string;
  };
}

interface Subscription {
  id: string;
  userId: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  trialStartDate: Date | null;
  trialEndDate: Date | null;
  plan: {
    name: string;
    code: string;
  };
}

interface Plan {
  id: string;
  name: string;
  code: string;
}

export default function AdminDashboardClient({
  initialUsers,
  initialBusinesses,
  initialPayments,
  initialSubscriptions,
  plans,
}: {
  initialUsers: User[];
  initialBusinesses: Business[];
  initialPayments: Payment[];
  initialSubscriptions: Subscription[];
  plans: Plan[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "businesses" | "payments">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // Selected User for CRM editing modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [crmStage, setCrmStage] = useState("");
  const [crmNotes, setCrmNotes] = useState("");

  // Search filter
  const filteredUsers = initialUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm)
  );

  const filteredBusinesses = initialBusinesses.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayments = initialPayments.filter(
    (p) =>
      p.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Quick statistics
  const totalUsersCount = initialUsers.length;
  const totalBusinessesCount = initialBusinesses.length;
  const pendingPaymentsCount = initialPayments.filter((p) => p.status === "PENDING").length;

  const activeSubs = initialSubscriptions.filter((s) => s.status === "ACTIVE");
  const proUsersCount = activeSubs.filter((s) => s.plan.code === "PRO_UMKM").length;
  const businessUsersCount = activeSubs.filter((s) => s.plan.code === "BUSINESS").length;
  const freeUsersCount = activeSubs.filter((s) => s.plan.code === "FREE").length;

  // Actions
  const handleUpdatePlan = async (userId: string, planCode: string) => {
    if (!confirm(`Apakah Anda yakin ingin mengubah paket pengguna ini menjadi ${planCode}?`)) return;

    startTransition(async () => {
      const res = await updateUserPlanAction(userId, planCode);
      if (res.ok) {
        alert("Berhasil memperbarui paket langganan pengguna!");
        router.refresh();
      } else {
        alert(res.error || "Gagal mengubah paket.");
      }
    });
  };

  const handleUpdatePaymentStatus = async (paymentId: string, status: string) => {
    const text = status === "SUCCESS" ? "MENYETUJUI (PAID)" : "MEMBATALKAN (FAILED)";
    if (!confirm(`Apakah Anda yakin ingin ${text} invoice ini?`)) return;

    startTransition(async () => {
      const res = await updatePaymentStatusAction(paymentId, status);
      if (res.ok) {
        alert(`Status pembayaran berhasil diperbarui menjadi ${status}!`);
        router.refresh();
      } else {
        alert(res.error || "Gagal memperbarui status pembayaran.");
      }
    });
  };

  const handleOpenCrmModal = (user: User) => {
    setSelectedUser(user);
    setCrmStage(user.crmStage || "Contacted");
    setCrmNotes(user.crmNotes || "");
  };

  const handleSaveCrm = async () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const res = await updateUserCrmAction(selectedUser.id, crmStage, crmNotes);
      if (res.ok) {
        alert("Umpan balik CRM berhasil disimpan!");
        setSelectedUser(null);
        router.refresh();
      } else {
        alert(res.error || "Gagal menyimpan CRM.");
      }
    });
  };

  const getActivePlanName = (userId: string) => {
    const active = initialSubscriptions.find((s) => s.userId === userId && s.status === "ACTIVE");
    return active ? active.plan.name : "Gratis (Fallback)";
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-green">
            <Zap className="h-6 w-6 fill-current animate-pulse text-brand-green" />
            <h1 className="text-2xl font-black tracking-tight text-slate-800">WattWise Admin Center</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Panel kendali internal pilot project, pengawasan konversi, dan simulasi penjurian startup.
          </p>
        </div>
        <a
          href="/dashboard"
          className="flex items-center gap-2 self-start md:self-auto bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke App Dashboard
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Pengguna</p>
            <p className="text-2xl font-black text-slate-800">{totalUsersCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Usaha/Outlet</p>
            <p className="text-2xl font-black text-slate-800">{totalBusinessesCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-brand-green flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Invoice Pending</p>
            <p className="text-2xl font-black text-amber-600">{pendingPaymentsCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Rasio Paket Aktif</p>
            <p className="text-xs font-bold text-slate-700">
              Free: {freeUsersCount} | Pro: {proUsersCount} | Biz: {businessUsersCount}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-3 rounded-2xl shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setActiveTab("overview"); setSearchTerm(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "overview" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Ringkasan Sistem
          </button>
          <button
            onClick={() => { setActiveTab("users"); setSearchTerm(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "users" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Pengguna & CRM Notes
          </button>
          <button
            onClick={() => { setActiveTab("businesses"); setSearchTerm(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "businesses" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Profil Usaha/Outlet
          </button>
          <button
            onClick={() => { setActiveTab("payments"); setSearchTerm(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "payments" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Transaksi & VA Approval
          </button>
        </div>

        {activeTab !== "overview" && (
          <div className="relative md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-brand-green transition-all"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isPending && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold animate-pulse">
          Sedang memproses permintaan perubahan data di cloud database...
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* GTM / CRM Stage stats */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-green" /> Distribusi Tahap CRM Pilot
            </h3>
            <div className="space-y-3 pt-2 text-xs font-medium">
              {[
                { name: "Contacted", desc: "Hubungi Awal", color: "bg-slate-100 text-slate-700" },
                { name: "Trial Started", desc: "Masa Uji Coba Berjalan", color: "bg-blue-100 text-blue-700" },
                { name: "Active Explorer", desc: "Aktif Input Data", color: "bg-indigo-100 text-indigo-700" },
                { name: "Interested to Pay", desc: "Tertarik Membayar", color: "bg-amber-100 text-amber-700" },
                { name: "Upgraded", desc: "Sukses Menjadi Paid Subscriber", color: "bg-emerald-100 text-emerald-700" },
                { name: "Churned", desc: "Kembali ke Gratis / Batal", color: "bg-rose-100 text-rose-700" },
              ].map((stage) => {
                const count = initialUsers.filter((u) => u.crmStage === stage.name).length;
                return (
                  <div key={stage.name} className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg ${stage.color}`}>{stage.desc}</span>
                    <span className="font-bold text-slate-700">{count} Pengguna</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Demo Tips */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" /> Tips Demo Penjurian
            </h3>
            <div className="text-xs leading-relaxed text-slate-500 space-y-2 pt-2">
              <p>
                <strong>1. Uji Coba Gating Fitur:</strong> Ubah paket akun pengguna demo menjadi <strong>Gratis (FREE)</strong>.
                Buka dashboard utama, halaman Laporan, atau Rekomendasi di browser terpisah, lalu pastikan overlay blur/lock premium aktif.
              </p>
              <p>
                <strong>2. Simulasi Upgrade Instan:</strong> Klik menu <strong>Harga Paket</strong> pada akun pengguna, lakukan checkout untuk plan Pro/Business. Masuk ke tab <strong>Transaksi & VA Approval</strong> di halaman admin ini, cari invoice pending terbaru, lalu klik <strong>Setujui VA</strong>. Pengguna akan langsung ter-upgrade secara instan di dashboard.
              </p>
              <p>
                <strong>3. Pengisian CRM Pilot:</strong> Isi catatan evaluasi verbal UMKM pada modal detail pengguna di tab Pengguna untuk mendemonstrasikan kelayakan bisnis dan ketajaman validasi pasar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & CRM */}
      {activeTab === "users" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Nama / Kontak</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Paket Aktif</th>
                  <th className="py-3 px-4 text-center">Tahap CRM</th>
                  <th className="py-3 px-4">Catatan CRM</th>
                  <th className="py-3 px-4 text-center">Aksi Plan Switch</th>
                  <th className="py-3 px-4 text-right">Umpan Balik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const currentPlan = getActivePlanName(user.id);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {user.name || "Tanpa Nama"}
                        <span className="block text-[10px] text-slate-400 font-medium">{user.phone || "-"}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${currentPlan.includes("Pro") ? "bg-emerald-50 text-emerald-700 border-emerald-100" : currentPlan.includes("Business") ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-600 border-slate-100"}`}>
                          {currentPlan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          user.crmStage === "Upgraded"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : user.crmStage === "Trial Started" || user.crmStage === "Active Explorer"
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : user.crmStage === "Interested to Pay"
                            ? "bg-amber-50 text-amber-600 border border-amber-200"
                            : user.crmStage === "Churned"
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {user.crmStage}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate" title={user.crmNotes || ""}>
                        {user.crmNotes || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1">
                          <select
                            onChange={(e) => handleUpdatePlan(user.id, e.target.value)}
                            value={
                              initialSubscriptions.find((s) => s.userId === user.id && s.status === "ACTIVE")?.plan.code || "FREE"
                            }
                            className="bg-white border border-slate-200 rounded-lg p-1 text-[11px] font-semibold text-slate-700 focus:outline-none"
                          >
                            <option value="FREE">Gratis</option>
                            <option value="PRO_UMKM">Pro</option>
                            <option value="BUSINESS">Business</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenCrmModal(user)}
                          className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 justify-end ml-auto"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Edit CRM
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BUSINESSES */}
      {activeTab === "businesses" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Usaha / Properti</th>
                  <th className="py-3 px-4">Pemilik</th>
                  <th className="py-3 px-4">Mode / Jenis</th>
                  <th className="py-3 px-4">Daya Listrik (VA)</th>
                  <th className="py-3 px-4">Peralatan Terdaftar</th>
                  <th className="py-3 px-4">Alamat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBusinesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{b.name}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {b.user.name || "Owner"}
                      <span className="block text-[10px] text-slate-400 font-mono">{b.user.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${b.mode === "KOS_PROPERTY" ? "bg-purple-50 text-purple-700" : "bg-teal-50 text-teal-700"}`}>
                        {b.mode === "KOS_PROPERTY" ? "KOS / PROPERTI" : "UMKM"}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{b.type}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{b.powerVA ? `${b.powerVA} VA` : "-"}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 text-center">{b.appliances.length} alat</td>
                    <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate" title={b.address || ""}>
                      {b.address || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENTS */}
      {activeTab === "payments" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">No. Invoice</th>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Paket Tujuan</th>
                  <th className="py-3 px-4">Total Jumlah</th>
                  <th className="py-3 px-4">Virtual Account</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi VA Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{p.invoiceNo}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {p.user.name || "Owner"}
                      <span className="block text-[10px] text-slate-400 font-mono">{p.user.email}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-700">{p.plan.name}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{formatCurrency(p.amountIdr)}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{p.virtualAccount || "-"}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        {p.status === "SUCCESS" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> PAID
                          </span>
                        ) : p.status === "PENDING" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 font-bold text-amber-700">
                            <Clock className="h-3 w-3" /> PENDING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 font-bold text-rose-700">
                            <AlertTriangle className="h-3 w-3" /> {p.status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === "PENDING" ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleUpdatePaymentStatus(p.id, "SUCCESS")}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-1.5 rounded-lg flex items-center justify-center shadow-sm"
                            title="Setujui Pembayaran (VA Success)"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUpdatePaymentStatus(p.id, "FAILED")}
                            className="bg-rose-500 hover:bg-rose-600 text-white font-bold p-1.5 rounded-lg flex items-center justify-center shadow-sm"
                            title="Batalkan/Gagalkan Pembayaran"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CRM EDITING MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Evaluasi CRM Pilot</h3>
                <p className="text-xs text-slate-500">Mencatat masukan dan status konversi program pilot</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pengguna</span>
                <p className="font-bold text-slate-800">{selectedUser.name || "Tanpa Nama"}</p>
                <p className="text-xs text-slate-500 font-mono">{selectedUser.email}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Tahapan CRM
                </label>
                <select
                  value={crmStage}
                  onChange={(e) => setCrmStage(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-green bg-white"
                >
                  <option value="Contacted">Contacted (Dihubungi)</option>
                  <option value="Trial Started">Trial Started (Uji Coba)</option>
                  <option value="Active Explorer">Active Explorer (Aktif Menjelajah)</option>
                  <option value="Interested to Pay">Interested to Pay (Tertarik Bayar)</option>
                  <option value="Upgraded">Upgraded (Paid Berlangganan)</option>
                  <option value="Churned">Churned (Kembali ke Gratis / Batal)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Catatan Evaluasi / CRM Notes
                </label>
                <textarea
                  value={crmNotes}
                  onChange={(e) => setCrmNotes(e.target.value)}
                  rows={4}
                  placeholder="Tulis masukan dari pemilik usaha, tantangan, atau status konversi..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-green resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                onClick={() => setSelectedUser(null)}
                className="btn btn-outline border-slate-200 text-slate-500 text-xs py-2 px-4 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveCrm}
                className="bg-brand-green hover:bg-brand-greenDark text-white text-xs py-2 px-4 rounded-xl font-bold"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
