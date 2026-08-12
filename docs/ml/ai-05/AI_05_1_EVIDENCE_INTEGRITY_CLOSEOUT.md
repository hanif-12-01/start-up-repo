# WATTWISE AI-05.1 Evidence Integrity & Temporal Safety Closeout

## P1-01 — provenance semantics

Shadow evidence now preserves `UNCLASSIFIED`, `REAL_WATTWISE`, and `SYNTHETIC_DEMO`
without collapsing one meaning into another. QA/demo provisioning remains explicitly
`SYNTHETIC_DEMO`. Promotion-grade evidence continues to require `REAL_WATTWISE`, so neither
unclassified nor synthetic rows can enter real-product accuracy.

Migration `0012_ai_shadow_evidence_integrity.sql` expands the evidence constraint without
rewriting existing rows. Its rollback narrows the constraint only when no `UNCLASSIFIED` row
exists; otherwise it preserves the safe expansion because narrowing would require semantic
corruption or data loss. The temporal columns are reversible and the forward migration is
re-applicable.

## P1-02 — temporal integrity

The AI-specific history builder retains exact `period_start`, inclusive `period_end`, month, and
derived accepted kWh until feature construction. WattWise uses `Asia/Jakarta` as the canonical
application calendar. An observation is completed only when:

```text
period_end < forecast_origin date in Asia/Jakarta
```

Therefore future period ends and same-day inclusive period ends are excluded. The latest
contiguous completed run determines the next calendar target. Stored audit metadata is limited
to `history_latest_period_end` and `history_temporal_integrity`; transient raw history is still
cleared after terminal outbox processing.

Existing AI-05 rows default to `history_temporal_integrity = false` and are not auto-promoted.
This deliberately favors evidence correctness over sample volume.

## Scope confirmation

- NO RETRAINING
- NO MODEL CHANGE
- NO ROUTING CHANGE
- NO DETERMINISTIC ALGORITHM CHANGE
- NO DEPLOYMENT
- NO PRODUCTION DATABASE ACCESS
