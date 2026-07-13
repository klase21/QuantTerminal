# D4 Consumer Projections

Core Evidence Packet projects to Dashboard, Replay, Research, Markets, Scanner, and Trade. Projection definitions are proposed contracts and cannot reconstruct or reclassify Evidence.

Every projection preserves the Explainability Funnel:

~~~text
Conclusion
  -> Reasons
  -> Supporting Evidence
  -> Conflicting Evidence
  -> Canonical Fact Versions
  -> Raw Artifact Lineage
~~~

This ordering is logical, not a UI or storage layout. A projection may select and order approved fields for its workflow, but cannot omit conflicts required by the source Packet, convert missing to zero, or introduce an action.

Replay additionally binds explicit knowledge mode and cutoff. AI-rendered prose is a replaceable projection artifact bound to Packet version and structured input checksum.
