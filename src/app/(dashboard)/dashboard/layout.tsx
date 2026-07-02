import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserBusinesses, getActiveBusinessId } from "@/services/business";
import DashboardLayoutClient from "./dashboard-layout-client";

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

  return (
    <DashboardLayoutClient
      businesses={serializedBusinesses}
      activeBusinessId={activeBusinessId}
    >
      {children}
    </DashboardLayoutClient>
  );
}