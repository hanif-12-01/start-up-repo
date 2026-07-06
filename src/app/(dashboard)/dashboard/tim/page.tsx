import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Crown, Info, ShieldCheck, User as UserIcon, UserCog } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserPlan } from "@/services/subscription";
import { canAccessFeature, isTrialActive, FEATURE_KEYS } from "@/lib/plan-entitlements";
import { PageHeader } from "@/components/ui/common";
import { UpgradeCta } from "@/components/subscription/UpgradeCta";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ROLE_META: Record<
  string,
  { label: string; tone: string; description: string; icon: typeof UserIcon }
> = {
  BUSINESS_OWNER: {
    label: "Owner",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    description: "Mengelola paket, semua bisnis/properti, dan laporan.",
    icon: Crown,
  },
  BUSINESS_ADMIN: {
    label: "Admin",
    tone: "bg-blue-50 text-blue-700 border-blue-200/60",
    description: "Membantu mengelola data dan laporan.",
    icon: ShieldCheck,
  },
  BUSINESS_STAFF: {
    label: "Staff",
    tone: "bg-amber-50 text-amber-700 border-amber-200/60",
    description: "Input data listrik dan melihat insight dasar.",
    icon: UserCog,
  },
  BUSINESS_FINANCE: {
    label: "Finance",
    tone: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
    description: "Akses hanya input biaya tagihan & cashflow eksternal.",
    icon: UserIcon,
  },
  BUSINESS_VIEWER: {
    label: "Viewer",
    tone: "bg-slate-50 text-slate-650 border-slate-200/60",
    description: "Akses read-only seluruh visualisasi cabang.",
    icon: UserIcon,
  },
};

export default async function TimPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/tim");

  const { subscription, plan } = await getUserPlan(session.user.id);
  const planCode = plan?.code || "FREE";
  const trialActive = subscription ? isTrialActive(subscription) : false;

  if (!canAccessFeature(FEATURE_KEYS.MULTI_USER_ADMIN, planCode, trialActive)) {
    return (
      <div>
        <PageHeader
          title="Manajemen Tim"
          subtitle="Simulasi role Owner, Admin, dan Staff untuk kelola tim dalam bisnis Anda."
        />
        <UpgradeCta
          title="Manajemen Tim Terkunci"
          description="Fitur multi-user dan role tersedia di Paket Bisnis."
          requiredTier="Paket Bisnis"
          buttonText="Lihat Paket Bisnis"
          href="/dashboard/paket-demo"
        />
      </div>
    );
  }

  const rolesToRender = planCode === "ENTERPRISE"
    ? (["BUSINESS_OWNER", "BUSINESS_ADMIN", "BUSINESS_STAFF", "BUSINESS_FINANCE", "BUSINESS_VIEWER"] as const)
    : (["BUSINESS_OWNER", "BUSINESS_ADMIN", "BUSINESS_STAFF"] as const);

  // Ambil semua membership dari bisnis yang user ini punya (sebagai owner).
  const ownedBusinesses = await db.business.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      memberships: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          role: true,
          userId: true,
          createdAt: true,
          user: { select: { email: true, name: true } },
        },
      },
    },
  });

  const totalMembers = ownedBusinesses.reduce((s, b) => s + b.memberships.length, 0);

  return (
    <div className="font-sans">
      <PageHeader
        title="Manajemen Tim"
        subtitle="Simulasi role Owner, Admin, dan Staff untuk kelola tim dalam bisnis Anda."
      />

      {/* MVP disclaimer */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-700">
          <Info className="h-4 w-4" />
        </div>
        <p className="text-sm leading-relaxed text-blue-900">
          Manajemen tim pada MVP ini digunakan untuk simulasi role akses. Undangan
          email real akan dikembangkan pada tahap berikutnya.
        </p>
      </div>

      {planCode === "ENTERPRISE" && (
        <div className="mb-6 p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-100 font-semibold leading-relaxed">
          Advanced role management pada MVP ini ditampilkan sebagai simulasi. Permission detail akan dikembangkan pada tahap Enterprise pilot.
        </div>
      )}

      {/* Role explanation */}
      <div className={cn(
        "mb-6 grid gap-4",
        planCode === "ENTERPRISE" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 md:grid-cols-3"
      )}>
        {rolesToRender.map((role) => {
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          return (
            <div key={role} className="card">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{meta.label}</h3>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-400">
                {meta.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Anggota tim per bisnis */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">
              Anggota Tim per Bisnis
            </h2>
            <p className="text-xs text-slate-500">
              Total {totalMembers} anggota aktif di {ownedBusinesses.length} bisnis.
            </p>
          </div>
        </div>

        {ownedBusinesses.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">
            Belum ada bisnis. Tambahkan bisnis dulu untuk mengelola tim.
          </div>
        ) : (
          <div className="space-y-4">
            {ownedBusinesses.map((biz) => (
              <div key={biz.id} className="card">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800">{biz.name}</h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {biz.memberships.length} anggota
                  </span>
                </div>
                {biz.memberships.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Belum ada anggota aktif untuk bisnis ini.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {biz.memberships.map((m) => {
                      const roleMeta = ROLE_META[m.role] ?? ROLE_META.BUSINESS_STAFF;
                      return (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                              {(m.user.name || m.user.email)
                                .split(" ")
                                .map((s) => s[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-800">
                                {m.user.name || m.user.email}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {m.user.email}
                              </p>
                            </div>
                          </div>
                          <span className={cn("badge", roleMeta.tone)}>{roleMeta.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
        <strong className="text-slate-700">Catatan MVP:</strong> Undangan anggota via
        email dan pengaturan permission granular akan tersedia di rilis berikutnya. Saat
        ini, pengelolaan tim dilakukan lewat seed database atau permintaan langsung ke
        tim WattWise.
      </div>
    </div>
  );
}
