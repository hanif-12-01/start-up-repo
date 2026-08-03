# WattWise AI — Implementation Prompt IT-DIAG-08B

## State-Derived Product Funnel Analytics

Keputusan Product Owner:

```text
IT-DIAG-08A — ACCEPTED LOCALLY
```

Accepted base:

```text
34e7b4205602d4e8258dae1c47e200ae0f63a3da
```

Implementasikan tepat satu fase:

```text
IT-DIAG-08B — State-Derived Product Funnel Analytics
```

Tujuan:

```text
data authoritative aplikasi
→ dihitung menjadi funnel agregat
→ menunjukkan jumlah pengguna/usaha yang mencapai setiap milestone
→ menunjukkan conversion dan drop-off
→ membantu Product Owner menemukan titik perjalanan yang bermasalah
→ tanpa client tracking atau external analytics vendor
```

Analytics V1 harus berasal dari state domain yang sudah diterima.

Jangan membuat generic page-view tracking.

---

# 1. Konfigurasi

```text
WORKSPACE=D:\LOMBA\MVP PROTOTIPE start-up
REPOSITORY=hanif-12-01/start-up-repo

TARGET_ROOT=wattwise-vercel
LEGACY_ROOT=wattwise-laravel

APPROVED_BASE_COMMIT=34e7b4205602d4e8258dae1c47e200ae0f63a3da
TARGET_BRANCH=feature/it-diag-08b-funnel-analytics
TARGET_PHASE=IT-DIAG-08B

ACTIVE_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_08B_IMPLEMENTATION_PROMPT.md
PREVIOUS_TASK_FILE=docs/tasks/WATTWISE_AI_IT_DIAG_08A_IMPLEMENTATION_PROMPT.md

ALLOW_LOCAL_CODE=true
ALLOW_LOCAL_COMMIT=true

ALLOW_PUSH=false
ALLOW_OPEN_PR=false
ALLOW_MERGE=false
ALLOW_DEPLOY=false
ALLOW_PRODUCTION_MIGRATION=false
ALLOW_NEON_RESOURCE_CREATION=false
ALLOW_PRODUCTION_SECRET=false
ALLOW_REAL_USER_DATA=false
ALLOW_NEW_DEPENDENCY=false
ALLOW_EXTERNAL_ANALYTICS_VENDOR=false
ALLOW_CLIENT_TRACKING=false
ALLOW_PAYMENT_WORK=false
ALLOW_MACHINE_LEARNING=false
ALLOW_LLM=false

REQUIRE_NODE_24=true
ALLOW_DISPOSABLE_POSTGRES=true

EXPECTED_NEW_MIGRATION=false
DEFAULT_ANALYTICS_TIMEZONE=Asia/Jakarta
```
