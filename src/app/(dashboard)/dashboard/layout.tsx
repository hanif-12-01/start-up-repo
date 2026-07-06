import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserBusinesses, getActiveBusinessId } from "@/services/business";
import DashboardLayoutClient from "./dashboard-layout-client";
import { getUserPlan } from "@/services/subscription";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const businesses = await getUserBusinesses(session.user.id);

  if (businesses.length === 0) {
    redirect("/onboarding");
  }

  const activeBusinessId = await getActiveBusinessId(session.user.id);

  if (!activeBusinessId) {
    redirect("/onboarding");
  }

  const serializedBusinesses = businesses.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  const { subscription } = await getUserPlan(session.user.id);
  const serializedSubscription = subscription ? {
    status: subscription.status,
    trialEndDate: subscription.trialEndDate?.toISOString() || null,
    plan: {
      code: subscription.plan.code,
      name: subscription.plan.name
    }
  } : null;

  return (
    <DashboardLayoutClient
      businesses={serializedBusinesses}
      activeBusinessId={activeBusinessId}
      subscription={serializedSubscription}
    >
      {children}
    </DashboardLayoutClient>
  );
}