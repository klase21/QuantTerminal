# MVP Minimal Active Baseline Fixture

MVP-8P certifies migration and inactive-copy behavior with the smallest corpus accepted by the official Serving contracts. `createMinimalActiveServingFixture` creates one deterministic published corpus with zero optional payload collections. `MvpServingStore.publish` still creates the normal immutable publication event and one `CONSUMER_VISIBLE` exposure, so `PostgresMvpServingReadPort.activeCorpus` exercises the real default-selection path.

The fixture is certification-only. It cannot be selected by Production configuration and does not weaken corpus, checksum, exposure, or target checks. In the disposable PostgreSQL 16 certification it seeded in 28 ms, after which committed migrations 003 and 004 preserved the corpus, exposure, checksums, counts, and active-reader result.
