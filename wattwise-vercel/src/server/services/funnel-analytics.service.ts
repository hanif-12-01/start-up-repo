import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';

export const ANALYTICS_MINIMUM_BREAKDOWN_COHORT = 5;
export const DEFAULT_ANALYTICS_TIMEZONE = 'Asia/Jakarta';

export interface FunnelStageDefinition {
  stageCode: string;
  label: string;
  description: string;
  order: number;
}

export interface FunnelCatalogDefinition {
  funnelCode: string;
  name: string;
  unitOfAnalysis: 'USER' | 'BUSINESS';
  stages: FunnelStageDefinition[];
}

export const FUNNEL_DEFINITION_V1 = {
  USER_ACTIVATION_FUNNEL: {
    funnelCode: 'USER_ACTIVATION_FUNNEL',
    name: 'User Activation Funnel',
    unitOfAnalysis: 'USER' as const,
    stages: [
      { stageCode: 'ACCOUNT_CREATED', label: 'Akun Dibuat', description: 'Pengguna mendaftar di platform', order: 1 },
      { stageCode: 'PLAN_SELECTED', label: 'Paket Dipilih', description: 'Pengguna memiliki paket aktif', order: 2 },
      { stageCode: 'ONBOARDING_COMPLETED', label: 'Onboarding Selesai', description: 'Pengguna menyelesaikan pendaftaran awal', order: 3 },
      { stageCode: 'FIRST_BUSINESS_CREATED', label: 'Usaha Pertama Dibuat', description: 'Pengguna mendaftarkan minimal satu usaha aktif', order: 4 },
    ],
  },
  BUSINESS_VALUE_FUNNEL: {
    funnelCode: 'BUSINESS_VALUE_FUNNEL',
    name: 'Business Value Funnel',
    unitOfAnalysis: 'BUSINESS' as const,
    stages: [
      { stageCode: 'BUSINESS_CREATED', label: 'Usaha Didaftarkan', description: 'Usaha berhasil didaftarkan dalam platform', order: 1 },
      { stageCode: 'FIRST_BILL_CREATED', label: 'Tagihan Pertama Input', description: 'Usaha menginput minimal 1 tagihan listrik', order: 2 },
      { stageCode: 'COMPARISON_READY', label: 'Tagihan Pembanding', description: 'Usaha memiliki 2+ tagihan untuk perbandingan', order: 3 },
      { stageCode: 'DIAGNOSTIC_STARTED', label: 'Mulai Cek Kenaikan', description: 'Usaha memulai sesi diagnostik', order: 4 },
      { stageCode: 'QUESTIONNAIRE_COMPLETED', label: 'Kuesioner Selesai', description: 'Usaha menyelesaikan pertanyaan diagnostik', order: 5 },
      { stageCode: 'CANDIDATES_READY', label: 'Penyebab Dihasilkan', description: 'Sistem menyajikan opsi rekomendasi penyebab', order: 6 },
      { stageCode: 'INSPECTION_STARTED', label: 'Pemeriksaan Dimulai', description: 'Usaha membuat rencana pemeriksaan lapangan', order: 7 },
      { stageCode: 'INSPECTION_COMPLETED', label: 'Pemeriksaan Selesai', description: 'Usaha menyelesaikan verifikasi pemeriksaan', order: 8 },
      { stageCode: 'ACTION_CREATED', label: 'Rencana Hemat Dibuat', description: 'Usaha membuat rencana tindakan penghematan', order: 9 },
      { stageCode: 'ACTION_COMPLETED', label: 'Tindakan Selesai', description: 'Usaha menyelesaikan tindakan penghematan', order: 10 },
      { stageCode: 'OUTCOME_CREATED', label: 'Evaluasi Dampak', description: 'Usaha melakukan evaluasi efisiensi biaya baru', order: 11 },
      { stageCode: 'SESSION_CLOSED', label: 'Sesi Selesai', description: 'Sesi diagnostik selesai dan ditutup', order: 12 },
    ],
  },
} as const;

export const funnelQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  segment: z.string().optional(),
});

export type FunnelQueryInput = z.infer<typeof funnelQuerySchema>;

export interface FunnelStageSummary {
  stageCode: string;
  label: string;
  order: number;
  reachedCount: number;
  cohortConversionNumerator: number;
  cohortConversionDenominator: number;
  cohortConversionRateLabel: string;
  previousStageConversionNumerator: number;
  previousStageConversionDenominator: number;
  previousStageConversionRateLabel: string;
  dropOffFromPreviousCount: number;
}

export interface FunnelSummary {
  funnelCode: string;
  name: string;
  unitOfAnalysis: 'USER' | 'BUSINESS';
  cohortSize: number;
  stages: FunnelStageSummary[];
  largestDropOff: {
    fromStageCode: string;
    fromStageLabel: string;
    toStageCode: string;
    toStageLabel: string;
    dropOffCount: number;
    wording: string;
  } | null;
  dataQualityAnomalyCount: number;
}

export interface ProductFunnelAnalyticsReadModel {
  generatedAt: string;
  timezone: string;
  range: {
    from: string;
    to: string;
    dayCount: number;
  };
  selectedSegment: string;
  availableSegments: string[];
  userActivationFunnel: FunnelSummary;
  businessValueFunnel: FunnelSummary;
  suppressionState: {
    suppressed: boolean;
    message?: string;
  };
  methodologyNotes: string[];
  dataFreshness: string;
}

export function parseDateBounds(fromStr?: string, toStr?: string, now: Date = new Date()) {
  let toDateStr = toStr;
  let fromDateStr = fromStr;

  if (!toDateStr) {
    toDateStr = now.toISOString().slice(0, 10);
  }
  if (!fromDateStr) {
    const defaultFrom = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000);
    fromDateStr = defaultFrom.toISOString().slice(0, 10);
  }

  const fromDate = new Date(`${fromDateStr}T00:00:00+07:00`);
  const toDate = new Date(`${toDateStr}T23:59:59.999+07:00`);
  const nextDayAfterTo = new Date(new Date(`${toDateStr}T00:00:00+07:00`).getTime() + 24 * 60 * 60 * 1000);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new Error('Format tanggal dari atau sampai tidak valid');
  }

  if (fromDate > toDate) {
    throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
  }

  const dayDiff = Math.ceil((nextDayAfterTo.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
  if (dayDiff > 366) {
    throw new Error('Rentang cohort maksimal 366 hari');
  }

  if (fromDate > now) {
    throw new Error('Rentang cohort tidak boleh sepenuhnya di masa depan');
  }

  return {
    fromDateStr,
    toDateStr,
    rangeStart: fromDate,
    rangeEnd: nextDayAfterTo,
    dayCount: dayDiff,
  };
}

function formatPercentage(num: number, den: number): string {
  if (den <= 0) return '—';
  const val = (num / den) * 100;
  return `${val.toFixed(1)}%`;
}

export async function getProductFunnelAnalyticsReadModel(
  input: FunnelQueryInput,
  now: Date = new Date()
): Promise<ProductFunnelAnalyticsReadModel> {
  const db = getDb();
  const bounds = parseDateBounds(input.from, input.to, now);
  const selectedSegment = input.segment || 'all';

  // 1. Available Segments
  const segmentsResult = await db.execute<{ segment: string }>(
    sql`SELECT DISTINCT segment FROM business WHERE is_active = true AND segment IS NOT NULL ORDER BY segment`
  );
  const availableSegments = ['all', ...segmentsResult.rows.map((r: { segment: string }) => r.segment).filter(Boolean)];

  // 2. User Activation Funnel Aggregate
  const userAggResult = await db.execute<{
    account_created: string | number;
    plan_selected: string | number;
    onboarding_completed: string | number;
    first_business_created: string | number;
  }>(sql`
    SELECT
      COUNT(DISTINCT u.id)::int AS account_created,
      COUNT(DISTINCT CASE WHEN up.id IS NOT NULL OR u.email_verified IS TRUE THEN u.id END)::int AS plan_selected,
      COUNT(DISTINCT CASE WHEN up.onboarding_completed_at IS NOT NULL THEN u.id END)::int AS onboarding_completed,
      COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN u.id END)::int AS first_business_created
    FROM "user" u
    LEFT JOIN user_plan up ON up.user_id = u.id
    LEFT JOIN business b ON b.user_id = u.id AND b.is_active = true
    WHERE u.created_at >= ${bounds.rangeStart} AND u.created_at < ${bounds.rangeEnd}
  `);

  const userRow = userAggResult.rows[0] || {
    account_created: 0,
    plan_selected: 0,
    onboarding_completed: 0,
    first_business_created: 0,
  };

  const userRawCounts = [
    Number(userRow.account_created ?? 0),
    Number(userRow.plan_selected ?? 0),
    Number(userRow.onboarding_completed ?? 0),
    Number(userRow.first_business_created ?? 0),
  ];

  // Monotonic normalization for User Funnel
  let userAnomalyCount = 0;
  const userNormalized = [...userRawCounts];
  for (let i = userNormalized.length - 2; i >= 0; i--) {
    if (userNormalized[i] < userNormalized[i + 1]) {
      userAnomalyCount += userNormalized[i + 1] - userNormalized[i];
      userNormalized[i] = userNormalized[i + 1];
    }
  }

  const userCohortSize = userNormalized[0] || 0;
  const userStages: FunnelStageSummary[] = FUNNEL_DEFINITION_V1.USER_ACTIVATION_FUNNEL.stages.map((stg, idx) => {
    const count = userNormalized[idx];
    const prevCount = idx === 0 ? userCohortSize : userNormalized[idx - 1];
    return {
      stageCode: stg.stageCode,
      label: stg.label,
      order: stg.order,
      reachedCount: count,
      cohortConversionNumerator: count,
      cohortConversionDenominator: userCohortSize,
      cohortConversionRateLabel: formatPercentage(count, userCohortSize),
      previousStageConversionNumerator: count,
      previousStageConversionDenominator: prevCount,
      previousStageConversionRateLabel: formatPercentage(count, prevCount),
      dropOffFromPreviousCount: idx === 0 ? 0 : Math.max(0, prevCount - count),
    };
  });

  let userLargestDropOff: FunnelSummary['largestDropOff'] = null;
  let maxUserDrop = 0;
  for (let i = 1; i < userStages.length; i++) {
    const drop = userStages[i].dropOffFromPreviousCount;
    if (drop > maxUserDrop) {
      maxUserDrop = drop;
      const prev = userStages[i - 1];
      const curr = userStages[i];
      userLargestDropOff = {
        fromStageCode: prev.stageCode,
        fromStageLabel: prev.label,
        toStageCode: curr.stageCode,
        toStageLabel: curr.label,
        dropOffCount: drop,
        wording: `Penurunan jumlah terbesar terlihat antara "${prev.label}" dan "${curr.label}".`,
      };
    }
  }

  // 3. Business Value Funnel Aggregate
  const segmentFilter = selectedSegment !== 'all' ? sql`AND b.segment = ${selectedSegment}` : sql``;

  const bizAggResult = await db.execute<{
    business_created: string | number;
    first_bill_created: string | number;
    comparison_ready: string | number;
    diagnostic_started: string | number;
    questionnaire_completed: string | number;
    candidates_ready: string | number;
    inspection_started: string | number;
    inspection_completed: string | number;
    action_created: string | number;
    action_completed: string | number;
    outcome_created: string | number;
    session_closed: string | number;
  }>(sql`
    SELECT
      COUNT(DISTINCT b.id)::int AS business_created,
      COUNT(DISTINCT CASE WHEN eb.id IS NOT NULL THEN b.id END)::int AS first_bill_created,
      COUNT(DISTINCT CASE WHEN bill_counts.bill_count >= 2 THEN b.id END)::int AS comparison_ready,
      COUNT(DISTINCT CASE WHEN ds.id IS NOT NULL THEN b.id END)::int AS diagnostic_started,
      COUNT(DISTINCT CASE WHEN ds.status IN ('ANALYZED', 'INSPECTION_IN_PROGRESS', 'CLOSED') THEN b.id END)::int AS questionnaire_completed,
      COUNT(DISTINCT CASE WHEN dc.id IS NOT NULL THEN b.id END)::int AS candidates_ready,
      COUNT(DISTINCT CASE WHEN ip.id IS NOT NULL THEN b.id END)::int AS inspection_started,
      COUNT(DISTINCT CASE WHEN ip.status = 'COMPLETED' THEN b.id END)::int AS inspection_completed,
      COUNT(DISTINCT CASE WHEN eap.id IS NOT NULL THEN b.id END)::int AS action_created,
      COUNT(DISTINCT CASE WHEN eap.status = 'COMPLETED' THEN b.id END)::int AS action_completed,
      COUNT(DISTINCT CASE WHEN aoe.id IS NOT NULL THEN b.id END)::int AS outcome_created,
      COUNT(DISTINCT CASE WHEN ds_closed.id IS NOT NULL THEN b.id END)::int AS session_closed
    FROM business b
    LEFT JOIN electricity_bill eb ON eb.business_id = b.id
    LEFT JOIN (
      SELECT business_id, COUNT(id) AS bill_count
      FROM electricity_bill
      GROUP BY business_id
    ) bill_counts ON bill_counts.business_id = b.id
    LEFT JOIN diagnostic_session ds ON ds.business_id = b.id
    LEFT JOIN diagnostic_candidate dc ON dc.diagnostic_session_id = ds.id
    LEFT JOIN inspection_plan ip ON ip.business_id = b.id
    LEFT JOIN energy_action_plan eap ON eap.business_id = b.id
    LEFT JOIN action_outcome_evaluation aoe ON aoe.business_id = b.id
    LEFT JOIN diagnostic_session ds_closed ON ds_closed.business_id = b.id AND ds_closed.status = 'CLOSED'
    WHERE b.is_active = true
      AND b.created_at >= ${bounds.rangeStart} AND b.created_at < ${bounds.rangeEnd}
      ${segmentFilter}
  `);

  const bizRow = (bizAggResult as unknown as { rows?: Array<Record<string, unknown>> })?.rows?.[0] ||
    (bizAggResult as unknown as Array<Record<string, unknown>>)[0] || {
    business_created: 0,
    first_bill_created: 0,
    comparison_ready: 0,
    diagnostic_started: 0,
    questionnaire_completed: 0,
    candidates_ready: 0,
    inspection_started: 0,
    inspection_completed: 0,
    action_created: 0,
    action_completed: 0,
    outcome_created: 0,
    session_closed: 0,
  };

  const bizRawCounts = [
    Number(bizRow.business_created ?? 0),
    Number(bizRow.first_bill_created ?? 0),
    Number(bizRow.comparison_ready ?? 0),
    Number(bizRow.diagnostic_started ?? 0),
    Number(bizRow.questionnaire_completed ?? 0),
    Number(bizRow.candidates_ready ?? 0),
    Number(bizRow.inspection_started ?? 0),
    Number(bizRow.inspection_completed ?? 0),
    Number(bizRow.action_created ?? 0),
    Number(bizRow.action_completed ?? 0),
    Number(bizRow.outcome_created ?? 0),
    Number(bizRow.session_closed ?? 0),
  ];

  // Monotonic normalization for Business Value Funnel
  let bizAnomalyCount = 0;
  const bizNormalized = [...bizRawCounts];
  for (let i = bizNormalized.length - 2; i >= 0; i--) {
    if (bizNormalized[i] < bizNormalized[i + 1]) {
      bizAnomalyCount += bizNormalized[i + 1] - bizNormalized[i];
      bizNormalized[i] = bizNormalized[i + 1];
    }
  }

  const bizCohortSize = bizNormalized[0] || 0;
  const isSuppressed = selectedSegment !== 'all' && bizCohortSize < ANALYTICS_MINIMUM_BREAKDOWN_COHORT;

  const bizStages: FunnelStageSummary[] = FUNNEL_DEFINITION_V1.BUSINESS_VALUE_FUNNEL.stages.map((stg, idx) => {
    const count = bizNormalized[idx];
    const prevCount = idx === 0 ? bizCohortSize : bizNormalized[idx - 1];
    return {
      stageCode: stg.stageCode,
      label: stg.label,
      order: stg.order,
      reachedCount: isSuppressed ? 0 : count,
      cohortConversionNumerator: isSuppressed ? 0 : count,
      cohortConversionDenominator: bizCohortSize,
      cohortConversionRateLabel: isSuppressed ? '—' : formatPercentage(count, bizCohortSize),
      previousStageConversionNumerator: isSuppressed ? 0 : count,
      previousStageConversionDenominator: prevCount,
      previousStageConversionRateLabel: isSuppressed ? '—' : formatPercentage(count, prevCount),
      dropOffFromPreviousCount: isSuppressed || idx === 0 ? 0 : Math.max(0, prevCount - count),
    };
  });

  let bizLargestDropOff: FunnelSummary['largestDropOff'] = null;
  if (!isSuppressed) {
    let maxBizDrop = 0;
    for (let i = 1; i < bizStages.length; i++) {
      const drop = bizStages[i].dropOffFromPreviousCount;
      if (drop > maxBizDrop) {
        maxBizDrop = drop;
        const prev = bizStages[i - 1];
        const curr = bizStages[i];
        bizLargestDropOff = {
          fromStageCode: prev.stageCode,
          fromStageLabel: prev.label,
          toStageCode: curr.stageCode,
          toStageLabel: curr.label,
          dropOffCount: drop,
          wording: `Penurunan jumlah terbesar terlihat antara "${prev.label}" dan "${curr.label}".`,
        };
      }
    }
  }

  return {
    generatedAt: now.toISOString(),
    timezone: DEFAULT_ANALYTICS_TIMEZONE,
    range: {
      from: bounds.fromDateStr,
      to: bounds.toDateStr,
      dayCount: bounds.dayCount,
    },
    selectedSegment,
    availableSegments,
    userActivationFunnel: {
      funnelCode: FUNNEL_DEFINITION_V1.USER_ACTIVATION_FUNNEL.funnelCode,
      name: FUNNEL_DEFINITION_V1.USER_ACTIVATION_FUNNEL.name,
      unitOfAnalysis: FUNNEL_DEFINITION_V1.USER_ACTIVATION_FUNNEL.unitOfAnalysis,
      cohortSize: userCohortSize,
      stages: userStages,
      largestDropOff: userLargestDropOff,
      dataQualityAnomalyCount: userAnomalyCount,
    },
    businessValueFunnel: {
      funnelCode: FUNNEL_DEFINITION_V1.BUSINESS_VALUE_FUNNEL.funnelCode,
      name: FUNNEL_DEFINITION_V1.BUSINESS_VALUE_FUNNEL.name,
      unitOfAnalysis: FUNNEL_DEFINITION_V1.BUSINESS_VALUE_FUNNEL.unitOfAnalysis,
      cohortSize: bizCohortSize,
      stages: bizStages,
      largestDropOff: bizLargestDropOff,
      dataQualityAnomalyCount: bizAnomalyCount,
    },
    suppressionState: {
      suppressed: isSuppressed,
      message: isSuppressed ? 'Data belum cukup untuk ditampilkan' : undefined,
    },
    methodologyNotes: [
      'Funnel ini dihitung secara langsung dari state domain aplikasi yang tersimpan.',
      'Analisis tidak menggunakan tracking event, tracking pixel, cookie pemasaran, atau SDK pihak ketiga.',
      'Tahap milestone dihitung berdasarkan progres authoritative terkini yang dicapai oleh akun atau usaha dalam rentang cohort.',
      'Cohort yang baru dibuat mungkin membutuhkan waktu tambahan untuk menyelesaikan seluruh alur perjalanan.',
    ],
    dataFreshness: `Data diambil pada ${now.toLocaleDateString('id-ID', { timeZone: DEFAULT_ANALYTICS_TIMEZONE })} ${now.toLocaleTimeString('id-ID', { timeZone: DEFAULT_ANALYTICS_TIMEZONE })} (${DEFAULT_ANALYTICS_TIMEZONE})`,
  };
}
