---
name: debug-cloud-sync
description: >
  Compatibility route for existing AGENTS.md entries that still name cloud-sync
  debugging. Load debug-writer-sync for live Dexie Cloud, peer and engine sync
  diagnosis. Trigger terms: "sync hangs", "sync loop", "device limit",
  "reproduce sync bug", "cloud harness".
metadata:
  version: 2.0.0
  tags: [writer-sync, cloud, debugging, routing]
---

# Route cloud debugging to Writer Sync

Use [`debug-writer-sync`](../debug-writer-sync/SKILL.md). It contains the canonical sync
diagnostic workflow, including the live Dexie Cloud harness and its destructive-operation
guardrails.
