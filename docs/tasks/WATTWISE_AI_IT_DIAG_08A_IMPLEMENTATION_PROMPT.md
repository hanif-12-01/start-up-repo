# WattWise AI — Implementation Prompt IT-DIAG-08A

## Entitlements, Plan Gating & Trial Management

Keputusan Product Owner:

```text
IT-DIAG-07B — ACCEPTED LOCALLY
```

Accepted base:

```text
e4b0329f2fb4180f91aeca8c75ea573583e7e917
```

Konfigurasi final:

```text
APPROVED_BASE_COMMIT=e4b0329f2fb4180f91aeca8c75ea573583e7e917
TARGET_BRANCH=feature/it-diag-08a-entitlements
TARGET_PHASE=IT-DIAG-08A

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_08A_IMPLEMENTATION_PROMPT.md
PREVIOUS_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_07B_IMPLEMENTATION_PROMPT.md
```

## Scope yang Disetujui

Implementasikan:
- ENTITLEMENT_POLICY_V1;
- effective-plan resolver untuk FREE, TRIAL, dan PRO;
- trial-expiry resolution server-side;
- business-creation limit;
- concurrency-safe business creation;
- monthly-report history limit;
- non-destructive downgrade behavior;
- no-mid-journey-lockout behavior;
- server-side entitlement decisions;
- dashboard plan-and-usage summary;
- safe access-denied presentation;
- server-side ENTITLEMENTS_ENABLED flag;
- tenant-isolation tests;
- unit, integration, runtime, dan browser verification.

## Plan Matrix V1

FREE:
- maksimum 1 active business;
- akses laporan bulan berjalan dan 2 bulan sebelumnya;
- core diagnostic journey tetap tersedia.

TRIAL:
- maksimum 3 active businesses;
- akses laporan hingga 24 bulan;
- core diagnostic journey tetap tersedia.

PRO:
- maksimum 10 active businesses;
- akses laporan hingga 24 bulan;
- core diagnostic journey tetap tersedia.
