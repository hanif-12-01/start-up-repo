import { requireWorkspacePage } from '@/server/services/workspace-page';
import { getUserEntitlements } from '@/server/services/entitlement.service';
import { getProductAnalysisReadModel } from '@/server/services/product-analysis';
import { AnalysisView } from '@/components/analysis/AnalysisView';

export const dynamic = 'force-dynamic';

const validTabs = new Set(['overview', 'trend', 'anomaly', 'forecast', 'recommendations', 'simulator']);

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string | string[]; tab?: string | string[] }>;
}) {
  const query = await searchParams;
  const requestedBusinessId = typeof query.businessId === 'string' ? query.businessId : undefined;
  const requestedTab = typeof query.tab === 'string' && validTabs.has(query.tab) ? query.tab : 'overview';

  const { userId } = await requireWorkspacePage(requestedBusinessId);
  const [analysisModel, entitlements] = await Promise.all([
    getProductAnalysisReadModel(userId, requestedBusinessId, { phaseAware: requestedTab === 'forecast' }),
    getUserEntitlements(userId),
  ]);

  const { data, tariff, samples, forecastPlan, anomaly, efficiency: score, recommendations } = analysisModel;
  const businessQuery = `businessId=${encodeURIComponent(data.business.id)}`;

  return (
    <AnalysisView
      data={data}
      tariff={tariff}
      samples={samples}
      forecastPlan={forecastPlan}
      anomaly={anomaly}
      score={score}
      recommendations={recommendations}
      entitlements={entitlements}
      activeTab={requestedTab}
      businessQuery={businessQuery}
    />
  );
}
