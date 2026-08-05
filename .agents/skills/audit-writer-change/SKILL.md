---
name: audit-writer-change
description: >
  Diff-first, evidence-only code audit for Writer changes. Use when reviewing a PR,
  branch diff, or changed file set for correctness, security, accessibility, and
  persistence safety. Trigger terms: "audit", "review", "check", "risks in", "is
  this safe", "what did this change".
version: 1.3.0
tags: [review, audit, security, accessibility]
---

# Audit a Writer Change

## Audit sequence

### 1. Scope the diff first
Read the exact changed lines first and identify every changed symbol. Inspect unchanged
callers and dependencies when needed to assess impact, but do not report unrelated
pre-existing findings — only problems introduced or exposed by the diff.

### 2. Map changed symbols to their dependants
For each changed exported symbol, trace its callers and check whether the change
is backward-compatible with each call site.

### 3. Check execution flows
Identify which user-facing flows the changed code participates in. Trace from
the screen or hook that owns the flow down to the changed symbol and back up.

### 4. Apply the correctness checklist

- **Types.** No `any`, `@ts-ignore`, `@ts-expect-error`, or unsafe escape hatch.
  Safe `unknown` narrowing is allowed; flag only casts that bypass validation.
- **Null safety.** Every nullable result is handled; no implicit `undefined`
  reaches a caller that does not expect it.
- **Promises.** No floating promises; every `async` call is `await`-ed or
  explicitly fire-and-forget with a comment.
- **Invariants.** Untrusted input is validated with `invariant()` or
  `assertNever()` at the boundary.
- **Immutability.** Zustand state updates are pure (new object); no mutation of
  shared state or function parameters.

### 5. Apply the security checklist

- No hard-coded secrets, keys, or URLs.
- No plaintext persistence of sensitive data (encryption must flow through
  `src/lib/cloud/crypto/middleware.ts` for synced tables).
- No new code paths that bypass the `UNSYNCED` table list.

### 6. Apply the accessibility checklist (UI changes only)

- Every interactive element is keyboard-operable with a visible focus indicator.
- No hard-coded values for properties that design tokens or preferences govern
  (colours, font sizes, transitions, focus rings).
- Keyboard shortcuts use `event.metaKey || event.ctrlKey` (never one alone).
- New UI includes a `.stories.tsx` with the Storybook a11y addon enabled.

### 7. Apply the persistence checklist (DB / schema changes)

- **Non-indexed field additions** (new fields on an existing store that add no
  index) do **not** require a Dexie version bump — the store spec in `STORES` is
  unchanged and Dexie's schema validation is index-based, not field-based.
- **Store or index changes** (new table, new index, renamed primary key) require
  a monotonically higher `version()` in `src/db/LoremDB.ts` plus a migration test.
- CRDT-seeded tables: any new row creation must call `seedDocCrdt` after the
  Dexie transaction commits (never inside it).
- Synced vs unsynced: new tables default to synced unless added to `UNSYNCED` in
  `src/db/buildDb.ts`. Confirm the correct category explicitly.

### 8. Apply the help-content checklist (user-facing changes)

- Check the English help article against `build-writer-ui`'s article structure.
  Make the user's primary task easy to find before alternatives or edge cases.
- Lead with what the feature does, why it helps and any useful differentiator.
  Mention limitations only where they affect a decision, safety or recovery.
- Use exact UI labels and verified behaviour. Give each numbered step one action.
- Keep setup, normal use, troubleshooting, privacy and related links separate
  where those sections apply.
- Use British English, short paragraphs and direct phrasing. Flag repeated
  reassurance, protocol narration and implementation detail.
- Check adjacent help articles for contradictions about storage, sync, privacy
  or availability.

## Evidence-only severity findings

Report each finding as:

```
SEVERITY  FILE:LINE  SYMBOL         FINDING
critical  src/…:42   updateDocBody  Floating promise — missing await
major     src/…:17   MyComponent    Hard-coded hex colour #1a1a1a
minor     src/…:88   seedDoc        Comment refers to removed function
```

Severity levels: `critical` (data loss, security, crash), `major` (behaviour
regression, a11y failure), `minor` (style, stale comment, naming).

Return only evidenced findings from the changed code. Do not list observations
that are not findings, and do not flag pre-existing issues outside the diff.

## Track this work as a todo list

Before you start, seed a todo list from the Audit sequence above — one item per step, plus
one per checklist you still have to clear — and work it top to bottom (see
[AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Mark exactly one item in-progress as you
begin it and completed the moment it is verified done, and append any newly discovered work
(for example a finding that needs a deeper trace) as new items. Keep the list current: it is
the source of truth for what remains and the backbone of any
[handover](../handover-writer-work/SKILL.md).
