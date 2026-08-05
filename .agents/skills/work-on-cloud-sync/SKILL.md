---
name: work-on-cloud-sync
description: >
  Compatibility route for existing AGENTS.md entries that still name cloud sync.
  Load work-on-writer-sync for all Writer cross-device sync, Dexie Cloud, encryption,
  escrow and provider work. Trigger terms: "cloud", "dexie cloud", "cloud sync",
  "encryption", "escrow", "passphrase".
metadata:
  version: "2.0.0"
  tags: "writer-sync,cloud,routing"
---

# Route cloud work to Writer Sync

Use [`work-on-writer-sync`](../work-on-writer-sync/SKILL.md). It is the canonical skill for
the sync engine and every provider, including Dexie Cloud. Do not maintain architecture or
guardrails in this compatibility route.

For failure investigation, use
[`debug-writer-sync`](../debug-writer-sync/SKILL.md).
