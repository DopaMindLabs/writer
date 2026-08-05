---
name: implement-writer-change
description: >
  Execute a reviewed, exact-file Writer change using the repository's canonical
  coding standards, navigation and domain skills. Use after plan-writer-change
  produces an approved plan, or for a narrow explicit implementation request.
  Trigger terms: "implement", "code it", "make the change", "write the code",
  "execute the plan".
metadata:
  version: "1.3.0"
  tags: "implementation,coding"
---

# Implement a Writer Change

## Pre-conditions

Use an approved `plan-writer-change` plan for non-trivial or cross-boundary work.
A narrow, unambiguous fix may proceed directly when the user's request defines the scope.

Read [`CODING_STANDARDS.md`](../../../CODING_STANDARDS.md) before changing code. It is
the canonical source for code structure and engineering rules; do not duplicate those
rules here.

## 1. Navigate before editing

Use `navigate-writer-codebase` to confirm each definition, caller, test and persistence
side effect named in the plan before the first edit. That skill also owns CodeGraph
availability detection and the exact-search/LSP fallback; keep using it even when graph
tooling is unavailable.

## 2. Load the matching domain guidance

Load every skill whose boundary the change touches:

- `build-writer-ui` for components, interaction, design-system or Help Center work.
- `change-writer-persistence` for `src/db/`, archives, persistence or document writes.
- `work-on-editor-collaboration` for `src/lib/collab/` or editor CRDT behaviour.
- `work-on-writer-sync` for sync engine, pairing, providers, encryption, replication,
  escrow or cross-device behaviour.
- `test-writer-changes` whenever behaviour or tests change.

For any user-facing or interaction-affecting behaviour, read
[`ACCESSIBILITY.md`](../../../ACCESSIBILITY.md) and plan to meet every applicable WCAG 2.2
A, AA and AAA criterion. This includes settings, shortcuts, status/error behaviour,
timing, gestures, focus and persisted preferences — not only rendered components.

For a security-sensitive or trust-boundary change, apply the security baseline in
`CODING_STANDARDS.md` and the checklist in `audit-writer-change`. Use the feature threat
model where one exists; OWASP Top 10 is a baseline, not a substitute for it.

## 3. Implement the smallest complete change

Touch only files required by the approved plan or explicit request. Read every file in
full before its first edit and preserve its established style. Apply the root-cause,
proper-typing and comment-discipline gates in `CODING_STANDARDS.md`: repair the owning
invariant rather than masking its symptom; give known data concrete domain types; narrow
genuinely untyped input at its boundary; and keep comments only where they explain a
non-obvious reason or contract. Use concise British-English TSDoc/JSDoc when documentation
is necessary.

Do not ship a workaround, hack, retry, delay, fallback, duplicate path or special case that
only makes the visible symptom disappear. If the root cause cannot be repaired within the
authorised scope, stop and report the blocker.

Keep tests beside the behaviour they prove and follow `test-writer-changes`' TDD and
verification workflow. Newly discovered work that materially changes behaviour, risk or
scope is a stop-and-ask point rather than an automatic extension of the plan.

## 4. Verify

Use `test-writer-changes` to choose the narrowest relevant checks first, then run the
repository-required gates from `AGENTS.md` for the final changed scope. Accessibility
and security-sensitive changes also require their domain-specific manual or adversarial
checks; a green automated suite is not proof of WCAG AAA or of security.

Stop and ask before removing or weakening any lint rule, size limit, or coverage floor.

## After implementation

Report each changed file, verification commands run, and tests added or updated.
Do not commit or push unless the user explicitly requests it.

## Track this work as a todo list

Before you start, seed a todo list from the approved plan's navigation, file edits and
verification — one item per planned edit and check — and work it top to bottom (see
[AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Mark exactly one item in-progress as you
begin it and completed the moment it is verified done. Newly discovered work that would
materially expand scope does not silently become a todo item — stop for approval first (see
step 3 above), then add it. Keep the list current: it is the source of truth for what remains
and the backbone of any [handover](../handover-writer-work/SKILL.md).
