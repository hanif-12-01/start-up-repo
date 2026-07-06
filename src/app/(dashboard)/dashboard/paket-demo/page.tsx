import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserPlan } from "@/services/subscription";
import { PageHeader } from "@/components/ui/common";
import { Sparkles, Zap, Award, Crown, Check, X, ShieldAlert, Key } from "lucide-react";
import Link from "next/link";
import { isTrialActive } from "@/lib/plan-entitlements";
import PaketDemoClient from "./paket-demo-client";

export const metadata = {
  title: "Simulasi Paket - WattWise AI",
  description: "Bandingkan fitur Paket Gratis, Pro Trial, Pro, dan Enterprise.",
};

export default async function PaketDemoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { subscription, plan } = await getUserPlan(session.user.id);
  const planCode = plan?.code || "FREE";
  const trialActive = subscription ? isTrialActive(subscription) : false;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="Simulasi Paket WattWise AI"
        subtitle="Lihat perbedaan pengalaman pengguna dari Paket Gratis, Pro Trial, Pro, hingga Enterprise secara real-time."
      />

      <div className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 shadow-xs flex items-start gap-4">
        <ShieldAlert className="h-6 w-6 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-slate-800">Panduan Akun Demo & Simulasi</h4>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed font-semibold">
            WattWise AI dirancang agar ramah bagi UMKM. Di bawah ini adalah kredensial akun simulasi yang telah disiapkan dengan data historis realistis. Anda dapat login dengan akun-akun ini untuk menguji perbedaan fiturnya secara instan, atau mengaktifkan masa uji coba Pro 30 hari langsung pada akun Anda saat ini.
          </p>
        </div>
      </div>

      <PaketDemoClient 
        currentPlanCode={planCode} 
        trialActive={trialActive} 
      />
    </div>
  );
}
