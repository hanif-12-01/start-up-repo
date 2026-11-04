import { requireWorkspacePage } from '@/server/services/workspace-page';
import { getUserEntitlements } from '@/server/services/entitlement.service';
import { getProductAnalysisReadModel } from '@/server/services/product-analysis';
import { AnalysisView } from '@/components/analysis/AnalysisView';
import { headers } from 'next/headers';
import { isLocalNBeatsCandidateAllowed } from '@/server/services/local-nbeats-candidate';
import { LOCAL_NBEATS_CANDIDATE } from '@/lib/ai/local-candidate';

export const dynamic = 'force-dynamic';

const validTabs = new Set(['overview', 'trend', 'anomaly', 'forecast', 'recommendations', 'simulator']);

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string | string[]; tab?: string | string[]; model?: string | string[] }>;
}) {
  const query = await searchParams;
  const requestedBusinessId = typeof query.businessId === 'string' ? query.businessId : undefined;
  const requestedTab = typeof query.tab === 'string' && validTabs.has(query.tab) ? query.tab : 'overview';

  const { userId } = await requireWorkspacePage(requestedBusinessId);
  const [analysisModel, entitlements] = await Promise.all([
    getProductAnalysisReadModel(userId, requestedBusinessId),
    getUserEntitlements(userId),
  ]);

  const {
    data,
    tariff,
    tariffContext,
    samples,
    forecastPlan,
    anomaly,
    operationalComparison,
    efficiency: score,
    recommendations,
  } = analysisModel;
  const businessQuery = `businessId=${encodeURIComponent(data.business.id)}`;
  const modelSelection = query.model === LOCAL_NBEATS_CANDIDATE.modelVersion
    && isLocalNBeatsCandidateAllowed((await headers()).get('host')) ? 'local-candidate' : 'original';

  return (
    <AnalysisView
      key={`${data.business.id}:${modelSelection}`}
      data={data}
      tariff={tariff}
      tariffContext={tariffContext}
      samples={samples}
      forecastPlan={forecastPlan}
      anomaly={anomaly}
      operationalComparison={operationalComparison}
      score={score}
      recommendations={recommendations}
      entitlements={entitlements}
      activeTab={requestedTab}
      businessQuery={businessQuery}
      modelSelection={modelSelection}
    />
  );
}
