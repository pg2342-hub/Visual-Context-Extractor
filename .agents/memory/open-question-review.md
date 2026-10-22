---
name: Open-question review semantics
description: User-required distinction between keeping a question in project memory and confirming an answered fact.
---

Human approval of an open question means it is worth carrying forward, not that it has been answered. The user requires an “Open questions — UNRESOLVED” section and an instruction that the model must not treat those questions as answered.

**Why:** The user identified that confirming an open-question finding incorrectly promoted it into established facts in future analyses.

**How to apply:** Any future prompt builder, review workflow, export, or memory display must consider the finding's type as well as its review status. Label the approval action “Keep as open question,” never “Confirm.” Pending questions still require approval before carrying forward, and dismissed/retired questions are not active memory.
