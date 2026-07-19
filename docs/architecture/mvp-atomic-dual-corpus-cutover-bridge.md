# MVP Atomic Dual-Corpus Cutover Bridge

MVP-8Z introduces an exact, temporary Production bridge for the activation interval. Exposure selection remains authoritative. The runtime accepts the selected corpus only when it equals one of two fixed bindings: the verified rollback corpus or the approved candidate, with the checksum fixed for each identity.

The bridge is not a general multi-corpus mode. It requires the Production Vercel project, the exact Production Neon target, `mvp_serving_reader`, an explicit read-only transaction, the deployed commit, and an unexpired durable approval whose artifact checksum binds the exact pair. Wildcards, extra corpora, Preview overrides, target drift, and checksum drift fail closed.

The ordered transition is:

1. Build and smoke the exact-pair bridge and exact candidate-only artifacts without changing Production.
2. After Gate 1 approval, promote the bridge while the rollback corpus remains selected.
3. Verify the bridge serves the rollback corpus through three attributed healthy probes and full smoke.
4. After Gate 2 approval, run guarded activation. The same bridge then follows the new exposure and serves the candidate without a configuration gap.
5. After stable candidate smoke, promote the candidate-only artifact. It accepts only the candidate and has no bridge authorization dependency.

Rollback first appends an exposure selecting the captured rollback corpus while the bridge is available, then restores the runtime-captured verified deployment. Historical exposure and audit rows remain immutable.
