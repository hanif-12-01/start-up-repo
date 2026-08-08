import { redirect } from 'next/navigation';
import { readRequestedBusiness } from '@/server/services/workspace-page';

export const dynamic = 'force-dynamic';

export default async function PredictionsPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  const requestedBusinessId = await readRequestedBusiness(searchParams);
  const query = requestedBusinessId ? `?businessId=${encodeURIComponent(requestedBusinessId)}&tab=forecast` : '?tab=forecast';
  redirect(`/analysis${query}`);
}
