import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserPlan } from "@/services/subscription";
import { PageHeader } from "@/components/ui/common";
import OnboardingClient from "./onboarding-client";

export const metadata = {
  title: "Simulasi Onboarding Enterprise - WattWise AI",
  description: "Simulasi alur onboarding khusus organisasi besar dan pilot partner.",
};

export default async function EnterpriseOnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { plan } = await getUserPlan(session.user.id);
  const planCode = plan?.code || "FREE";

  // Grant access only to ENTERPRISE users in production/demo
  if (planCode !== "ENTERPRISE") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      <PageHeader
        title="Custom Onboarding Enterprise"
        subtitle="Simulasi alur konfigurasi terpandu untuk integrasi properti multi-cabang dan pilot program."
      />

      <OnboardingClient />
    </div>
  );
}
