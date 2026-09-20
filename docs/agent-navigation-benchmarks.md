# Agent Navigation Benchmarks

> Five executable benchmark cases for the collaborative-editing architecture.
> Each case specifies: the task, the expected file/symbol trace, matching tests,
> and success criteria. A passing agent completes the trace with minimal reads
> and discovers the full impact set.

---

## How to use

Run each benchmark as a navigation-only task (no edits). Score by:
- **Files read** — lower is better; the expected trace is the target minimum.
- **Impact completeness** — did the agent find every affected layer?
- **False positives** — files read that are not in the impact set.

A result is passing when: files read ≤ 1.5× expected, all expected files discovered,
no missed canonical boundaries.

---

## Case 1 — Document save path

**Task:** Trace how a keystroke reaches both IndexedDB representations and find tests.

### Expected trace

```
src/editor/LexicalEditor.tsx             — mounts CollaborationPlugin + EditorPlugins
src/editor/EditorPlugins.tsx              — hosts AutosavePlugin
src/editor/plugins/AutosavePlugin.tsx     — debounced serialised onChange
src/components/surfaces/WriteSurface.tsx  — handleChange()
src/lib/docs/docRepository.ts             — updateDocBody() → db.docs.update()
src/lib/collab/yjs/YjsProvider.ts         — persistAndRelayUpdate() on Yjs update
src/lib/collab/yjs/DexieCollabStore.ts    — appendUpdate() → db.docUpdates.add()
src/lib/collab/types.ts                   — CollabStore.append contract
```

### Matching tests

- `src/editor/plugins/AutosavePlugin.test.tsx`
- `src/components/surfaces/WriteSurface.test.tsx`
- `src/lib/collab/yjs/YjsProvider.test.ts`
- `src/lib/collab/yjs/DexieCollabStore.test.ts`
- `src/lib/docs/docRepository.test.ts`
- `e2e/persistence.spec.ts`

### Success criteria

- Finds both writes: immediate CRDT append to `docUpdates`; ~600 ms autosave to `docs.body`.
- Notes `sharesStore` prevents duplicate persistence from same-browser peers.
- Reads no unrelated feature directories.

---

## Case 2 — Document load path

**Task:** Trace how a document opens in the editor. Starting from a route change to
`/s/:spaceId/d/:docId`, identify every step until the editor is ready to accept input.

### Expected trace (minimal)

```
src/screens/space/Write.tsx            — route entry point
src/hooks/useCollab.ts                 — builds CollabConfig (providerFactory, username, cursorColor)
src/lib/account/useProfile.ts          — reads profile row; returns undefined until exists
src/lib/collab/yjs/providerFactory.ts  — makeProviderFactory()
src/hooks/useDocCrdtReady.ts           — ensures docUpdates log non-empty before mount
src/lib/docs/docRepository.ts          — ensureDocCrdtSeeded / seedDocCrdt
src/lib/collab/yjs/seed.ts             — seedFromLexicalJson()
src/lib/collab/yjs/YjsProvider.ts      — connectProvider(): loadAll, applyUpdate, syncRequest
src/lib/collab/yjs/DexieCollabStore.ts — loadAllUpdates()
src/editor/EditorFacade.tsx            — public editor boundary
src/lib/collab/editorRegistry.ts       — registerEditorHandle (for reconcile access)
```

### Expected symbols

| Symbol | File |
|---|---|
| `useCollab` | `src/hooks/useCollab.ts` |
| `makeProviderFactory` | `src/lib/collab/yjs/providerFactory.ts` |
| `useDocCrdtReady` | `src/hooks/useDocCrdtReady.ts` |
| `ensureDocCrdtSeeded` | `src/lib/docs/docRepository.ts` |
| `seedFromLexicalJson` | `src/lib/collab/yjs/seed.ts` |
| `connectProvider` | `src/lib/collab/yjs/YjsProvider.ts` |
| `loadAllUpdates` | `src/lib/collab/yjs/DexieCollabStore.ts` |
| `registerEditorHandle` | `src/lib/collab/editorRegistry.ts` |

### Matching tests

- `src/hooks/useCollab.test.ts`
- `src/hooks/useDocCrdtReady.test.tsx`
- `src/lib/collab/yjs/seed.test.ts`
- `src/lib/collab/yjs/YjsProvider.test.ts`
- `e2e/editor.spec.ts` — editor mounts and accepts input

### Success criteria

- Agent identifies the **CRDT-ready gate** (`useDocCrdtReady` / `reseedIfEmpty`) as the
  reason the editor does not mount on an empty `docUpdates` log.
- Distinguishes the stable `providerFactory` (built by `useCollab`, must not change per
  render) from the per-document `YjsProvider` (created by calling the factory).
- Notes the 300 ms `markSynced` fallback for solo editing.
- Agent reads ≤ 14 files.

---

## Case 3 — `EditorFacade` callers

**Task:** Find direct and indirect production consumers of the editor facade.

### Expected trace

```
src/editor/EditorFacade.tsx                    — Editor / EditorProps definition
src/components/surfaces/WriteSurface.tsx       — sole direct production importer/caller
src/screens/space/Write.tsx                    — indirect via WriteSurface
src/screens/space/Read.tsx                     — indirect via WriteSurface
src/screens/space/Split.tsx                    — indirect via WriteSurface
src/screens/space/Focus.tsx                    — redirect to Write with ?focus=1; no editor mount
```

Tests mock the boundary in `WriteSurface.test.tsx`, screen tests, and `App.test.tsx`;
these are not production callers.

### Success criteria

- Reports one direct production caller, three indirect screen consumers, and the Focus redirect.
- Separates test mocks from runtime imports.
- Reads no more than the definition, direct caller, four screens, and relevant tests.

---

## Case 4 — Adding an accessibility preference

**Task:** A new `fontWeight: 'normal' | 'bold'` preference must be added to the a11y
layer. Trace every file that must change and identify the test/story impact.

### Expected trace (impact discovery)

```
src/theme/a11y-prefs.ts                — A11yPrefs interface, DEFAULT_A11Y_PREFS, sanitizeA11yPrefs
src/store/a11y.ts                      — A11yState extends A11yPrefs; setFontWeight action; persist
src/theme/A11yPreferenceProvider.tsx   — applies preference as data-* attribute
src/components/settings/tabs/AccessibilityTab.tsx — preference control
src/components/settings/tabs/AccessibilityTab.test.tsx — control behaviour
src/components/settings/tabs/AccessibilityTab.stories.tsx — a11y story
src/i18n/locales/en/screens.json       — labels and help text
src/index.css                          — preference selector / CSS variable
src/help/content/en/accessibility.md   — user guidance
src/theme/a11y-prefs.test.ts           — unit test for sanitize + defaults
src/theme/a11y-prefs.snapshot.test.ts  — snapshot of computed preference set
src/store/a11y.test.ts                 — action test
src/theme/A11yPreferenceProvider.test.tsx — integration: data-* applied correctly
e2e/accessibility-settings.spec.ts     — e2e: preference persists and applies
```

### Expected symbols to add / update

| Symbol | File | Change |
|---|---|---|
| `A11yPrefs` | `a11y-prefs.ts` | Add `fontWeight` field |
| `DEFAULT_A11Y_PREFS` | `a11y-prefs.ts` | Add default value |
| `sanitizeA11yPrefs` | `a11y-prefs.ts` | Handle unknown values gracefully |
| `A11yState` | `store/a11y.ts` | Add `setFontWeight` action |
| `A11yPreferenceProvider` | `theme/A11yPreferenceProvider.tsx` | Apply `data-font-weight` |

### Policy constraints (from `AGENTS.md`)

- Default must equal today's behaviour (`?? default` — no destructive migration).
- New opt-in must not change the default experience.
- Ships with: unit test, snapshot update, e2e spec, Storybook story.

### Matching tests (all must be updated or added)

- `src/theme/a11y-prefs.test.ts`
- `src/theme/a11y-prefs.snapshot.test.ts`
- `src/store/a11y.test.ts`
- `src/theme/A11yPreferenceProvider.test.tsx`
- `e2e/accessibility-settings.spec.ts`

### Success criteria

- Agent identifies the full state, provider, UI, styling, i18n, help, test, and story impact.
- Notes the `?? default` back-compatibility rule.
- Notes snapshot test as requiring an update (it covers the computed pref set).
- Agent reads ≤ 12 files.

---

## Case 5 — Dexie schema / encryption change

**Task:** A new `template` field on `Doc` must be encrypted (moves sensitive context out
of plaintext). Trace every file that must change, including the schema spec, table rules,
middleware tests, and migration considerations.

### Expected trace (impact discovery)

```
src/db/schema.ts                              — Doc interface: add `template` field
src/db/stores.ts                              — STORES['docs'] index spec (no index needed for template)
src/db/LoremDB.ts                             — confirm no typed Table property needed (no new store)
src/lib/cloud/crypto/tableRules.ts            — verify `template` is NOT in the plaintext index list
src/lib/cloud/crypto/tableRules.test.ts       — assert `template` is encrypted
src/lib/cloud/crypto/middleware.ts            — no change if tableRules derives from stores.ts
src/lib/cloud/crypto/middleware.test.ts       — P1 test: `template` must be absent from at-rest bytes
src/lib/docs/docRepository.ts                 — createDoc, updateDocBody: include new field
src/lib/docs/docRepository.test.ts            — test createDoc carries new field
src/db/schema.ts                              — (already listed)
src/db/buildDb.ts                             — check UNSYNCED list (template should sync → not in UNSYNCED)
```

### Expected symbols

| Symbol | File | Impact |
|---|---|---|
| `Doc` | `schema.ts` | Add `template` field |
| `STORES` | `stores.ts` | Index spec unchanged (template not indexed) |
| `tableRules` | `tableRules.ts` | Derived from STORES — `template` automatically encrypted |
| `createDoc` | `docRepository.ts` | Must write `template` |
| `UNSYNCED` | `buildDb.ts` | `docs` not listed — `template` will sync |

### Schema/encryption invariants to verify

1. **`STORES` is the source of truth.** `tableRules.ts` marks a field plaintext only if
   it is a primary key, an indexed field, a cloud-reserved field, or the envelope itself.
   A non-indexed `template` field is automatically encrypted — no change to `tableRules.ts`
   is needed, but the test must assert it.
2. **No schema change at all** is needed: a non-indexed `template` field is transparent to
   Dexie's schema validation, so `STORES` is untouched. (The version number is not the
   discriminator — `LoremDB` declares a single Dexie version regardless; see
   [AGENTS.md § "Database schema versions"](../AGENTS.md).)
3. **`UNSYNCED` check.** If `template` is sensitive, confirm `docs` is **not** in
   `UNSYNCED` (it is not — `docs` syncs). The field will sync encrypted.
4. **Middleware test P1.** The middleware spike must be extended: after a `db.docs.add()`
   with a `template` value, reading the raw at-rest row must show `$lipsumCipher` and
   no plaintext `template` field.

### Matching tests

- `src/db/stores.test.ts`
- `src/lib/cloud/crypto/tableRules.test.ts`
- `src/lib/cloud/crypto/middleware.test.ts` (P1 assertion)
- `src/lib/docs/docRepository.test.ts`

### Success criteria

- Agent identifies that `tableRules.ts` derives rules from `STORES` automatically —
  no manual rule addition is needed.
- Agent correctly notes that a non-indexed field addition does **not** change `STORES`,
  and does not propose a Dexie version change (the schema declares a single version).
- Agent identifies `middleware.test.ts` P1 as the go/no-go test that must be updated.
- Agent reads ≤ 11 files.
