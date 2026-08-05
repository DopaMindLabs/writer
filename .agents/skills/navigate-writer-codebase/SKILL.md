---
name: navigate-writer-codebase
description: >
  Precise, evidence-based navigation of the Writer codebase. Use when locating a
  symbol definition, tracing callers or dependants, finding tests, or mapping a
  feature flow. Trigger terms: "find", "locate", "where is", "who calls", "trace",
  "navigate", "callers of", "dependants", "tests for".
metadata:
  version: "1.3.0"
  tags: "navigation,exploration,code-intelligence"
---

# Navigate the Writer Codebase

## Code-intelligence policy

At the start of non-trivial navigation, check separately whether a CodeGraph/call-graph
capability is installed/callable and whether it is indexed for the current commit. Tell
the user the result in one line:

```text
CodeGraph: available and indexed — using it for impact tracing.
CodeGraph: installed but not indexed here — continuing with exact search/LSP; index it for graph-assisted tracing.
CodeGraph: not installed — continuing with exact search/LSP; install CodeGraph for graph-assisted tracing.
```

Never claim it is installed merely because an index or configuration file exists: confirm
the capability can actually be called. If it is absent or unindexed, do not block. Suggest
installation or indexing once when graph-assisted impact analysis would help, then fall back
to this skill's exact-search and TypeScript-reference workflow.

When available, prefer CodeGraph for callers, impact radius and affected flows, and verify
important results against source. Otherwise prefer TypeScript definitions/references and
exact text/file search. Use semantic/embedding search only when the exact symbol name is
unknown, and state explicitly when falling back to it.

Generated indexes are advisory and keyed by commit; architecture decisions remain
human-written in `docs/architecture.md`.

## Navigation order (always follow this sequence)

1. **Confirm code intelligence.** Perform the CodeGraph availability/index check above.
2. **Exact lookup first.** Search by filename or symbol name (TypeScript `Go to
   Definition`, text search). Never start with a broad read of the whole directory.
3. **Definition → references.** From the definition, find all import sites and
   call sites via `Go to References` or `rg '<Symbol>'`.
4. **Callers → dependants.** Trace one level up the call graph from each reference.
   Complete callers and tests before stopping.
5. **Adjacent tests.** The test file mirrors the source file: `foo.ts` →
   `foo.test.ts`, `foo.tsx` → `foo.test.tsx`. Read it for invariants and
   expected behaviour.
6. **Persistence side effects.** Check whether the symbol touches `src/db/`,
   `src/lib/docs/`, or `src/lib/collab/` — these have cascading effects.
7. **Semantic search last.** Use keyword or embedding search only when the exact
   name is unknown. State explicitly that you are falling back to semantic search.

## Feature flow lookup

Router entry is `src/App.tsx`. Trace: route → `src/screens/<screen>.tsx` →
hook/facade → store (`src/store/`) / DB (`src/db/`) → tests.

Route constants live in `src/lib/routes.ts`.

## Evidence output format

For every located symbol, report:

```
Symbol:      <exact name>
File:        <path>:<line>
Public via:  <index / facade / re-export, if any>
Callers:     <file:line, …>
Tests:       <test file:line>
Persistence: <tables or stores written, if any>
```

Return only evidence; never return guesses or "probably".

## Boundaries

- **`src/editor/EditorFacade.tsx`** — public facade over Lexical.
  `WriteSurface.tsx` (`src/components/surfaces/WriteSurface.tsx`) is the **sole
  production direct importer and caller** of `<Editor>` from `EditorFacade.tsx`.
  `Write`, `Read`, and `Split` screens use `<WriteSurface>` and are therefore
  indirect callers of `EditorFacade`. `FocusScreen` is a client-side redirect
  to the Write route with `?focus=1` — it mounts no editor of its own.
- **`src/lib/collab/yjs/`** — Yjs engine internals; callers use the engine-agnostic
  `CollabStore` / `SyncTransport` interfaces from `src/lib/collab/types.ts`.
- **`src/lib/cloud/cloudClient.ts`** — the only cloud module UI components import.

## Key entry points for common lookups

| Area | Entry point |
|------|-------------|
| Document write path | `src/lib/docs/docRepository.ts` |
| Document read | `useDocument` in `src/hooks/useDocuments.ts` |
| Editor surface | `src/components/surfaces/WriteSurface.tsx` |
| Editor facade | `src/editor/EditorFacade.tsx` |
| Collab config | `src/hooks/useCollab.ts` |
| Cloud facade | `src/lib/cloud/cloudClient.ts` |
| DB schema | `src/db/stores.ts`, `src/db/schema.ts` |
| Help registry | `src/lib/help/registry.ts` |
| Routes | `src/lib/routes.ts` |
| UI store | `src/store/ui.ts` |
| A11y store | `src/store/a11y.ts` |

## Track this work as a todo list

Before you start, seed a todo list from the Navigation order above — one item per step — and
work it top to bottom (see [AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Mark exactly
one item in-progress as you begin it and completed the moment it is verified done, and append
each fresh symbol or caller you must still trace as a new item so nothing is dropped when the
graph fans out. Keep the list current: it is the source of truth for what remains and the
backbone of any [handover](../handover-writer-work/SKILL.md).
