---
name: navigate-writer-codebase
description: >
  Precise, evidence-based navigation of the Writer codebase. Use when locating a
  symbol definition, tracing callers or dependants, finding tests, or mapping a
  feature flow. Trigger terms: "find", "locate", "where is", "who calls", "trace",
  "navigate", "callers of", "dependants", "tests for".
version: 1.1.0
tags: [navigation, exploration, code-intelligence]
---

# Navigate the Writer Codebase

## Code-intelligence policy

**Prefer TypeScript definition/references and exact text/file search as the primary
tools.** Use semantic/embedding search only when the exact symbol name is unknown —
state explicitly when falling back to it.

If a call-graph tool (e.g. `code-review-graph`) is installed and indexed, prefer it
for callers, impact radius, and affected flows. If it is not available, exact search
and LSP references are sufficient — never require a specific vendor tool.

Generated indexes are advisory and keyed by commit; architecture decisions remain
human-written in `docs/architecture.md`.

## Navigation order (always follow this sequence)

1. **Exact lookup first.** Search by filename or symbol name (TypeScript `Go to
   Definition`, text search). Never start with a broad read of the whole directory.
2. **Definition → references.** From the definition, find all import sites and
   call sites via `Go to References` or `rg '<Symbol>'`.
3. **Callers → dependants.** Trace one level up the call graph from each reference.
   Complete callers and tests before stopping.
4. **Adjacent tests.** The test file mirrors the source file: `foo.ts` →
   `foo.test.ts`, `foo.tsx` → `foo.test.tsx`. Read it for invariants and
   expected behaviour.
5. **Persistence side effects.** Check whether the symbol touches `src/db/`,
   `src/lib/docs/`, or `src/lib/collab/` — these have cascading effects.
6. **Semantic search last.** Use keyword or embedding search only when the exact
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
