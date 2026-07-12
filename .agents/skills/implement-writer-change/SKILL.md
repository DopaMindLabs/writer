---
name: implement-writer-change
description: >
  Execute a reviewed, exact-file plan in Writer. Use after plan-writer-change
  produces an approved plan. Trigger terms: "implement", "code it", "make the
  change", "write the code", "execute the plan".
version: 1.1.0
tags: [implementation, coding]
---

# Implement a Writer Change

## Pre-conditions

Use an approved `plan-writer-change` plan for non-trivial or cross-boundary work.
A narrow, unambiguous fix may proceed directly when the user's request defines the scope.

## Implementation rules

### Scope
Touch only files required by the approved plan or explicit request. Stop for approval
when newly discovered work would materially expand behaviour, risk, or scope.

### Power-of-Ten rules (all apply to new and edited code)
1. Simple control flow — cyclomatic complexity ≤ 12; no unbounded recursion; nesting ≤ 4.
2. Bounded loops — every loop has an obvious upper bound.
3. No resource leaks — clean up `useEffect` side effects, event listeners, and timers.
4. Small functions — ≤ 60 lines, ≤ 3 parameters (use an options object beyond 3).
5. Validate at boundaries — use `invariant()` and `assertNever()` from `@/lib/invariant`.
6. Smallest data scope — `const` by default; no module-level mutable state.
7. No floating promises — await work or use an explicit, safely handled fire-and-forget path.
8. No type escape hatches or suppressions — no `any`, `@ts-ignore`, `@ts-expect-error`,
   `eslint-disable*`, or `nasa-exception`. Fix the code instead.
9. Immutability — Zustand updates return new state; never mutate parameters or shared objects.
10. Zero lint / type errors — run targeted checks after the logical change is complete.

### One component per file
Each React component lives in its own PascalCase file with a co-located `.test.tsx`
and `.stories.tsx`. Never add a second component to an existing file.

### File read before edit
Read every file in full before the first edit. Match the existing style, import order,
and naming conventions exactly.

### Verification commands (run in order after changes are complete)
```
npm run typecheck
npx eslint src/<changed-files> --max-warnings=0
npm run test:run
npm run test:e2e   # for UI-facing changes only
```

## Domain skills

Load these before editing the matching boundary:
- `work-on-editor-collaboration` for `src/lib/collab/` or editor CRDT behaviour.
- `change-writer-persistence` for `src/db/`, archives, or document writes.
- `work-on-cloud-sync` for cloud, encryption, escrow, or reconciliation.
- `test-writer-changes` before adding or changing tests.

Stop and ask before removing or weakening any lint rule, size limit, or coverage floor.

## After implementation

Report each changed file, verification commands run, and tests added or updated.
Do not commit or push unless the user explicitly requests it.

## Track this work as a todo list

Before you start, seed a todo list from the approved plan's file edits and the verification
commands — one item per planned edit and per command — and work it top to bottom (see
[AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Mark exactly one item in-progress as you
begin it and completed the moment it is verified done. Newly discovered work that would
materially expand scope does not silently become a todo item — stop for approval first (see
Scope above), then add it. Keep the list current: it is the source of truth for what remains
and the backbone of any [handover](../handover-writer-work/SKILL.md).
