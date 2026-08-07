import { Suspense } from 'react';
import { ProductShell } from '@/components/product/ProductShell';
import { getOptionalSession } from '@/server/auth/session';

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const session = await getOptionalSession();
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f9f4]">{children}</div>}>
      <ProductShell userName={session?.user?.name} userEmail={session?.user?.email}>
        {children}
      </ProductShell>
    </Suspense>
  );
}
