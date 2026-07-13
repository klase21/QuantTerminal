# Consistency Knowledge Time

## Time Domains

The following fields are independent and must never be substituted for one another:

```text
Event Time != Observed Time != Knowledge Available At != Ingested At != Evaluation Time
```

Event Time describes when the represented event or interval applies. Observed Time is source observation time. Knowledge Available At is the earliest governed time the exact immutable Fact version could be known. Ingested At records platform receipt when retained. Evaluation Time is operational metadata and never determines historical eligibility.

## Modes

### AS_KNOWN_THEN

An exact Fact version is eligible only when `knowledgeAvailableAt <= knowledgeTimeCutoff`. Missing knowledge availability fails closed. A correction received after the cutoff is excluded even when its effective time is earlier. If an earlier version was available by the cutoff, that immutable version remains eligible.

### LATEST_CORRECTED

The runtime may select the highest eligible immutable correction version under the supplied selection policy. The outcome retains the selected version and supersession reference. This mode is identity-defining and is never inferred from a page or caller.

### RETROSPECTIVE

Later-known facts may be considered for retrospective analysis under the supplied policy. The mode remains explicit in identity, diagnostics, and outcome. It must never be presented as an `AS_KNOWN_THEN` result.

## Binding

Every Run fixes its Knowledge-Time mode and cutoff. Alignment rejects a mismatched request. Policy versions and exact Fact versions are also fixed during evaluation, so a concurrent correction or policy publication cannot alter an active outcome.

## Publication Uncertainty

A same-day or daily observation without an exact governed knowledge-availability timestamp is not assumed available at midnight, market open, market close, or end of day. `AS_KNOWN_THEN` marks it ineligible. This applies equally to ETF publications, macro releases and revisions, delayed provider deliveries, and corrected historical facts.
