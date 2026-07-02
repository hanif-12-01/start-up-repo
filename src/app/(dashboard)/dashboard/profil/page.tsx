import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBusinessProfile } from "@/app/actions/business";
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

  return <ProfilClient initialBusiness={res.business} />;
}
