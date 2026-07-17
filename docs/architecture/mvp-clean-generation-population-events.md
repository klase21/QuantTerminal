# Clean Generation Population Events

Live Population stage events separate immutable Logical Slot identity from execution identity. Each event identity is derived from the execution generation, Logical Slot, Population run and unit attempts, fence, stage, source contract, and provider binding. Timestamps and random values are excluded.

An exact event replay with identical immutable content is `DUPLICATE`. The same event identity with different content is `CONFLICT`. A higher fence or a different execution generation creates a distinct event only because it records a distinct execution fact. Historical event rows and constraints remain unchanged.

All compatibility checks happen before acquisition writes. The emitted native JSON details preserve generation, slot, attempt, fence, stage, source contract, and provider lineage. Preflight derives Population resume eligibility from durable successor state and fails closed for active leases, terminal units, or missing durable boundaries.

The 2026-07-15 clean-generation incident was `EVENT_ID_NOT_GENERATION_SCOPED`: the old `RETRIEVING` identity used only Logical Slot and fence, so the successor collided with a predecessor event. The repaired identity prevents predecessor reuse without weakening immutable conflict detection.
