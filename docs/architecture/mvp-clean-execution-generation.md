# MVP Clean Execution Generation

The current target-window execution is incident evidence and must be quarantined append-only. A later operator sprint should append a generation disposition that records its plan, run, failure checksum, non-authoritative Population attempts, retained immutable evidence, and `QUARANTINED_LOGICAL_IDENTITY_CONTRACT_V1` reason. The transition must not rewrite units, events, checkpoints, leases, Retrievals, Raw Objects, Candidates, or Facts.

The replacement generation must create a new plan/run/unit execution lineage under the repaired identity contract. It must not reuse Population runs, Retrieval Attempts, Candidates, leases, checkpoints, Facts, downstream outputs, watermarks, Replay records, or manifests from the quarantined generation.

Only checksum-verified immutable Raw Object payload bytes may be reused. Reused bytes receive a fresh Retrieval and Candidate lineage for the clean generation. Canonical Facts, bounded downstream records, Replay, watermarks, and the inactive manifest are generated through the repaired ports. Candidate lifecycle remains `WITHHELD` and `INTERNAL_ONLY`; no activation capability is available.

