# Guarded Production Control Plane

MVP-8S adds a narrow control plane above the immutable Serving payload and exposure stores. Candidate payloads and manifests remain unchanged. A valid immutable approval supplies effective `ELIGIBLE_FOR_CUTOVER` status without mutating the staged manifest.

Activation requires a candidate-bound approval, an unexpired single-use authorization, the exact target fingerprint, and an expected-current corpus/exposure compare-and-swap. The transaction takes a target-scoped advisory lock, re-reads the active baseline under serializable isolation, appends an exposure, appends an activation event, and records authorization consumption atomically.

Rollback uses a separately bound authorization. It verifies the active activation exposure and the exact linked predecessor, then appends a rollback exposure and linked rollback event. Historical exposures are never updated or deleted. Dry-run follows the validation path but writes nothing.

The local certification gate accepts MVP-8S targets only in `MVP8S_LOCAL_DISPOSABLE_CERTIFICATION` mode, on `127.0.0.1` or `localhost`, with the exact configured port/fingerprint and a database named `quantterminal_mvp8s_canary_<id>`. Managed Neon and arbitrary localhost targets remain rejected.
