# Population Coordinator Runtime

The Coordinator boundary creates Runs, expands deterministic Units, manages retry metadata, aggregates required Unit states, requests cancellation, and reads resumable work. It has no provider, object-storage, normalization, canonical SQL, publication, Coverage, or consumer responsibility.

Scheduled duplicate delivery resolves through request identity plus occurrence identity. Intentional reruns require an explicit rerun identity. Unit expansion is pure and independent of Run and Worker IDs; database uniqueness makes concurrent repeated expansion idempotent.

Job state is derived from required Units. Completed Units survive crashes and cancellation. Retryable Units remain non-terminal. Mixed completed and terminal failures become `PARTIAL`; all required terminal failures become `FAILED`.

The Phase 2 adapter provides these operations, but live event reconstruction and concurrent coordinator expansion remain unverified without the isolated database.
