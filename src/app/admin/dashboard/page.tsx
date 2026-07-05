import { getAdminDataAction } from "@/app/actions/admin";
import AdminDashboardClient from "./admin-client";

export const metadata = {
  title: "Admin Dashboard - WattWise AI",
  description: "Panel Administrator WattWise AI",
};

export default async function AdminDashboardPage() {
  const data = await getAdminDataAction();
  
  if (!data.ok) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-soft p-8 border border-slate-100 text-center">
          <h1 className="text-xl font-bold text-red-500 mb-2">Akses Ditolak</h1>
          <p className="text-sm text-slate-500 mb-6">
            Halaman ini hanya dapat diakses oleh akun Administrator atau Akun Demo (`owner@wattwise.id`).
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-brand-green hover:bg-brand-greenDark text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
          >
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboardClient
      initialUsers={data.users || []}
      initialBusinesses={data.businesses || []}
      initialPayments={data.payments || []}
      initialSubscriptions={data.subscriptions || []}
      plans={data.plans || []}
    />
  );
}
