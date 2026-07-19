# MVP-8W Corrected Cutover Health Policy

Status: certified, non-executable recovery policy.

## Start-Of-Cutover Baseline

Capture the deployment currently owning the Production alias at cutover start. Verify that exact deployment against the current database corpus, exposure, corpus/checksum pins, Serving health, Dashboard, Scanner, Trade for all six governed symbols, and Replay for all six governed symbols. This runtime-verified deployment becomes the only rollback deployment for that cutover.

Never source the rollback deployment blindly from a historical static artifact. `dpl_Bmkcfuk9FAZT7VQ9thzi3yr7nonR` is `OBSOLETE_NOT_VALID_FOR_MVP_SERVING_ROLLBACK`.

## Immediate Hard Rollback

Rollback immediately only when attributed evidence confirms one of:

- the active database corpus or checksum is wrong;
- the Production corpus/checksum pin is wrong;
- the Production alias owns an unintended deployment after promotion is complete;
- authorization, audit, or compare-and-swap integrity failed;
- an unexplained or destructive database mutation occurred.

## Propagation-Tolerant Conditions

Treat initial `UNHEALTHY`, `SERVING_CORPUS_UNAVAILABLE`, cold-start timeout, 404, 5xx, or temporary alias mismatch as propagation-tolerant unless an immediate hard-rollback condition is independently proven.

For these conditions:

1. Allow a 120-second grace period.
2. Probe every 10 seconds.
3. Read the Production alias owner before every probe.
4. Record UTC timestamp, requested URL type, expected deployment, actual alias owner, HTTP status, application code, corpus/checksum, `x-vercel-id`, `x-vercel-cache`, `x-matched-path`, `server`, and duration.
5. Attribute each response to the deployment that answered.
6. Roll back only after the grace period when three consecutive probes from the confirmed intended deployment return the same failing condition.

A single unaffiliated, unattributed, or early response must never trigger rollback.

## Recovery Success

Recovery or cutover health succeeds only when Vercel confirms the intended alias owner and three consecutive Production-alias responses report `HEALTHY`, `SERVING_POSTGRES`, and the expected corpus/checksum, followed by successful mandatory Serving API smoke.
