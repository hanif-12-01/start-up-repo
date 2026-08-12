import { getAiShadowMonitoringSummary } from '../src/server/services/ai-shadow-monitoring.service';
import { getPool } from '../src/server/db/client';

async function main() {
  const summary = await getAiShadowMonitoringSummary();
  process.stdout.write(`${JSON.stringify({
    report: 'AI-06 Shadow Health Report',
    generatedAt: summary.generatedAt,
    serviceHealth: summary.service,
    outboxHealth: summary.outbox,
    realEvidenceVolume: summary.evidenceCounts,
    accuracyStatus: summary.accuracy,
    phaseComparison: summary.segments.historyPhase,
    timingComparison: summary.segments.timingBucket,
    domainShift: summary.domainShift,
    alerts: { state: summary.alertState },
    privacy: summary.privacy,
  }, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`AI-06 aggregate report failed: ${error instanceof Error ? error.message : 'UNKNOWN'}\n`);
    process.exitCode = 1;
  })
  .finally(async () => getPool().end());
