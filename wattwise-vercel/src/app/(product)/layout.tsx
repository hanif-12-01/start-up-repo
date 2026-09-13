import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ProductShell } from '@/components/product/ProductShell';
import { getOptionalSession } from '@/server/auth/session';
import { resolveEffectivePlan } from '@/server/services/entitlement.service';
import { getDb } from '@/server/db';
import * as schema from '@/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const session = await getOptionalSession();
  if (!session?.user) redirect('/login');
  const effective = await resolveEffectivePlan(session.user.id);

  const db = getDb();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.business)
    .where(
      and(
        eq(schema.business.userId, session.user.id),
        eq(schema.business.isActive, true),
        isNull(schema.business.archivedAt)
      )
    );

  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen bg-[var(--background)] flex items-center justify-center"
          aria-busy="true"
          aria-label="Memuat ruang kerja..."
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        </div>
      }
    >
      <ProductShell
        userName={session.user.name}
        userEmail={session.user.email}
        plan={effective.effectivePlan}
        businessCount={Number(count)}
      >
        {children}
      </ProductShell>
    </Suspense>
  );
}
