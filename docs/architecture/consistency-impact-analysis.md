# Consistency Impact Analysis

Impact analysis traverses a bound dependency snapshot from an exact changed node. A correction supplies the replacement Fact node and the exact replaced node used as the traversal root; the new Fact identity remains part of the impact checksum.

Supported causes are Fact correction, newly available Fact, Rule-version change, policy-version change, and declared dependency change. Results retain direct nodes, transitive nodes, useful unaffected nodes, reason, snapshot identity, traversal status, and checksum.

Traversal is bounded by explicit maximum depth and sorted deterministically. A missing root, incomplete snapshot, exceeded bound, or cycle returns an incomplete or blocked result. It never silently expands to full-platform recomputation. Historical Results are identified as affected but remain immutable.
