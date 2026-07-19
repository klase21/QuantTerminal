# Preview Inactive Candidate Selector

The normal Serving path remains unchanged: resolve the latest consumer-visible exposure, then validate the expected corpus and checksum.

The explicit inactive-candidate path is enabled only when all of these bindings are exact:

- Vercel environment is `preview`.
- Mode is `EXPLICIT_INACTIVE_CANDIDATE`.
- Candidate, candidate checksum, member-set checksum, and watermark checksum match the approved MVP-8I candidate.
- Target fingerprint is the Production Neon branch and database.
- PostgreSQL reports the exact Neon branch ID inside the managed read-only transaction.
- Connected role is `mvp_serving_reader`.
- Candidate review proves counts `62/6/6/74`, lifecycle `WITHHELD`, exposure `INTERNAL_ONLY`, and zero exposures.

Preview reads are labeled `INTERNAL_ONLY`. They create no exposure, change no lifecycle or eligibility state, and cannot fall back to another corpus when a Preview guard fails. Production and missing/unknown environment identities reject the selector.
