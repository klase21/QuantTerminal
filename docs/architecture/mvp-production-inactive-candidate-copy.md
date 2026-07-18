# MVP Production Inactive Candidate Copy

MVP-8P extends the existing separate-target inactive publisher with a guarded copy coordinator. The coordinator requires distinct source/destination fingerprints, an exact expected active corpus and exposure, deterministic request/operator/reason metadata, and a writer with no privilege on `serving_exposure`. Dry-run validates without writing. Commit persists only the immutable candidate corpus, 62 Projection payloads, six Evidence summaries, six Replay payloads, 74 members, and one bound manifest.

Active exposure is fingerprinted before and after the copy. Any baseline drift fails closed. Candidate identity provides deterministic idempotency: an exact repeat returns `DUPLICATE`; conflicting content is rejected by immutable identity and checksum validation. Activation, pin changes, Vercel changes, and default-reader changes remain outside this operation.
