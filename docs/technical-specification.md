# LIpsum Writer — Technical Specification

> Derived from the test suite (16 Playwright e2e specs + 60+ Vitest unit/component specs) and source layout. Each feature below is grounded in tests that verify it, so this doc doubles as the source of truth for user-facing documentation.

---

## 1. Product Overview

**Product name:** LIpsum Writer
**Package name:** `lorem-ipsum-writer` (0.6.0-alpha)
**Tagline:** *A clutter-free space for long-form writing — fiction, research, essays, journals.*

**What it is.** A local-first, browser-based writing app for long-form prose. It combines:
- a distraction-free Lexical editor with multiple view modes,
- a freeform visual "Brain Space" canvas for non-linear thinking,
- BibTeX-based citation management,
- per-project ("space") organization with templated section layouts.

**Who it's for.** Writers working on fiction, research, essays, or journals — including researchers who need to manage references.

**Status.** Alpha. All data is stored locally in IndexedDB; there is no cloud sync. Clearing browser data deletes the user's work.

**Tech stack.** React 19, Vite, TypeScript, Lexical (editor), Dexie (IndexedDB), Zustand (state), Tailwind, Radix UI primitives, Driver.js (tours), i18next (i18n).

**Design system.** UI tokens, principles, and primitives are documented in [design-system.md](./design-system.md) — the single source of truth for components under `src/components/ui/` and the chrome/settings/surfaces that compose them.

**License.** PolyForm Noncommercial 1.0.0 — free for personal, research, non-profit use.

---

## 2. Feature Outline (at a glance)

| # | Area | What the user gets |
|---|------|-------------------|
| 1 | **Spaces** | Create independent writing projects from templates (Fiction, Research, Essay, Journal). Rename, delete, configure per-space settings. |
| 2 | **Documents** | Multi-document spaces organized into sections. Inline rename, add docs to sections, autosaved Lexical editor. |
| 3 | **View modes** | Write, Focus, Read, Split — switch from the topbar. Each mode swaps the chrome around the same document. |
| 4 | **Split view** | Two-pane layout with a keyboard-and-mouse resizable divider. Right pane can show another doc, the Brain Space, or Citations. |
| 5 | **Brain Space** | A freeform visual canvas for unsorted notes. Multiple note kinds (Note, Char, Place, Lore, Question, Source, Claim, Figure, Todo, Loose End, Blank). Notes can be connected and linked to documents. |
| 6 | **Citations** | Manual + BibTeX import (paste or `.bib` upload), tag-based search, bulk edit / bulk delete, `.bib` export. Available as a screen, a split-view pane, and a drawer. |
| 7 | **Sidebar** | Per-space navigation: section list, doc list, add doc, add section (when the template's `allowExtraSections` is on), inline rename, Brain Space link with unsorted-note count, settings cog. |
| 8 | **Mobile nav** | Hamburger drawer on small viewports; settings tabs reflow without horizontal overflow. |
| 9 | **Global settings** | Editor preferences (floating toolbar toggle), Theme (Light / Dark / High Contrast), a local **Account** (display name + presence colour), plus Typography, Shortcuts, and Backups tabs. |
| 10 | **Per-space settings** | General (name, tag), Sharing (coming soon), Template (coming soon), Members, Backups (manual `.md` snapshots + history + download), Danger Zone (delete with typed confirmation). |
| 11 | **Persistence** | IndexedDB autosave (~600 ms debounce). Survives reload, route changes, browser restart. |
| 12 | **Theming** | Four themes: light, dark, high-contrast light, high-contrast dark. Choice persists in `localStorage`. |
| 13 | **Tours / onboarding** | Driver.js guided tours; auto-trigger on first visit; replay from help menu; per-tour completion tracked in `localStorage`. |
| 14 | **i18n** | i18next scaffolding (currently English-only; namespaces: `common`, `chrome`, `screens`, `app`, `templates`). |

---

## 3. Information Architecture

### 3.1 Routes

| Path | Screen | Purpose |
|------|--------|---------|
| `/` | Home | Landing page. Shows "Continue writing" (most recent space) and "Start a new space". |
| `/about` | About | Creator note, license, source links. |
| `/settings` | Settings | Global user preferences. |
| `/new` | Templates | Pick a template and create a new space. |
| `/s/:spaceId` | Write | Redirects to the first doc in the space. |
| `/s/:spaceId/d/:docId` | Write | Default editor for a doc. |
| `/s/:spaceId/d/:docId/focus` | Focus | Minimal-chrome editor. |
| `/s/:spaceId/d/:docId/read` | Read | Read-only rendering. |
| `/s/:spaceId/d/:docId/split` | Split | Two-pane view with right-pane picker. |
| `/s/:spaceId/brain-space` | Brain Space | Visual note canvas. |
| `/s/:spaceId/citations` | Citations | Full-page citations table. |
| `/s/:spaceId/settings` | Space settings | Per-space configuration. |
| `*` | Not Found | 404. |

### 3.2 Data model (Dexie tables)

`Space`, `Section` (hierarchical via `parentSectionId`), `Doc`, `DocUpdate` (append-only CRDT payloads for collaborative editing; `Doc.body` stays the serialized read model), `Note` (state machine: `seed-prompt → seed-fetched → user`), `Connection`, `Annotation`, `Citation`, `Backup` (binary `payload: Blob`, discriminated by `format` — currently only `md-zip`), `Settings`, `HighlightPalette`, `Meta`.

The schema is declared in a single Dexie version. When the encrypted cloud-sync beta
(§ 4.9.1) is active, one extra store — `cloudCrypto` (the passphrase-wrapped escrow) — is
added, and synced content rows carry a `$lipsumCipher` envelope; the device key ring is
held in a separate, never-synced keystore database rather than a table here.

**Local account.** The `Meta` table holds singleton app state keyed by string. Among its keys is the on-device **account profile** (`profile`): a stable `authorId` (the attribution key that edits and presence attach to) plus the user-editable `displayName` and `presenceHue`. It is created with sensible defaults on first read and repaired in place if a stored value is invalid; it never leaves the browser (§4.9). A per-tab id lives separately in `sessionStorage`, not in Dexie.

---

## 4. Feature Specifications

### 4.1 Spaces

A **space** is an independent writing project with its own sections, documents, notes, and citations.

**Create a space.**
1. From Home, click **Start a new space** → navigates to `/new` (Templates).
2. Pick a template (Fiction, Research, Essay, Journal). Each seeds its own initial sections and doc set.
3. Enter a **name** and a **tag** (short label).
4. Submit. The space is created in IndexedDB and the user lands on its first doc.

**Switch spaces.** The SpaceRail on the left lists existing spaces in Write mode. In Focus mode it collapses to a compact FocusRail.

**Rename a space.** Click the space title in the sidebar → an inline input appears. **Enter** commits; **Escape** reverts.

**Delete a space.** Space settings → **Danger zone** tab. The Delete button stays disabled until the user types the space name into the confirmation input. Deletion redirects to Home.

*Covered by:* `space-creation.spec.ts`, `space-settings.spec.ts`, `split-and-sidebar.spec.ts`, `Templates.test.tsx`, `SpaceSettings.test.tsx`.

---

### 4.2 Documents and sections

A space is structured as **sections** containing **documents**. The default sections vary by template (e.g., Fiction has *Manuscript* and *Characters*; Research has *Manuscript* and *Data*).

**Add a doc.** In the sidebar, each section has an **+ Add doc to *<Section>*** button. Clicking it reveals an inline input. **Enter** creates the doc and navigates to it; **blur** (clicking away) saves the doc in place without navigating, or silently clears the input when empty; **Escape** cancels.

**Add a section.** When a space's template sets `allowExtraSections: true` (currently the **Blank** template), an **Add section** affordance appears below the sidebar's section list, hover-revealed on the row. Clicking it reveals an inline input. **Enter** — or **blur** (clicking away) — appends a new top-level section at the next order; **Escape** cancels. Templates that encode a specific workflow (Fiction, Thesis, Technical, Bioinformatics) keep `allowExtraSections` unset so their seeded shape is preserved.

**Rename a doc.** Double-click the doc name in the topbar breadcrumb, or **double-click a doc name in the sidebar**. Rename input appears. **Enter** commits; **Escape** reverts. Blurring (clicking away) also commits when the value changed.

**Rename a section.** **Double-click** a section label in the sidebar to switch it to an inline rename input. **Enter** or blur commits; **Escape** reverts. The same `useInlineRename` state machine drives both section and doc inline renames.

**Delete a doc.** Each document row carries a **⋯ menu** (revealed on hover on desktop, always shown on mobile) with a **Delete…** action that opens a destructive confirmation dialogue. Confirming cascades the delete — the document, its annotations, its revision history, and its collaborative CRDT state (`docUpdates` log + `collab-seed` marker) are all removed. Brain Space notes that linked to the document are **unlinked** (the note survives; only its dead link is cleared). If the deleted document is the one currently open, the app navigates back to the space so the first remaining document loads.

**Autosave.** Edits flush to IndexedDB ~600 ms after the last keystroke. Content survives navigation and hard reload. Autosave is collaboration-aware: it persists local and undo/redo (`historic`) edits on that debounce, but skips remote (`collaboration`) reconciliations — with a bounded-staleness backstop (twice the debounce) so a local edit coalesced into a remote reconciliation is never lost.

**Collaborative editing.** The editor is collaborative by default. Content lives in a per-document CRDT (a Yjs update log in the `DocUpdate` table), seeded from the document body when the document is created and loaded into the editor through the Lexical `CollaborationPlugin` — the editor no longer loads a body string. Every tab on this device that opens the same document shares one live history over a same-origin BroadcastChannel: an edit in one tab appears in the others as you type, and concurrent edits in two tabs merge without overwriting. Undo/redo is **per writer** — undoing in one tab steps back only through that tab's own edits. See § 4.2.1 for restore semantics.

**Empty space.** Visiting `/s/:spaceId` without a docId redirects to the first doc; if none exists, the user sees an empty state.

*Covered by:* `editor.spec.ts`, `multi-tab-sync.spec.ts`, `sidebar-doc-delete.spec.ts`, `persistence.spec.ts`, `split-and-sidebar.spec.ts`, `Sidebar.test.tsx`, `DeleteDocDialog.test.tsx`, `deleteDocCascade.test.ts`, `WriteSurface.test.tsx`, `Topbar.test.tsx`.

#### 4.2.1 Restore semantics

There are two restore paths, and they reach open editors differently.

- **Revision restore** (from a document's own history) updates the mounted editor **in place**. A process-local editor registry maps the open document to a `restoreBody` handle; restore writes the pre-restore snapshot and the new body to Dexie, then replays the restored body through that handle. The replay is an ordinary (untagged) editor update, so it flows into the shared CRDT and every other open tab converges on the restored text. The document's editor must be mounted (it always is when restoring from its history).
- **Space backup restore** (from `/settings`, where no editor is mounted) resets the document's CRDT: it clears the old update log and re-seeds a **fresh** lineage from the restored body. A same-origin BroadcastChannel then signals every tab with one of those documents open to **reload** — the editor remounts and loads the fresh seed, rather than keeping its now-stale in-memory `Y.Doc` and clobbering the restored body on its next autosave.

---

### 4.3 View modes

Four modes, selected from the topbar tabs:

| Mode | Route segment | Chrome | Editor surface |
|------|---------------|--------|----------------|
| **Write** | (none) | SpaceRail + Sidebar + Topbar | Editable |
| **Focus** | `/focus` | FocusRail only (Sidebar hidden) | Editable |
| **Read** | `/read` | Standard chrome | `contenteditable="false"` |
| **Split** | `/split` | Two panes | Left editable; right configurable |

*Covered by:* `view-modes.spec.ts`, `Write.test.tsx`, `Focus.test.tsx`, `Read.test.tsx`, `Split.test.tsx`, `ModeToggle.test.tsx`.

---

### 4.4 Split view

Two panes separated by a draggable divider.

**Right-pane picker.** A dropdown selects what fills the right pane: another document, the Brain Space (`dump`), or **Citations**.

**Resizable divider.** Implements ARIA separator semantics (`role="separator"`, `aria-valuenow`, `aria-label="Resize split panes"`).

| Input | Effect |
|-------|--------|
| Arrow Right / Arrow Left | ±2% |
| Shift + Arrow | ±2% (fine adjustment direction depends on platform) |
| Home | Snap to 25% |
| End | Snap to 75% |
| Space | Reset to 50% |
| Enter | Snap to 50% |
| Pointer drag | Continuous resize, with snap zone near 50% |

The divider percentage persists in the UI store.

**Mobile.** On viewports below the breakpoint, Split shows a "Split view needs a larger screen" notice and an **Open in Write** link.

*Covered by:* `split-and-sidebar.spec.ts`, `split-sidebar.spec.ts`, `Split.test.tsx`.

---

### 4.5 Brain Space (visual note canvas)

A freeform canvas where notes are placed, connected, and optionally linked to documents.

**Topbar.** Shows `Brain space · <N> unsorted` — a live count of notes not yet promoted out of the seed state.

**Note kinds.** Templates expose a different mix of kinds. The canonical kinds are:
*Note, Char (person), Place, Lore, Question, Source, Claim, Figure, Todo, Loose End, Blank.* The toolbar exposes only the kinds applicable to the active template.

**Create a note.** Click a kind button in the toolbar (e.g., **+ blank**, **+ thought**, **+ person**, **+ place**, **+ lore**). A new note is placed on the canvas.

**Edit a note.** Double-click the note (or its title). An inline edit mode replaces the read view. **Escape** reverts unsaved edits. Body changes autosave on debounce.

**Note state.** Notes follow `seed-prompt → seed-fetched → user`. User edits promote a seed note to the `user` state, removing it from the unsorted count.

**Connections.** Shift-click one note to mark it as the connection source; shift-click a second note to create a connection. Shift-clicking the source again cancels. Orphan connections (endpoint missing) are skipped at render time, not surfaced as errors.

**Detail drawer.** Selecting a note opens a side drawer with: title, body, kind, **linked doc** picker, and a connections list. Linking a note to a doc persists the `linkedDocId`.

**Background click.** Clicking empty canvas clears the focused note.

*Covered by:* `brain-space.spec.ts`, `BrainSpaceCanvas.test.tsx`, `BrainSpaceNote.test.tsx`, `BrainSpaceDetailDrawer.test.tsx`, `BrainSpaceConnection.test.tsx`.

---

### 4.6 Citations

A full citation manager scoped to each space. Available in three surfaces:

1. **Citations screen** (`/s/:spaceId/citations`) — full-page table.
2. **Citations pane** — compact right-pane variant in Split view.
3. **Citations drawer** — opened from the Topbar **citations** button. Full-screen on mobile, side panel on desktop.

**Import.**
- Click **+ add**, paste BibTeX into the textarea, submit → entries are parsed and inserted. Multiple entries in one paste are supported.
- Plain (non-BibTeX) text is accepted as a title and stored as a `misc` citation.
- File upload accepts `.bib` files.
- BibTeX parsing handles author particles (e.g., *van de*) and *et al.*; missing fields fall back to `(unknown)` / `(untitled)` / `year=0`.

**Table columns.** AUTHOR · TITLE · YEAR · TAG · TYPE · USED. A compact density hides columns in narrow viewports.

**Search / filter.** A search input filters by author, title, tag, or year. Empty-state and no-match states are distinct.

**Detail edit.** Click expand on a row to reveal the detail panel. Editable fields: key (tag), title, authors, year, type (`book` / `article` / `chapter` / `misc`). **Cmd/Ctrl + Enter** saves. **Escape** cancels. Duplicate keys are rejected with an inline status message.

**Bulk actions.** A "Select all citations on this page" checkbox plus per-row checkboxes activate a bulk-actions region (`role="region"`, name *Bulk actions*). Available actions:
- **Set type** (dropdown) — applies to all selected.
- **Delete** — opens a confirm dialog before destruction.
- **Clear** — deselects without modifying.

**Export.** Download all citations as a `.bib` file.

*Covered by:* `citations.spec.ts`, `citations-pane.spec.ts`, `citations-panel.spec.ts`, `Citations.test.tsx`, `CitationsPane.test.tsx`, `CitationsSidePanel.test.tsx`, `bibtex.test.ts`.

---

### 4.7 Sidebar

The per-space navigation column.

- **Header:** editable space title + settings cog (links to per-space settings).
- **Sections:** grouped doc lists, with an **+ Add doc to *<Section>*** button under each. A section's list also includes the docs of its subsections, flattened in — subsections render no header row of their own in the nav (the data model keeps the nesting; only the rendering is flat, so new docs are added at section level).
- **Doc row menu:** each document row has a **⋯ menu** (Rename, Delete…) — revealed on row hover/focus on desktop, always visible on mobile.
- **Brain space link:** routes to `/s/:spaceId/brain-space`; shows the unsorted-note count and highlights when active.
- **Footer:** Home, About, GitHub links.
- **Mobile:** replaced by a hamburger button in the topbar that opens the same content in a dialog drawer. The drawer closes when the user taps a destination.

*Covered by:* `mobile-nav.spec.ts`, `split-and-sidebar.spec.ts`, `Sidebar.test.tsx`, `MobileNavDrawer.test.tsx`.

---

### 4.8 Topbar

Adapts to screen size and mode.

| Element | Behavior |
|---------|----------|
| Doc-name breadcrumb | Double-click → rename mode (Enter commits / Escape reverts). |
| Mode tabs | Write, Focus, Read, Split. Hidden in Focus mode. |
| Theme toggle | Dropdown to switch themes; icon (sun / moon / contrast) updates. |
| Floating-toolbar toggle | Visible only when enabled in global Settings. |
| Citations button | Opens the citations drawer / panel. |
| Mobile nav button | Hamburger; opens the sidebar drawer on mobile. |
| Focus toggle | Enters / exits Focus mode. |

*Covered by:* `Topbar.test.tsx`, `view-modes.spec.ts`, `editor.spec.ts`.

---

### 4.9 Global settings (`/settings`)

Tabbed user-wide preferences.

| Tab | Status | Contents |
|-----|--------|----------|
| **Editor** | Active | Floating-toolbar toggle (On / Off chips), persisted to `localStorage`. |
| **Theme** | Active | Light · Dark · HC Light · HC Dark. Sets `data-theme` on `<html>`. |
| **Typography** | Active | Prose / UI font settings (component present, see `Settings.test.tsx`). |
| **Shortcuts** | Active | Keyboard reference. |
| **Backups** | Active | Backup management. |
| **Account** | Active | On-device account: an editable **display name** and a **presence colour** (five-hue picker). The name and colour label your cursor to collaborators — today across your own tabs on this device (see § 4.2). Stored locally only. A **gated encrypted cloud-sync beta** (§ 4.9.1) can appear at the bottom of this tab, hidden by default. |
| **About** | Active | Build information and links: app **version**, the **commit** SHA and **build time** embedded at build time (`vite.config.ts` defines → `lib/version`), the licence, and Source / Changelog / Send-feedback links to the repository. |

Mobile: all tabs reflow without horizontal overflow at 390×800.

*Covered by:* `settings.spec.ts`, `settings-mobile.spec.ts`, `Settings.test.tsx`, `AccountTab.test.tsx`, `AboutTab.test.tsx`, `PresenceHuePicker.test.tsx`, `profile.test.ts`.

#### 4.9.1 Encrypted cloud sync (invite-only beta, hidden by default)

An opt-in beta that replicates a space's content across a user's devices via
[Dexie Cloud](https://dexie.org/cloud/), with **all content encrypted on the client
before upload** — the server stores only ciphertext. It is inert unless **both** gates
are on: a build gate (`VITE_DEXIE_CLOUD_URL` must be an `https://` URL) and a per-device
gate (`?cloud-sync=on`, persisted to `localStorage`). With either gate off there are no
cloud code paths, no cloud UI, and the schema is identical to the base app.

- **Key model.** A 32-byte master secret is minted on setup. An `AES-256-GCM` content
  key is derived from it (HKDF-SHA-256, non-extractable), plus a public one-way
  **fingerprint** (a second HKDF info string) that identifies the key without revealing it.
  The master is wrapped under a passphrase-derived key (PBKDF2-SHA-512, ≥ 800 000 calibrated
  iterations) into an **escrow** record; a one-time **recovery code** (Crockford base32 of
  the master) is the fallback if every device forgets the passphrase. The device's derived
  key ring lives in a **separate, never-synced** keystore database, which also holds the
  escrow until it is published (see Key reconciliation).
- **Envelope.** Each encrypted row keeps its primary key and indexed fields plaintext and
  moves every other field into a `$lipsumCipher` envelope (`AES-256-GCM`, fresh IV per
  seal, AAD binding `table` + `primaryKey` + `epoch`).
- **Sync scope.** Encrypted: spaces, sections, docs, notes, note attachments,
  annotations, citations, connections, revisions, palettes. Never synced: settings,
  backups, sync bookkeeping, the CRDT `docUpdates` log, and the device keystore.
- **Reconciliation.** Because the CRDT `docUpdates` log is per-device, cross-device
  changes travel as `Doc.body` snapshots. After each sync settles, a reconciler compares
  every row body against the local Y.Doc and, for a body a pull produced rather than the
  local editor, keeps a safety revision of the local side then either replays the pulled
  body through the mounted editor or reseeds the CRDT — **whole-document last-writer-wins**;
  lossless cross-device merge is a recorded open decision for a future release.
- **Key reconciliation.** Setup holds the escrow on the device, not in `cloudCrypto`, and —
  while signed out — drops any escrow already in the local database (residue from an earlier
  local session) so a fresh key can never trip a spurious mismatch. Once the first sync
  settles, reconciliation compares the account escrow's fingerprint with the device ring's
  (or, as a fallback, the pending escrow's): absent → publish this device's escrow (add-only,
  so it can never race and clobber the account's key); match → nothing to do; differ → flag a
  **key mismatch**. Under a mismatch the write middleware refuses content writes and reads
  surface the route-level recovery screen, whose **Unlock in settings** action navigates to
  the Account tab and its mismatch banner; the user resolves it from settings by **adopting**
  the account key (enter the account passphrase; the device re-seals its own rows under it) or
  **erasing** the account's unreadable copy (kept: this device's notes). Never clobbers, never
  silently loses.
- **Ordering.** Passphrase-before-sign-in: sync cannot start without a key ring, so a
  keyless write is never uploaded in the clear. Opting out is **non-destructive** — the
  cloud schema is sticky so a rebuild never erases local content.
- **Server sees / does not see.** Cannot: bodies, titles, note text, citation
  metadata, attachment bytes. Can: record ids and relationships, timestamps, note kinds,
  citation keys and years, the sign-in email, and sync timing/IP. Sign-in is invite-only.

See [`docs/cloud-sync-beta.md`](cloud-sync-beta.md) for the full design note and the
manual verification protocol. *Covered by:* `middleware.test.ts` (the P1–P8 ciphertext and
mismatch-lock spike), `envelope.test.ts`, `keys.test.ts` (incl. fingerprints),
`errors.test.ts`, `keyMismatch.test.ts`, `recoveryCode.test.ts`, `setup.test.ts` (incl.
adopt/erase), `escrowReconcile.test.ts`, `buildDb.test.ts`, `reconcile.test.ts`
(cross-device reconciliation), `snapshot.test.ts` (the CRDT ⇄ body round-trip), the
`src/components/errors/` and `src/components/settings/tabs/cloud/` component tests, and
`cloud-sync.spec.ts`.

---

### 4.10 Per-space settings (`/s/:spaceId/settings`)

Reached via the cog in the sidebar header. The **back** link returns to the active space (not Home).

| Tab | Status | Contents |
|-----|--------|----------|
| **General** | Active | Space name and tag — Enter or blur commits, Escape reverts. |
| **Sharing** | Coming soon | *"Per-space visibility and shared links"* placeholder. |
| **Template** | Coming soon | Cannot change template after creation; placeholder explains. |
| **Members** | Present | Component scaffold (no implementation). |
| **Backups** | Active | Manual `.md`-zip snapshots scoped to this space. Persisted in IndexedDB and re-downloadable from the history table. See § 4.15. |
| **Danger zone** | Active | Delete button stays disabled until the typed confirmation matches the space name. Deletion redirects to Home. |

*Covered by:* `space-settings.spec.ts`, `SpaceSettings.test.tsx`.

---

### 4.11 Persistence

- **Storage:** IndexedDB via Dexie. No network calls for user content.
- **Autosave:** ~600 ms debounce from the last keystroke.
- **Survival:** Hard reload, route navigation, browser restart.
- **Continue writing:** Home shows a *Continue writing* link to the most-recently-touched space if any exists.

*Covered by:* `persistence.spec.ts`, `db.test.ts`, `seed.test.ts`.

---

### 4.12 Theming

Four themes: `light`, `dark`, `hc-light`, `hc-dark`. Applied via `data-theme` on `<html>` and Tailwind tokens (`ink`, `paper`, `rule`, `highlight`). Selection persists in `localStorage`. High-contrast themes use distinct icons and color tokens for accessibility.

*Covered by:* `theme/ThemeProvider.test.tsx`, `theme/tokens.test.ts`, `settings.spec.ts`.

---

### 4.13 Tours and onboarding

- **Framework:** Driver.js, wrapped by the local `useTour` and `useAutoTour` hooks.
- **Auto-trigger:** First visit to a screen launches that screen's tour once.
- **Replay:** From the help menu, and from the **Quick settings** popover's guided-tour list. That tour list is **desktop-only** — below the `767 px` mobile breakpoint it is hidden so the popover's core controls (theme, reading width, focus) stay above the fold; the help menu remains the tour entry point on mobile.
- **Persistence:** Completed tour IDs are stored in `localStorage` under `lipsum-tours`. A `resetAll` utility clears them.

*Covered by:* `tours/HelpMenu.test.tsx`, `tours/storage.test.ts`, `tours/useTour.test.ts`, `tours/useAutoTour.test.ts`, `chrome/QuickSettingsPopover.test.tsx`.

---

### 4.14 Internationalization

i18next is wired in with namespaces `common`, `chrome`, `screens`, `app`, `templates`. Currently the only supported language is **English (`en`)**. Missing translations fall back to the key. Adding a language requires only resource files.

*Covered by:* `i18n.test.ts`.

---

### 4.15 Backups

Manual export of an entire space as a Markdown `.zip` archive, with a history of past snapshots kept in IndexedDB. Reached via **Space settings → Backups**.

**v1 scope.** Manual snapshot only — no auto-snapshots, no cloud sync, no restore yet. Restore / import is the same surface and is on the roadmap (the per-file YAML frontmatter is stable to make round-tripping straightforward when it lands). Other export formats (LaTeX, HTML, PDF) are deferred; `Backup.format` is a discriminator (`'md-zip'` today) so future formats can co-exist in the same table.

**Snapshot creation.** Clicking **+ snapshot now**:

1. Reads a consistent snapshot of the space inside a single Dexie read transaction (spaces, sections, docs, notes, annotations, citations, connections, palettes).
2. Builds a `.zip` in-memory with [`JSZip`](https://www.npmjs.com/package/jszip).
3. Inserts a `Backup` row (`kind: 'manual'`, `format: 'md-zip'`, `payload: Blob`, `size`, `when`, `scope: spaceId`).
4. Triggers a browser download of the same blob via a temporary `<a download>`.

**Doc body → Markdown.** Lexical-serialized doc bodies are hydrated into a headless editor (`@lexical/headless`) and run through `$convertToMarkdownString(TRANSFORMERS)` — the same transformer set used by the live editor, so headings, lists, links, code, and quotes round-trip with high fidelity. Plain-text seed bodies (not yet serialized) pass through unchanged.

**Zip layout.** Inside the archive:

```
<space-slug>-YYYY-MM-DD-HHMM.zip
├── space.md            # YAML frontmatter only (name, tag, template, exportedAt, format, schemaVersion)
├── manuscript/
│   └── <section-slug>/
│       └── NN-<doc-slug>.md   # YAML frontmatter (id, name, status, wordCount, updatedAt) + body
├── notes.md            # brain-dump cards grouped by kind
├── citations.md        # bibliography
├── connections.md      # note-to-note edge list
├── annotations.md      # highlights / comments per doc
└── palette.md          # highlight palette slots
```

Subsections nest under their parent section folder. Docs whose `sectionId` doesn't resolve land in `manuscript/_unsorted/`.

**History table.** A live-queried list of `Backup` rows for the current space, newest first. Each row exposes:

| Column | Source | Format |
|--------|--------|--------|
| WHEN | `backup.when` | Relative time ("just now", "12 min ago", "3 h ago", "2 d ago", or ISO date for older entries) |
| KIND | `backup.kind` | Currently always `manual` |
| SIZE | `backup.size` | Human-readable (B / kB / MB) |
| Actions | — | `↓ download` (re-downloads the stored blob) · `delete` (confirm dialog → row removed) |

A disabled `↑ restore from file · soon` hint sits beside the snapshot button to telegraph the next step on this surface.

**Storage cost.** Blobs sit inside IndexedDB on the `backups` object store. The `payload` field is not indexed (index spec: `'id, when, scope, kind'`) so changing its type to `Blob` did not require a Dexie version bump. Practical implication: many snapshots of a large space can accumulate quickly — there is no auto-prune in v1.

**Key files.**

- [src/lib/backup/lexicalToMarkdown.ts](src/lib/backup/lexicalToMarkdown.ts) — headless-editor hydration + markdown conversion.
- [src/lib/backup/buildSpaceMarkdownZip.ts](src/lib/backup/buildSpaceMarkdownZip.ts) — snapshot reader, zip builder, slugify, YAML emitter.
- [src/lib/backup/createSpaceBackup.ts](src/lib/backup/createSpaceBackup.ts) — orchestrator that persists the row.
- [src/hooks/useBackups.ts](src/hooks/useBackups.ts) — live-query hook.
- [src/lib/file-download.ts](src/lib/file-download.ts) — shared `downloadBlob` helper (also used by Citations export).
- [src/screens/SpaceSettings.tsx](src/screens/SpaceSettings.tsx) — `BackupsTab` component and the new `'backups'` entry in `TAB_IDS`.

*Covered by:* `lexicalToMarkdown.test.ts`, `buildSpaceMarkdownZip.test.ts`, `createSpaceBackup.test.ts`, `SpaceSettings.test.tsx` (Backups tab tests).

---

## 5. State management

A single Zustand store (`useUI`) holds UI state. Persisted (via `localStorage`): `theme`, `currentSpaceId`, `floatingToolbarEnabled`, `splitDividerPct`. Session-only: `currentDocId`, `citationsDrawerOpen`, `mobileNavOpen`, `focusedNoteId`, `detailNoteId`, plus an export flag.

*Covered by:* `store/ui.test.ts`.

---

## 6. Keyboard & input reference (for user docs)

| Where | Input | Action |
|-------|-------|--------|
| Topbar doc name | Double-click | Enter rename mode |
| Rename inputs (doc, space) | Enter | Commit |
| Rename inputs | Escape | Revert |
| Sidebar add-doc input | Enter | Create doc |
| Sidebar add-doc input | Escape | Cancel |
| Citation detail edit | Cmd/Ctrl + Enter | Save |
| Citation detail edit | Escape | Cancel |
| Split divider | Arrow Right / Arrow Left | ±2% |
| Split divider | Home | Snap 25% |
| Split divider | End | Snap 75% |
| Split divider | Space | Reset to 50% |
| Split divider | Enter | Snap to 50% |
| Brain Space note | Double-click | Edit |
| Brain Space note | Escape (while editing) | Revert |
| Brain Space note | Shift-click | Start / complete a connection |

---

## 7. Test coverage matrix

### 7.1 End-to-end (Playwright) — 16 specs

| Spec file | Feature area |
|-----------|--------------|
| `smoke.spec.ts` | Routing, Home, About, 404 |
| `editor.spec.ts` | Editor autosave, doc rename |
| `multi-tab-sync.spec.ts` | Multi-tab collaborative editing, presence, restore convergence |
| `view-modes.spec.ts` | Mode switching chrome |
| `persistence.spec.ts` | Hard-reload survival |
| `space-creation.spec.ts` | Templates → space creation |
| `space-settings.spec.ts` | Per-space settings, delete confirm |
| `settings.spec.ts` | Global settings, theme switch |
| `settings-mobile.spec.ts` | Mobile responsive settings |
| `citations.spec.ts` | BibTeX add, filter, export |
| `citations-pane.spec.ts` | Citation detail edit, bulk actions |
| `citations-panel.spec.ts` | Citations drawer on desktop + mobile |
| `split-and-sidebar.spec.ts` | Split divider + sidebar workflows |
| `split-sidebar.spec.ts` | Redundant split + sidebar coverage |
| `brain-space.spec.ts` | Brain Space mount + count |
| `mobile-nav.spec.ts` | Mobile nav drawer |

### 7.2 Unit / component (Vitest) — 60+ specs

- **Screens:** `App`, `Write`, `Focus`, `Read`, `Split`, `Home`, `About`, `Templates`, `Citations`, `BrainSpace`, `Settings`, `SpaceSettings`, `NotFound`.
- **Chrome:** `Topbar`, `Sidebar`, `SpaceRail`, `FocusRail`, `MobileNavDrawer`, `ModeToggle`, `PageNav`.
- **Surfaces:** `WriteSurface`, `BrainSpaceCanvas`, `BrainSpaceNote`, `BrainSpaceDetailDrawer`, `CitationsPane`, `CitationsSidePanel`.
- **Settings primitives:** `SettingRow`, `SettingsTabs`, `Chip`, `ComingSoonRow`.
- **UI base (snapshots):** button, card, dialog, input, scroll-area, separator, tabs, tooltip, block-quote, dropdown-menu.
- **Hooks:** `useCitations`, `useConnections`, `useDocuments`, `useNotes`, `useSpaces`, `useBackups`.
- **Store:** `ui` (Zustand).
- **DB:** `db` (Dexie schema), `seed`.
- **Utilities:** `bibtex`, `formatting`, `doc-naming`, `ids`, `utils`, `templates`, `i18n`.
- **Backup pipeline:** `lexicalToMarkdown`, `buildSpaceMarkdownZip`, `createSpaceBackup` (snapshot read, zip layout, frontmatter, headless Lexical → Markdown).
- **Theme / tours:** `ThemeProvider`, `tokens`, `HelpMenu`, `storage`, `useTour`, `useAutoTour`.

---

## 8. Known gaps and "coming soon" surfaces

These exist as scaffolding only — they are visible in the UI but not yet functional:

- **Global Settings → Account → sign-in & cloud sync** — the Account tab manages a local, on-device profile (display name + presence colour). An **encrypted cloud-sync beta** (§ 4.9.1) exists behind two activation gates but is **hidden by default** and invite-only; it is not part of the default experience.
- **Cross-device / multi-writer collaboration** — live collaboration and presence cursors work **across tabs on the same device** today (a same-origin BroadcastChannel over the `DocUpdate` CRDT log; see § 4.2). The encrypted cloud-sync beta (§ 4.9.1) now replicates a user's own documents **across their devices**, reconciling pulled bodies into the editor at **whole-document last-writer-wins**. What is still not wired: **real-time** cross-device editing and **live cross-device presence** (a network CRDT transport), and multi-*writer* collaboration between different people.
- **Space settings → Sharing** (per-space visibility, shared links).
- **Space settings → Template** (change template after creation).
- **Space settings → Members** (no implementation behind the tab).
- **Backup restore / import** — disabled `↑ restore from file · soon` hint in the Backups tab; the format is stable, the reverse path is not built.
- **Auto-snapshots and cloud sync** — Backups are manual-only in v1; no scheduled snapshots, no off-device replication.
- **Other export formats** — LaTeX, HTML, PDF; `Backup.format` discriminator is in place but only `md-zip` ships.
- **Languages other than English** — i18n framework is wired but only `en` resources are shipped.

---

## 9. Glossary (for user docs)

- **Space** — A self-contained writing project. Has its own sections, docs, notes, citations.
- **Section** — A folder-like grouping of documents within a space. Templates define the default sections.
- **Doc** — A single document edited in the Lexical editor.
- **Brain Space** *(also: "dump")* — The freeform visual canvas of notes attached to a space.
- **Note** — A unit on the Brain Space canvas. Has a *kind*, a *state*, optional connections, and an optional linked doc.
- **Connection** — A visual link between two Brain Space notes.
- **Citation** — A bibliographic entry, BibTeX-style, scoped to a space.
- **View mode** — Write, Focus, Read, or Split — chrome variants around the same document.
- **SpaceRail / FocusRail** — Left-edge navigation. SpaceRail in normal modes; FocusRail (compact) in Focus mode.
- **Template** — A starter layout (sections, seed docs, note kinds) applied when creating a new space.
- **Backup** — A snapshot of a space at a point in time. Stored as a binary blob in IndexedDB and re-downloadable from the Backups tab. The `format` field discriminates between formats; today only `md-zip` (a `.zip` of per-doc Markdown files) ships.
