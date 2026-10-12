---
name: Artifact Vite port collisions
description: Recovering when a restarted Vite artifact serves on a fallback port while the preview still targets the configured port.
---

For artifact-owned Vite services, a previous dev-server process can survive a workflow restart and keep the configured port occupied. Vite may start the new server on the next port while the artifact preview continues to target the configured port, making the preview show stale content.

**Why:** A client-side dependency mismatch persisted through workflow restarts because the preview was reaching the orphaned server, not the current one.

**How to apply:** Configure Vite to honor injected `PORT` with `strictPort: true`. If startup reports that the port is busy, inspect the managed workflow's process group and port listeners, stop only the stale process, then restart the exact artifact-owned workflow once.
