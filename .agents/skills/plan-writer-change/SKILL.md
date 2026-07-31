---
name: plan-writer-change
description: >
  Produce an exact-file change plan for any Writer feature or fix before touching
  code. Use when asked to plan, design, or scope a change to Writer. Trigger terms:
  "plan", "design", "how would I", "what files", "scope", "impact", "before I code".
version: 1.1.0
tags: [planning, architecture, impact-analysis]
---

# Plan a Writer Change

## Required planning steps (execute in order)

### 1. Locate the behavioural source of truth
Read the relevant section of `docs/technical-specification.md` before doing
anything else. The spec is the authoritative description of intended behaviour.

### 2. Trace the full feature stack
Start from the route in `src/App.tsx` and walk down:

```
Route (src/lib/routes.ts)
  → Screen (src/screens/)
    → Hook / facade (src/hooks/, src/lib/)
      → Store (src/store/) or DB (src/db/)
        → Tests (*.test.ts / *.test.tsx)
          → Help article (src/help/content/en/*.md)
            → Spec section (docs/technical-specification.md)
```

### 3. Trace an analogue
Find one existing feature that is structurally similar. Cite its files, contracts,
and test structure. The analogue establishes the precedent this change should follow.

### 4. Assess blast radius
For each file you intend to touch, list:
- Direct callers / importers
- Shared contracts (interfaces, exported types)
- Tests that assert the current behaviour
- Whether a DB schema migration is needed (see `change-writer-persistence` skill)
- Whether collab CRDT state is affected (see `work-on-editor-collaboration` skill)
- Whether cloud sync is affected (see `work-on-cloud-sync` skill)

### 5. Produce an exact-file plan

Output format:

```
## Goal
<one sentence>

## Analogue
<existing feature> — see <files>

## Files to change
1. <path> — <reason and change summary>
2. …

## New files (if any)
- <path> — <reason>

## Contracts / interfaces affected
- <InterfaceName> in <file> — <change>

## Tests to add or update
- <test file> — <what to assert>

## Help articles to add or update
- src/help/content/en/<slug>.md — <change>

## Spec sections to update
- docs/technical-specification.md §<section> — <change>

## DB schema change?
<none / non-indexed field only / `STORES` change — plus the `writerTablePolicy.ts`
classification for any new table. Never plan a new Dexie `version(n)`.>

## Verification commands
- npm run typecheck
- npm run lint src/<changed files>
- npm run test:run
- npm run test:e2e (if UI-facing)
```

Do not begin implementation until this plan is reviewed and approved.

## Hard stops

- Never plan to add legacy support without explicit user approval.
- Never plan to weaken a lint rule, coverage floor, or type safety boundary.
- If a schema change is needed, include the schema-change checklist from
  `change-writer-persistence` in the plan.
- Never plan a new Dexie `version(n)`, an `upgrade()` callback, or a migration: Writer has
  no users and keeps no backward compatibility.

## Track this work as a todo list

Before you start, seed a todo list from the Required planning steps above — one item per step
— and work it top to bottom (see [AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Mark
exactly one item in-progress as you begin it and completed the moment it is verified done,
and append each symbol or boundary the blast-radius pass turns up as a new item. The
exact-file plan you produce doubles as the runbook the implementer seeds *their* todo list
from, so leave it ordered and complete. Keep the list current: it is the source of truth for
what remains and the backbone of any [handover](../handover-writer-work/SKILL.md).
