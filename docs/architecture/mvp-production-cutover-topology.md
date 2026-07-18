# MVP Production Cutover Topology

Production reads the `production` Neon branch and selects the current corpus through the append-only `serving_exposure` relation. Runtime safety additionally pins `MVP_SERVING_EXPECTED_CORPUS_ID` and `MVP_SERVING_EXPECTED_CHECKSUM` in Vercel Production. The approved MVP-8I candidate now exists in that same Production database but remains `WITHHELD`, `INTERNAL_ONLY`, `INELIGIBLE`, and unexposed.

The later cutover therefore has two separately authorized control-plane changes: guarded append-only exposure activation in Production and an atomic Vercel pin/deployment transition. MVP-8P performs neither. Rollback restores the frozen prior corpus/checksum pin and prior deployment while retaining all corpus and exposure history. No destructive cleanup is required.

The required order is: operator approval and durable authorization, expected-baseline compare-and-swap, guarded exposure creation, Vercel pin/deployment transition, bounded health observation, and append-only rollback when any frozen threshold is crossed.
