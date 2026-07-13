# Durable Raw Artifact Storage

## Baseline Adapter

`createFilesystemObjectStorage` implements the D3 `ObjectStoragePort` with Node.js filesystem APIs for non-production backfill development. The root comes only from `D3_BACKFILL_OBJECT_ROOT` and must be absolute, outside the repository, and outside temporary directories. The preflight checks that the directory exists and exposes available capacity.

Object keys are bounded relative paths. Writes use an exclusive deterministic temporary path, stream SHA-256 calculation, byte-count verification, file synchronization, and atomic rename. A metadata sidecar records only content hash, byte length, and media type. Identical content reuses the immutable artifact; incompatible metadata fails with `ARTIFACT_IMMUTABLE_CONFLICT`. The worker API exposes no delete operation.

The test suite has an explicit test-only authorization for temporary roots. That authorization is never inferred from environment or enabled by the production constructor path.

## Current Binding

`D3_BACKFILL_OBJECT_ROOT` is absent. No durable artifact was written and no capacity claim is available. The Manifest remains blocked until a root is configured and inspected.
