import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBusinessProfile } from "@/app/actions/business";
import { getUserBusinesses } from "@/services/business";
import ProfilClient from "./profil-client";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const res = await getBusinessProfile();

  if (!res.success || !res.business) {
    redirect("/onboarding");
  }

  const allBusinesses = await getUserBusinesses(session.user.id);
  const serializedBusinesses = allBusinesses.map((b) => ({
    id: b.id,
    name: b.name,
    type: b.type,
    address: b.address,
    powerVA: b.powerVA,
    operatingHours: b.operatingHours,
  }));

  return (
    <ProfilClient
      initialBusiness={res.business}
      allBusinesses={serializedBusinesses}
    />
  );
}
