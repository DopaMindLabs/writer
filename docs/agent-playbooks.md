# Agent Playbooks

> Tool-vendor-agnostic. Replace "search for symbol X" with whichever grep/AST/graph
> tool is available. Steps are ordered; stopping rules are explicit.

---

## Overview

Five core workflows cover all agent tasks:

| Workflow | When to use |
|---|---|
| **Locate** | Find where a symbol, concept, or behaviour lives |
| **Plan** | Design a change before touching code |
| **Audit** | Review correctness, safety, or standards compliance |
| **Change** | Implement a planned, scoped change |
| **Handover** | Pause or pass in-progress work to another session or agent |

---

## Runbooks and your todo list

Each workflow below is a **runbook**: an ordered list of steps with explicit stopping
rules. A runbook is the natural basis for a todo list — so before you start a workflow,
seed your todo list from its **Steps**, one item per step, in order, then extend it with
the work you discover (see [AGENTS.md § "Todo tracking"](../AGENTS.md)). Work the list top
to bottom, keep exactly one item in progress, and mark an item done only when it is
verified. The list is what a **Handover** (Workflow 5) captures, so keeping it current is
what makes any of these workflows safe to pause and resume.

---

## Workflow 1 — Locate

**Goal:** Produce a precise file:line table for a symbol, feature, or concept.

### Steps

1. **Read `docs/architecture.md` first.** Identify the relevant layer (DB, lib, hooks,
   components) and the canonical boundary file for the domain.
2. **Search for the symbol name** across `src/`. Include TypeScript definition sites
   (`interface`, `type`, `const`, `class`, `function`) and re-export sites.
3. **Resolve aliases** (`@/`, `@components/`): check `tsconfig.app.json` `paths` if a
   path import is opaque.
4. **Follow the import graph** one level down: identify direct consumers (callers) and
   one level up: identify what the file depends on.
5. **Find tests**: for every source file found, check for `*.test.ts` / `*.test.tsx`
   alongside it. If the domain has e2e coverage, note the relevant spec file from the
   testing map (`docs/architecture.md §10`).
6. **Output:** file path, line number, symbol type, brief description, test file (or
   "none"), and a one-line dependency summary.

### Stopping rules

- Stop only after definitions, direct callers, adjacent tests, and relevant side effects
  are complete. Do not chase unrelated transitive imports beyond two hops.
- If more than five definition sites are found, report them and ask for narrowing.

---

## Workflow 2 — Plan

**Goal:** Produce a change plan that is safe to hand to a coder without further
clarification.

### Steps

1. **Run Locate** on every symbol the change will touch.
2. **Identify the layer** the change belongs to (see `docs/architecture.md §2`). Verify
   dependency direction: changes must not introduce upward dependencies.
3. **Check canonical boundaries:** does the change cross a public boundary
   (`cloudClient.ts`, `docRepository.ts`, `collab/types.ts`, `EditorFacade.tsx`)?
   If so, the plan must update the boundary's interface and all consumers.
4. **Find existing tests** for all touched files. The plan must state which tests will
   need to change or be added.
5. **Check for side effects:**
   - Does the change affect the CRDT / `docUpdates` log? → collab tests.
   - Does the change affect `docs.body` writes? → reconciliation tests.
   - Does the change affect the DB schema (`STORES`)? → `tableRules.ts`, cloud
     middleware tests, migration plan.
   - Does the change affect the UI? → design system compliance (`docs/design-system.md`),
     a11y layer, stories.
6. **Write the plan** as an ordered list of file edits. Each step: file path, what
   changes (interface, implementation, test), and why.

### Output contract

```
## Plan: <title>

### Touched files
- src/... — <what changes>

### Test impact
- src/...test.ts — <add / update / unchanged>

### Risks / open questions
- ...
```

### Stopping rules

- Stop and ask if: the change crosses more than two canonical boundaries, modifies the
  DB schema, or requires a new dependency.

---

## Workflow 3 — Audit

**Goal:** Assess a file, diff, or feature for correctness and standards compliance.

### Steps

1. **Read the relevant sections of `AGENTS.md`** (Coding standards, Testing philosophy,
   Accessibility) before reading the code.
2. **Locate** every symbol under review.
3. **Check coding standards** (`CODING_STANDARDS.md`):
   - Function length ≤ 60 lines, ≤ 3 params (else options object).
   - Cyclomatic complexity ≤ 12; nesting ≤ 4.
   - No `any`, no `@ts-ignore`.
   - No floating promises; handle every nullable return.
   - `const` by default; no module-level mutable state.
4. **Check domain invariants** (from `docs/architecture.md`):
   - `collab/types.ts` imports nothing from `yjs`.
   - Only `docRepository.ts` writes `docs` rows.
   - Only `cloudClient.ts` is imported for cloud observables/actions.
   - The encryption middleware is installed above the cloud addon, not below.
5. **Check test coverage:** every changed behaviour must have a unit test; every
   user-facing flow must have an e2e spec or a justified exception.
6. **Check for regressions:** does the change alter `docs.body` semantics, CRDT seeding,
   or the reconciliation path without updating `reconcile.ts`, `snapshot.ts`, or
   `seed.ts`?
7. **Output:** one finding per line, in the format defined by
   [`audit-writer-change`](../.agents/skills/audit-writer-change/SKILL.md)
   ("Evidence-only severity findings"):

```
SEVERITY  FILE:LINE  SYMBOL         FINDING
critical  src/…:42   updateDocBody  Floating promise — missing await
```

### Severity levels

| Label | Meaning |
|---|---|
| `critical` | Data loss, security, crash — must fix before merge |
| `major` | Behaviour regression, a11y failure, standards violation |
| `minor` | Style, stale comment, naming; fix encouraged |

Return only evidenced findings from the code under review; do not list
observations that are not findings.

---

## Workflow 4 — Change

**Goal:** Implement a plan precisely, with no unplanned scope creep.

### Steps

1. **Read the plan** (from Workflow 2). Treat it as a contract.
2. **Read every file before editing it.** Match existing style, imports, and naming.
3. **Implement one step at a time.** After each file edit, re-read the changed region.
4. **Run self-check:** do imports resolve? Are types consistent? Have you introduced
   any `any` or floating promise?
5. **Check for test impact:** if the change alters a public signature or a behaviour
   with existing tests, update the tests in the same step.
6. **Verify targeted invariants** (from Audit §3–§6) before finishing.
7. **Run proportionate verification**: targeted lint/tests first, then broader typecheck or
   suites when risk warrants. Do not commit or push unless explicitly requested.

### Targeted verification (minimal reads)

After implementing each step, verify only the directly affected call sites:
- Find callers of the changed function/interface (one search, not a full audit).
- Confirm the test file compiles (read it; check imports and types).
- If the change touches `docs.body` or `docUpdates`, re-read `reconcile.ts` to confirm
  the invariant still holds.

---

## Workflow 5 — Handover

**Goal:** Package in-progress work so another session or agent can resume it without loss.

### Steps

1. **Reconcile the todo list with reality.** Mark finished items done, mark the item you
   were on in-progress, and add any outstanding runbook steps or discovered work you had
   not yet captured. Leave anything unverified open — never report a gate green that has
   not passed.
2. **Record the branch and working-tree state** exactly: branch name, whether changes are
   committed / staged / working-tree-only, and the last verification command and its result.
3. **Capture the context the next agent needs:** key files touched and why, decisions made,
   and the analogue or runbook being followed.
4. **Carry every unanswered stop-and-ask question forward** prominently — never drop it or
   guess past it.
5. **Write the handover** in the format from
   [`handover-writer-work`](../.agents/skills/handover-writer-work/SKILL.md).

### Stopping rules

- Do not commit, push, or open a PR merely to produce a handover unless the user asked —
  the handover is a record of state, not a new change.
- The handover is complete only when the todo list it contains is accurate; a handover that
  overstates progress is worse than none.

---

## Domain routing table

Use this to decide which files are in scope before running any workflow.

| Domain | Primary files | Tests | E2E specs |
|---|---|---|---|
| **Editor / collab** | `src/editor/EditorFacade.tsx`, `src/editor/LexicalEditor.tsx`, `src/hooks/useCollab.ts`, `src/lib/collab/yjs/YjsProvider.ts`, `src/lib/collab/yjs/providerFactory.ts` | `src/editor/*.test.tsx`, `src/hooks/useCollab.test.ts`, `src/lib/collab/**/*.test.ts` | `e2e/editor.spec.ts`, `e2e/multi-tab-sync.spec.ts` |
| **Document lifecycle** | `src/lib/docs/docRepository.ts`, `src/lib/docs/index.ts`, `src/hooks/useDocuments.ts`, `src/lib/docs/emptyBody.ts` | `src/lib/docs/*.test.ts`, `src/hooks/useDocuments.test.ts` | `e2e/persistence.spec.ts`, `e2e/sidebar-docs.spec.ts` |
| **CRDT seeding / snapshot** | `src/lib/collab/yjs/seed.ts`, `src/lib/collab/yjs/snapshot.ts`, `src/lib/collab/yjs/DexieCollabStore.ts`, `src/lib/collab/collabStore.ts` | `src/lib/collab/yjs/seed.test.ts`, `src/lib/collab/yjs/snapshot.test.ts`, `src/lib/collab/yjs/DexieCollabStore.test.ts` | `e2e/cloud-crdt-recovery.spec.ts` |
| **Cloud / encryption** | `src/lib/cloud/cloudClient.ts`, `src/lib/cloud/reconcile.ts`, `src/lib/cloud/escrowReconcile.ts`, `src/lib/cloud/crypto/middleware.ts`, `src/lib/cloud/crypto/keyStore.ts` | `src/lib/cloud/**/*.test.ts` | `e2e/cloud-sync.spec.ts`, `e2e/cloud-crdt-recovery.spec.ts` |
| **DB / schema** | `src/db/schema.ts`, `src/db/stores.ts`, `src/db/LoremDB.ts`, `src/db/buildDb.ts`, `src/lib/cloud/crypto/tableRules.ts` | `src/db/**/*.test.ts`, `src/lib/cloud/crypto/tableRules.test.ts` | — |
| **UI / a11y** | `src/components/ui/`, `src/theme/a11y-prefs.ts`, `src/theme/A11yPreferenceProvider.tsx`, `src/store/a11y.ts` | `src/theme/**/*.test.ts`, `src/store/a11y.test.ts` | `e2e/accessibility-*.spec.ts`, `e2e/a11y-axe.spec.ts` |
| **Tests / docs** | `e2e/`, `docs/`, `src/help/content/en/`, `src/lib/help/registry.ts` | `src/lib/help/registry.test.ts` | — |
| **Folder sync** | `src/lib/sync/`, `src/hooks/useSync.ts`, `src/hooks/useFolderSyncActions.ts` | `src/hooks/useSync.test.tsx` | `e2e/sync-settings.spec.ts` |
