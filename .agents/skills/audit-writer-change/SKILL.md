---
name: audit-writer-change
description: >
  Diff-first, evidence-only code audit for Writer changes. Use when reviewing a PR,
  branch diff, or changed file set for correctness, security, accessibility, and
  persistence safety. Trigger terms: "audit", "review", "check", "risks in", "is
  this safe", "what did this change".
metadata:
  version: "1.7.0"
  tags: "review,audit,security,accessibility"
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

- **Root cause.** For a fix, require evidence that the change repairs the owning invariant or
  failure source. Flag retries, delays, fallback values, duplicate paths, compatibility
  branches and one-off conditions that merely hide the symptom.
- **Types.** No `any`, `@ts-ignore`, `@ts-expect-error`, unsafe escape hatch, or broad type in
  place of a known domain shape. Allow `unknown` only at a genuinely untyped boundary and
  require it to be validated and narrowed there before it reaches domain/service/component
  APIs.
- **Null safety.** Every nullable result is handled; no implicit `undefined`
  reaches a caller that does not expect it.
- **Promises.** No floating promises; every `async` call is `await`-ed or
  explicitly fire-and-forget with a comment.
- **Invariants.** Untrusted input is validated with `invariant()` or
  `assertNever()` at the boundary.
- **Immutability.** Zustand state updates are pure (new object); no mutation of
  shared state or function parameters.
- **Comments.** Flag inline comments that narrate obvious code or preserve debugging/review
  prose. Keep only non-obvious reasons, invariants or external constraints. When documentation
  is needed, require concise TSDoc/JSDoc in British English.

### 5. Apply the security checklist

- For every security-sensitive or trust-boundary change, review the applicable
  [OWASP Top 10:2025](https://owasp.org/Top10/) risks. Treat the Top 10 as a
  baseline taxonomy, not a complete threat model, and map a finding to an OWASP
  category only when the mapping is genuine.
- Include client-side boundaries: local persistence, imports and rendered content,
  browser APIs, cryptography, peer/provider traffic, dependencies and build/config
  changes. Security review is not limited to server code.
- No hard-coded secrets or keys. Validate untrusted input at its boundary and do
  not expose sensitive values through logs, errors, URLs or persisted plaintext.
- For synced data, preserve the encryption, trust and replication invariants in
  `work-on-writer-sync`; do not create a path around the provider boundary.
- Require a root-cause fix. Add a negative or adversarial regression test for the
  security invariant when the changed boundary is testable.

### 6. Apply the accessibility checklist (user-facing or interaction-affecting changes)

- Check the changed surface against the applicable targets in `ACCESSIBILITY.md`. For
  contrast, require AA in `light`/`dark` and AAA enhanced contrast in `hc-light`/`hc-dark`;
  do not treat an automated scan as conformance proof.
- Treat accessibility as functional behaviour, not a JSX checklist. Settings,
  shortcuts, focus/state transitions, errors, status updates, timing, gestures,
  preference persistence and recovery flows can all affect accessibility.
- Every interactive element is keyboard-operable with a visible focus indicator.
- No hard-coded values for properties that design tokens or preferences govern
  (colours, font sizes, transitions, focus rings).
- Keyboard shortcuts use `event.metaKey || event.ctrlKey` (never one alone).
- New UI includes a `.stories.tsx` with the Storybook a11y addon enabled.

### 7. Apply the persistence checklist (DB / schema changes)

- **Non-indexed field additions** (new fields on an existing store that add no
  index) do **not** require a Dexie version bump — the store spec in `STORES` is
  unchanged and Dexie's schema validation is index-based, not field-based.
- **Store or index changes** (new table, new index, renamed primary key) stay under the
  single declared `version(1)` and require a schema test. Do not add an upgrade/migration
  path unless the user explicitly changes Writer's no-legacy-support policy.
- CRDT-seeded tables: any new row creation must call `seedDocCrdt` after the
  Dexie transaction commits (never inside it).
- Replication: classify a new table in `writerTablePolicy.ts` when that integration exists;
  otherwise confirm its current `UNSYNCED`/synced category explicitly.

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

## PR review comment contract

When posting a finding on a pull request, keep one actionable problem per comment.
Write it so the author can implement the fix without reconstructing the review:

```md
Problem: <the concrete defect, with the affected condition>

Why it matters: <user, data, security, accessibility or maintenance consequence>

Proposed fix: <root-cause technical direction; include pseudocode when it removes ambiguity>

Acceptance criteria:
- [ ] <observable or invariant outcome>
- [ ] <regression test or verification>
```

Keep the problem and impact concise. Add further acceptance criteria only when they
clarify distinct edge cases. For a security finding, include the applicable OWASP
Top 10 category when there is one; for an accessibility finding, name the applicable
WCAG success criterion. Do not pad a trivial fix with ceremony.

## Track this work as a todo list

Before you start, seed a todo list from the Audit sequence above — one item per step, plus
one per checklist you still have to clear — and work it top to bottom (see
[AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Mark exactly one item in-progress as you
begin it and completed the moment it is verified done, and append any newly discovered work
(for example a finding that needs a deeper trace) as new items. Keep the list current: it is
the source of truth for what remains and the backbone of any
[handover](../handover-writer-work/SKILL.md).
