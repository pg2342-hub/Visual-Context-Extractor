---
name: History deletion and reviewed memory
description: Product decisions separating deletion of an analysis from deletion of human-reviewed project knowledge.
---

Treat human-reviewed findings as project knowledge that can outlive the originating analysis. Individual history deletion offers retention by default; unreviewed candidates do not survive. Retained findings must retain their original source attribution and review metadata, and must not be presented as manually entered.

**Why:** The user approved deleting individual analyses with an option to keep reviewed findings. Removing an unwanted saved result should not silently discard established project context.

**How to apply:** Preserve this distinction in future bulk cleanup, retention, and history-management features. Deleting a project still removes all its findings.

Memory snapshots recorded in other analyses remain historical evidence, even if a referenced finding or originating run is later deleted.

**Why:** A snapshot records what context the model actually received, not the current state of project memory. Rewriting it would misrepresent an earlier result.

**How to apply:** Keep live project memory changes separate from already-saved context snapshots.
