# MVP-8P Production Inactive Copy Report

MVP-8P replaced the oversized disposable baseline with a minimal contract-valid fixture: one corpus, one active exposure, and no optional payload rows. The fixture was created through official adapters in 28 ms. Migrations 003 and 004 preserved its corpus, exposure, checksums, counts, and default selection.

The approved candidate was copied once into the Production Neon database through the guarded inactive-copy coordinator and a least-privilege writer with no `serving_exposure` privilege. Production now contains exactly 62 candidate Projection rows, six Evidence rows, six Replay rows, 74 members, and one manifest. The candidate has zero exposures and remains `WITHHELD`, `INTERNAL_ONLY`, and `INELIGIBLE`.

The old Production corpus and sole active exposure remained unchanged. Public health remained `HEALTHY`; the Production deployment and runtime pins were not changed. Explicit Dashboard, Scanner, Trade for six symbols, and Replay for six symbols all passed through the read-only Production candidate reader.
