# LIpsum Writer — Technical Specification

> Derived from the test suite (95 Playwright e2e spec files, 359 tests; 446 Vitest unit/component spec files, 3277 tests) and source layout. Each feature below is grounded in tests that verify it, so this doc doubles as the source of truth for user-facing documentation.

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
| 2 | **Documents** | Multi-document spaces organized into sections. Add / rename / delete / reorder documents and sections from the sidebar, autosaved Lexical editor. |
| 3 | **View modes** | Write, Focus, Read, Split — switch from the topbar. Each mode swaps the chrome around the same document. |
| 4 | **Split view** | Two-pane layout with a keyboard-and-mouse resizable divider. Right pane can show another doc, the Brain Space, or Citations. |
| 5 | **Brain Space** | A freeform visual canvas for unsorted notes. Multiple note kinds (Note, Char, Place, Lore, Question, Source, Claim, Figure, Todo, Loose End, Blank). Notes can be connected and linked to documents. |
| 6 | **Citations** | Manual + BibTeX import (paste or `.bib` upload), tag-based search, bulk edit / bulk delete, `.bib` export. Available as a screen, a split-view pane, and a drawer. |
| 7 | **Sidebar** | Per-space navigation: section list, doc list, a per-section ⋯ menu (add document, rename, delete), add section (on every template unless it sets `allowConfiguration: false`), drag / keyboard reordering of sections and documents, Brain Space link with unsorted-note count, settings cog. The Workshop section is protected from rename and delete. |
| 8 | **Mobile nav** | Hamburger drawer on small viewports; a bottom **more** sheet whose App group (settings, about, help, what's new, accessibility, account, contact) is shared with the desktop Quick Settings menu so the two cannot drift; settings tabs reflow without horizontal overflow. On the settings shells the wordmark / tag badge is the "back to root" affordance (the SpaceRail's own home link is hidden on mobile). |
| 9 | **Global settings** | Editor preferences (floating toolbar toggle), Theme (Light / Dark / High Contrast), a local **Profile** (display name + presence colour), plus Typography, Shortcuts, and Backups tabs. |
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
| `/` | Home | Landing page. Shows "Continue writing" (most recent space) and "Start a new space", a pre-release notification (info banner) counting down to the next release (23 August, 22:00 CEST) that urges setting up a local sync folder or backup, and a **"Device sync"** link at the top right of the header leading to Settings → Device sync (§ 4.9.2). Unconditional, in the nav's own voice, carrying no live state — connection state belongs beside the device it describes. It replaced a flag-gated "Sign in to sync" button, which left the sync needing no account with no way in from Home. |
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

The schema is declared in a single Dexie version, which includes the Writer Sync
operation-protocol stores — `syncOperations` (the append-only journal of immutable
encrypted operation frames), `syncInbox`
(accepted operation ids), `syncTombstones` (deletion tombstones) and
`syncProviderBindings` (per-scope provider configuration). Every synced entity row
carries provider-neutral replication metadata: a plaintext `accessScopeId`,
`mutationId` and hybrid-logical `logicalUpdatedAt` for routing, deduplication and
deterministic convergence, plus encrypted `createdBy`/`updatedBy` attribution
(principal ids from the local profile — never emails, and never mapped to any
provider's authorisation field). Replication, encryption, scope kind and journal
membership per table are classified once in
`src/lib/writerSyncIntegration/writerTablePolicy.ts`. When the encrypted cloud-sync beta
(§ 4.9.1) is active, one extra store — `cloudCrypto` (the passphrase-wrapped escrow) —
is added, and synced content rows carry a `$lipsumCipher` envelope; the device key ring
is held in a separate, never-synced keystore database rather than a table here.

**Sync remains single-user.** The operation journal deduplicates the same logical
mutation across providers (an accepted `operationId` never applies twice) and
tombstones prevent deleted entities resurrecting from stale updates. Dormant realm and
member groundwork inside the Dexie adapter does **not** enable sharing: no invitation,
role provisioning or cross-user key delivery exists. Frames are signed by the device
that authored them and verified against the trusted-device registry (§ 4.9.2), so
attribution is checkable rather than merely asserted.

Every synced write is journalled at one chokepoint: a database middleware emits the
write's encrypted frame in the same transaction as the write itself, so a mutation and
its replicated operation cannot come apart, and each touched row is its own logical
mutation (a reorder that moves three documents emits three operations, not one). While
the device holds no content key nothing is journalled; setting up or unlocking
encryption re-seals what was written keyless and backfills its operations at the same
time.

**Every material change mints a new operation.** A partial update (a rename, a note
edit, a reorder, a bulk retype) and every row an archive restore writes back take a
fresh `mutationId` and logical time. Reusing the stored one would journal an operation
the other devices have already accepted, and they would discard the change as a replay
— the edit would appear to save locally and never arrive anywhere else.

**Convergence is decided by logical time, then device id — never by arrival order.**
The rule is symmetric: an inbound deletion that lost to a later update is recorded as
superseded instead of removing the row, and where two deletions race the later one owns
the tombstone. Accepting an operation merges its logical time into this device's clock
(ignoring readings more than five minutes ahead of local wall time), so a device whose
clock lags still stamps its next edit after everything it has already accepted. The
logical time travels inside the payload's authenticated header, so a provider or peer
cannot retime an operation without invalidating its ciphertext.

**Local account.** The `Meta` table holds singleton app state keyed by string. Among its keys is the on-device **account profile** (`profile`): a stable `authorId` (the attribution key that edits and presence attach to) plus the user-editable `displayName` and `presenceHue`. It is created with sensible defaults on first read and repaired in place if a stored value is invalid; it never leaves the browser (§4.9). A per-tab id lives separately in `sessionStorage`, not in Dexie.

---

## 4. Feature Specifications

### 4.1 Spaces

A **space** is an independent writing project with its own sections, documents, notes, and citations.

**Create a space.**
1. From Home, click **Start a new space** → navigates to `/new` (Templates).
2. Pick a template (Fiction, Research, Essay, Journal). Each seeds its own initial sections and doc set.
3. Enter a **name** and a **tag** (short label).
4. Submit. The space is created in IndexedDB and the user lands on its first doc. While the cloud
   write lock is engaged (a key mismatch, or signed in without a key), an inline notice explains
   the reason and links to the Cloud sync tab, and submission is disabled until it is resolved.

**Switch spaces.** The SpaceRail on the left lists existing spaces in Write mode. In Focus mode it collapses to a compact FocusRail.

**Rename a space.** Click the space title in the sidebar → an inline input appears. **Enter** commits; **Escape** reverts.

**Delete a space.** Space settings → **Danger zone** tab. The Delete button stays disabled until the user types the space name into the confirmation input. Deletion redirects to Home.

*Covered by:* `space-creation.spec.ts`, `space-settings.spec.ts`, `split-and-sidebar.spec.ts`, `templates-form.spec.ts`, `Templates.test.tsx`, `TemplatesNotice.test.tsx`, `SpaceSettings.test.tsx`.

---

### 4.2 Documents and sections

A space is structured as **sections** containing **documents**. The default sections vary by template (e.g., Fiction has *Manuscript* and *Characters*; Research has *Manuscript* and *Data*).

**Section menu.** Each section header carries a **⋯ menu** (a design-system kebab, revealed on hover) with **Add document**, **Rename**, and **Delete…**. It replaces the earlier bare **+**, which was ambiguous — it added a document but read as "add section". The **Workshop** section (which hosts the Brain Space link) is reserved: its menu offers only **Add document**, never Rename or Delete.

**Add a doc.** From a section's **⋯ menu**, choose **Add document** to reveal an inline input. **Enter** creates the doc and navigates to it; **blur** (clicking away) saves the doc in place without navigating, or silently clears the input when empty; **Escape** cancels. (Selecting a menu item moves focus into the input it opens, so the input is not committed prematurely.)

**Add a section.** Section structure is user-configurable by default: a template opts out only by setting `allowConfiguration: false`, so the **Add section** affordance appears below the section list on every shipped template (Blank, Fiction, Humanities, Technical, Bioinformatics), hover-revealed on the row. Clicking it reveals an inline input. **Enter** — or **blur** (clicking away) — appends a new top-level section at the next order; **Escape** cancels. (This replaces the earlier opt-in `allowExtraSections`, which limited section management to the Blank template.)

**Rename a doc.** Double-click the doc name in the topbar breadcrumb, **double-click a doc name in the sidebar**, or choose **Rename** from the doc row's **⋯ menu** — the menu defers until it has closed, then switches the row to the same inline rename input (there is no rename dialogue). **Enter** commits; **Escape** reverts. Blurring (clicking away) also commits when the value changed.

**Move a doc to another section.** Besides dragging, the doc row's **⋯ menu** offers **Move to section** — a submenu holding a **search field over the space's top-level sections**, the document's current section ticked. Typing filters the list (arrow keys roam it, **Enter** commits the highlighted row); choosing a section relocates the document to the **end** of it (`moveDoc`) and closes the menu, while choosing the current section is a no-op. The action is offered **only where the template allows configuration** (`allowConfiguration`) — the same gate as drag reordering — so a locked space keeps its seeded shape. Subsections are not yet offered as targets (the data path already supports them; only the list is limited). Brain Space has no row menu and so cannot be moved. The submenu is built from the reusable `SearchableMenuList` design-system primitive over the new `DropdownMenu` submenu parts.

**Rename a section.** From the section **⋯ menu** choose **Rename**, or **double-click** the section label. Either switches it to an inline rename input. **Enter** or blur commits; **Escape** reverts. The same `useInlineRename` state machine drives both section and doc inline renames. The Workshop section cannot be renamed (its identity is label-based). A commit that fails — e.g. entering the reserved label “Workshop” — keeps the field open with an accessible inline error (`aria-invalid` + `role="alert"` message) rather than silently reverting; editing the draft or pressing **Escape** clears it.

**Delete a doc.** Each document row carries a **⋯ menu** (revealed on hover on desktop, always shown on mobile) with a **Delete…** action that opens a destructive confirmation dialogue. Confirming cascades the delete — the document, its annotations, its revision history, and its collaborative CRDT state (`docUpdates` log + `collab-seed` marker) are all removed. Brain Space notes that linked to the document are **unlinked** (the note survives; only its dead link is cleared). If the deleted document is the one currently open, the app navigates back to the space so the first remaining document loads.

**Delete a section.** From the section **⋯ menu** choose **Delete…**. When the section still holds documents the confirmation names the count ("… and its *N* documents will be permanently deleted"); an empty section shows a lighter warning. Confirming cascades through `deleteSectionCascade`: the section, its subsections, and every document they contain are removed (each document via the same doc cascade above). If the open document lived inside, the app navigates back to the space. The Workshop section is refused at the service layer, not just hidden in the UI.

**Reorder and move by dragging.** Sections and documents are rearranged by **pressing and moving** the section header or the document row itself (no separate handle) — the whole nav is one drag space. A mouse drag activates on movement (8px distance), so a click or double-click is never misclassified as a drag; touch uses a long-press (200ms, with tolerance cancelling on scroll); and presses on a row's interactive children (kebab trigger, menu items, the inline-rename field) never start a drag. Sections reorder among the top-level list (`reorderSection`); a document reorders within its section or **moves to another section** by dropping it there (`moveDoc`). Both renumber the affected list densely and persist through an unindexed `Doc.order` / `Section.order`; a reorder does not bump `updatedAt`. The nav holds an **optimistic order** so a drop lands where it was dropped without a flash while the move persists; reconciliation with the live query is held until fresh data arrives (or rolls back immediately if persisting fails). **Cancelling a drag** (Escape during a keyboard drag) restores the live order and is announced ("Cancelled moving …"). Reordering is offered only where the template allows configuration; the reserved Workshop section cannot be moved — its header is never a drag surface — but it **remains a drop target**, so a document can always be moved (or moved back) into it. Custom keyboard-drag instructions reach assistive technology through each drag surface's accessible description (`aria-describedby` resolves regardless of the target's visibility); dnd-kit's default id-based announcements are silenced at the source and its `role="status"` region stays inside an `aria-hidden` host so it never collides with the app's own status regions. Its label is reserved too: creating or renaming a section to “Workshop” is refused at the service layer (`createSection` / `renameSection`), so a user section cannot impersonate the protected Workshop. A drop resolves via a pure `resolveSidebarDrop`, so the mapping from drag to persistence is unit-tested independently of the pointer. Dragging a document that renders flattened from a subsection **re-homes it to the top-level section it is dropped in** — its subsection membership is deliberately dropped, pending subsections becoming a first-class feature.

**Autosave.** Edits flush to IndexedDB ~600 ms after the last keystroke. Content survives navigation and hard reload. Autosave is collaboration-aware: it persists local and undo/redo (`historic`) edits on that debounce, but skips remote (`collaboration`) reconciliations — with a bounded-staleness backstop (twice the debounce) so a local edit coalesced into a remote reconciliation is never lost.

**Collaborative editing.** The editor is collaborative by default. Content lives in a per-document CRDT (a Yjs update log in the `DocUpdate` table), seeded from the document body when the document is created and loaded into the editor through the Lexical `CollaborationPlugin` — the editor no longer loads a body string. Every tab on this device that opens the same document shares one live history over a same-origin BroadcastChannel: an edit in one tab appears in the others as you type, and concurrent edits in two tabs merge without overwriting. Undo/redo is **per writer** — undoing in one tab steps back only through that tab's own edits. See § 4.2.1 for restore semantics.

**Empty space.** Visiting `/s/:spaceId` without a docId redirects to the first doc; if none exists, the user sees an empty state.

*Covered by:* `editor.spec.ts`, `multi-tab-sync.spec.ts`, `sidebar-doc-delete.spec.ts`, `sidebar-sections.spec.ts`, `sidebar-section-delete.spec.ts`, `sidebar-reorder.spec.ts`, `persistence.spec.ts`, `split-and-sidebar.spec.ts`, `Sidebar.test.tsx`, `SectionRowMenu.test.tsx`, `DeleteSectionDialog.test.tsx`, `DeleteDocDialog.test.tsx`, `deleteDocCascade.test.ts`, `deleteSectionCascade.test.ts`, `moveDoc.test.ts`, `reorderSection.test.ts`, `doc-move-section.spec.ts`, `DocSectionSubmenu.test.tsx`, `SearchableMenuList.test.tsx`, `WriteSurface.test.tsx`, `Topbar.test.tsx`.

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
- **Sections:** grouped doc lists, each header carrying a **⋯ menu** (Add document, Rename, Delete…). Dragging is press-and-move on the header itself (long-press on touch) — there is no separate grip. A section's list also includes the docs of its subsections, flattened in — subsections render no header row of their own in the nav (the data model keeps the nesting; only the rendering is flat, so new docs are added at section level). Sections reorder among themselves by drag or keyboard; documents reorder within their section the same way. The Workshop section's menu offers only its add action, labelled **Add workspace** (the Workshop holds workspaces). Its Brain Space link carries the unsorted-note count aligned to the same trailing column as the document counts, reserving the (absent) kebab gutter.
- **Doc row menu:** each document row has a **⋯ menu** (Rename, **Move to section**, Delete…) — revealed on row hover/focus on desktop, always visible on mobile. **Move to section** opens a searchable submenu of the space's top-level sections (current one ticked), gated on the template's `allowConfiguration`. Dragging is press-and-move on the row itself (long-press on touch), with no separate grip.
- **Drag announcements:** dnd-kit's default id-based live region is hidden (portaled into an `aria-hidden` host so its `role="status"` never collides with the app's status announcers); a labelled `aria-live` announcer narrates each drag ("Picked up…", "Moved … to …") for assistive technology.
- **Brain space link:** routes to `/s/:spaceId/brain-space`; shows the unsorted-note count and highlights when active.
- **Footer:** Home, About, GitHub links.
- **Mobile:** replaced by a hamburger button in the topbar that opens the same content (the SpaceRail plus the sidebar) in a dialog drawer. The drawer closes when the user taps a destination.

*Covered by:* `mobile-nav.spec.ts`, `split-and-sidebar.spec.ts`, `sidebar-sections.spec.ts`, `sidebar-section-delete.spec.ts`, `sidebar-reorder.spec.ts`, `doc-move-section.spec.ts`, `Sidebar.test.tsx`, `DocSectionSubmenu.test.tsx`, `MobileNavDrawer.test.tsx`.

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

Tabbed user-wide preferences. The shell-header wordmark badge (`L`) links back to Home — the primary way out of settings on mobile, where the SpaceRail's home link is hidden.

| Tab | Status | Contents |
|-----|--------|----------|
| **Editor** | Active | Floating-toolbar toggle (On / Off chips), persisted to `localStorage`. |
| **Theme** | Active | Light · Dark · HC Light · HC Dark. Sets `data-theme` on `<html>`. |
| **Typography** | Active | Prose / UI font settings (component present, see `Settings.test.tsx`). |
| **Shortcuts** | Active | Keyboard reference. |
| **Backups** | Active | Backup management. |
| **Profile** | Active | On-device profile: an editable **display name** and a **presence colour** (five-hue picker). The name and colour label your cursor to collaborators — today across your own tabs on this device (see § 4.2). Stored locally only. Cloud sync lives in its own tab (§ 4.9.1), not here. |
| **About** | Active | Build information and links: app **version**, the **commit** SHA and **build time** embedded at build time (`vite.config.ts` defines → `lib/version`), the licence, and Source / Changelog / Send-feedback links to the repository. |

Mobile: all tabs reflow without horizontal overflow at 390×800.

*Covered by:* `settings.spec.ts`, `settings-mobile.spec.ts`, `Settings.test.tsx`, `ProfileTab.test.tsx`, `CloudSyncTab.test.tsx`, `AboutTab.test.tsx`, `PresenceHuePicker.test.tsx`, `profile.test.ts`.

#### 4.9.1 Encrypted cloud sync (beta, hidden by default)

An opt-in beta that replicates a space's content across a user's devices via
[Dexie Cloud](https://dexie.org/cloud/), with **all content encrypted on the client
before upload** — the server stores only ciphertext. It is inert unless **both** gates
are on: a build gate (`VITE_DEXIE_CLOUD_URL` must be an `https://` URL) and a per-device
gate (`?cloud-sync=on`, persisted to `localStorage`). With either gate off there are no
cloud code paths, no cloud UI, and the schema is identical to the base app.

- **Key model.** A 32-byte root secret is minted on setup. An `AES-256-GCM` content
  key is derived from it (HKDF-SHA-256, non-extractable), plus a public one-way
  **fingerprint** (a second HKDF info string) that identifies the key without revealing it.
  The master is wrapped under a passphrase-derived key (PBKDF2-SHA-512, ≥ 800 000 calibrated
  iterations; the passphrase is NFKC-normalised first, so composed and decomposed keyboard
  input derive the same key — and the setup dialog validates, compares, and rates that same
  canonical value, so it can never reject two visually identical passphrases the crypto would
  treat as equal) into an **escrow** record; a one-time **recovery code** (Crockford base32 of
  the master) is the fallback if every device forgets the passphrase. The device's derived
  key ring lives in a **separate, never-synced** keystore database, which also holds the
  escrow until it is published (see Key reconciliation). The published escrow row's id is
  `#v1` — Dexie Cloud's private-singleton key form, scoped per account on the server — so
  every account gets its own escrow and one account's row can never shadow another's.
- **Envelope.** Each encrypted row keeps its primary key and indexed fields plaintext and
  moves every other field into a `$lipsumCipher` envelope (`AES-256-GCM`, fresh IV per
  seal, AAD binding `table` + `primaryKey` + `epoch`).
- **Sync scope.** Encrypted: spaces, sections, docs, notes, note attachments,
  annotations, citations, connections, revisions, palettes. Never synced: settings,
  backups, sync bookkeeping, the CRDT `docUpdates` log, and the device keystore.
- **Device registry.** The beta allows **four devices per account**, tracked in a synced
  but **unencrypted** `cloudDevices` table so a device that holds no key yet can still count
  the slots and be told it is past the cap. A row carries only the addon's random per-device
  client identity and timestamps (`joinedAt`, `lastSeenAt`, and `revokedAt` once revoked) —
  never a device name, user agent, or content. A registered device refreshes `lastSeenAt` at
  most **once an hour**: the table is synced, so an unconditional refresh would push, settle
  the sync round, re-trigger the registrar and push again — an unbounded sync loop. A slot
  goes **stale after 7 days** of silence and is then reclaimable, which is what stops a
  discarded browser profile holding a slot for ever; only live slots count against the limit,
  so stale and revoked rows never lock a new device out. Users see their devices in Cloud
  settings and can **sign out** of the current one or **revoke** any other, which frees its
  slot at once and leaves a tombstone so the revoked device can tell it was removed. The limit
  is a **client-side beta courtesy, not a security boundary**: the server does not enforce it,
  a revoked device keeps its Dexie Cloud session, and two devices racing for the last slot can
  transiently both take it. Both windows are overridable per deployment, in seconds, via
  `VITE_DEVICE_REFRESH_SECONDS` and `VITE_DEVICE_STALE_SECONDS`, so the reclaim can be
  exercised in minutes rather than days; a malformed or non-positive value falls back to the
  default.
- **Device list.** Signed-in devices see **Your devices** in the cloud panel: every slot, oldest
  first, with the count in use, each row showing only when it joined and when it was last seen —
  a device has no name to show, by design. The current device is badged **This device** and a
  reclaimable one **Inactive**. Every row can free its own slot by the means that fits it: the
  current device **signs out** (revoking itself would be pointless — it holds the session and
  would rejoin), any other is **removed** behind a confirmation. The list is shown to a
  *blocked* device too: that is the device that most needs to free a slot, and until now the
  only way to free one was to sign out on the machine holding it — useless for a laptop that
  was wiped or given away. A removed device sees **This device was removed from your account**
  and is asked to sign out; nothing of its writing is deleted.
- **Reconciliation.** Because the CRDT `docUpdates` log is per-device, cross-device
  changes travel as `Doc.body` snapshots. Reconciliation is **single-flight** — one run at a
  time, with a trigger during a run coalescing into exactly one follow-up — and armed on four
  signals: the first `in-sync`, every transition out of `pulling`, every settled `syncComplete`,
  and every device-key acquisition (so rows hidden while keyless reconcile the instant the key
  arrives). Each run processes the **mounted (active) document first**, then the rest in bounded
  batches that yield the event loop, skipping any document whose body is unchanged since its last
  reconcile. It compares every row body against the local Y.Doc and, for a body a pull produced
  rather than the local editor, keeps a safety revision of the losing side then either replays the
  pulled body through the mounted editor or reseeds the CRDT — **whole-document last-writer-wins**;
  lossless cross-device merge is a recorded open decision for a future release. A doc is also
  reconciled **before its editor mounts**, so the editor always opens over a CRDT that matches the
  current row body — closing the window where a body pulled while the doc was closed would show
  stale content. That mount gate never leaves a document unopenable: if a divergent doc's local
  provenance marker is missing (so it cannot be proved locally authored) it still opens, taking the
  current row body and keeping the local side as a recoverable revision, rather than blocking the
  editor for good. The same gate is driven again whenever a paired device's writing lands
  underneath an editor that is already open (§ 4.9.2), so it no longer runs only at mount; one
  reconciliation of a document runs at a time, chained in the order they were asked for, since
  two at once would each read the state before either had written and both would mint the same
  safety revision. The mounted-editor flush is **awaitable and reports which body it persisted**: if
  the editor holds unsaved local edits the pulled remote body is preserved as a recoverable safety
  revision and the live local text is kept, so neither side is ever silently overwritten. A
  freshly-mounted, never-edited editor is correctly seen as clean — the autosave seeds its baseline
  from the body persisted at mount — and the replay through the editor **resolves only once the new
  content has persisted to the CRDT log**, so a restore that failed to land is retried rather than
  recorded as a success. On a healthy network an idle device
  typically converges in about **1–2 seconds**; a failed reconcile surfaces a visible, retryable
  status in cloud settings (never live in silence). The sync-status and reconcile-status rows are
  shown whenever the device is **signed in**, not only once it holds a key, so a signed-in keyless
  device is never left without sync diagnostics while it waits to unlock. Sign-out clears the per-device CRDT log; a
  re-pulled doc with an empty log **heals from its body** (no spurious revision, and the editor
  mount waits until the log is reseeded), so content and the editor recover after signing back in.
- **Reactive key acquisition.** Acquiring the device key (unlock, adopt, recover, or setup)
  changes no content row, so encrypted live queries would not otherwise re-run. A monotonic
  device-key revision — bumped on every key acquire/reload/forget and folded into every encrypted
  query's dependencies — makes space, section, and document names appear the instant the key lands,
  **without a page reload**. An invalidation-only `BroadcastChannel` propagates the change to other
  tabs (never any key material), so unlocking one tab refreshes them all.
- **Key reconciliation.** Setup holds the escrow on the device, not in `cloudCrypto`, and —
  while signed out — drops any escrow already in the local database (residue from an earlier
  local session) so a fresh key can never trip a spurious mismatch. Reconciliation **re-runs on
  every sync settle and sign-in change** (not once per boot); it compares the account escrow's
  fingerprint with the device ring's (or, as a fallback, the pending escrow's): absent →
  publish this device's escrow, but **only once the initial account pull is confirmed**
  (`persistedSyncState.initiallySynced` — set in the same sync round that applies the pulled
  realms' rows, so any escrow the account holds is already local; **not** gated on the private
  realm being enumerated, which never happens for a fresh empty account and would otherwise hang
  a keyless-first device on “fetching your account…”) — else defer, so a not-yet-pulled escrow
  is never clobbered, and **add-only** (never overwrite a differing `v1` row); match → nothing to
  do; differ → flag a **key mismatch**. Under a
  mismatch the write middleware refuses content writes; reads do not crash — the middleware
  drops any undecryptable row from the result and flags the mismatch, so the app stays
  reachable and the conflict banner appears in settings. The user resolves it by **adopting**
  the account key (enter the account passphrase; the device re-seals its own rows under it) or
  **erasing** the account's unreadable copy (kept: this device's notes). Erase is irreversible,
  so — like deleting a space — it is a two-step gesture: an explicit "can't be undone" warning
  plus a typed confirmation word (`ERASE`) that arms the destructive button. The escrow swap
  inside erase runs only when the device holds a **pending escrow** to install; a mismatched
  device without one erases the unreadable rows but leaves the account key (and the mismatch)
  in place — it never deletes the account escrow with nothing to replace it, which would leave
  the whole account keyless. If no account escrow exists either, the flag protects nothing and
  erase clears it. The route-level
  recovery screen still catches a genuine read failure, and its **Unlock in settings** action
  is a full navigation to the Cloud sync tab. Never clobbers, never silently loses. The New-space
  (Templates) screen also surfaces the lock **proactively**: `useCloudLockReason` (mismatch >
  keyless > none) drives an inline notice that names the reason and links to the Cloud sync tab, and
  space creation is disabled while a lock holds; a submit that still races the lock is caught and
  mapped to the same notice (`CloudKeyError` → locked, anything else → a generic failure), so a
  refused write is never an unhandled rejection.
- **Ordering.** The first device (with unencrypted writing) stays on passphrase-before-sign-in
  — sign-in is turned back until its writing is sealed. A **clean** device (no plaintext synced
  rows) may sign in first and then unlock/adopt the account key; while it is signed-in-keyless
  the middleware refuses content writes and hides sealed rows, so a keyless write is never
  uploaded in the clear either way. The refusal is scoped to **app** writes: the addon applies
  rows it just pulled (already ciphertext) through the same table API but inside a
  change-tracking-disabled transaction, and the lock exempts those — otherwise the initial pull
  would abort, `initiallySynced` would never be set, and a content-bearing account would deadlock
  on “fetching your account…”. Should that pull genuinely fail to settle, the keyless section
  does not sit on “fetching your account…” indefinitely: a sync **error** phase turns it into a
  retryable notice (a **Try again** that forces a fresh pull), and an **offline** phase says so
  and resumes on its own — neither offers a key-minting action, so the divergence guard holds.
  Presence itself resolves only once **both** the pull is confirmed complete **and** the local
  escrow-row query has settled at least once: on a reloading device the persisted pull flag is
  already `true` while the row read is still in flight, and reporting “no key” in that gap
  would offer Set-up over an account that has one. The settings action row offers **no** set-up or unlock of
  its own — the presence-gated keyless section is the single source of key actions, so a set-up
  can never mint a key that diverges from a not-yet-pulled account escrow, and space creation is
  blocked with the same inline notice while the lock holds. Sign-in is surfaced on
  the Home page (flag-gated) as a button at the top right of the header so it is discoverable
  before a space exists; the **Quick settings**
  popover always offers a direct **Profile** link to the profile settings tab (where the display name and
  encryption live), regardless of the flag. Every sign-in attempt first opens an
  **evaluation-account acknowledgement** dialog: a red (danger) warning banner states that
  cloud sync is a demonstration
  only, the app has no server of its own (local-first, client-side), and that signing in
  automatically creates a Dexie Cloud evaluation account valid for 3 days after which synced
  data may be lost. The continue action stays disabled until the acknowledgement checkbox is
  ticked, the tick is forgotten between openings (every attempt re-acknowledges), and cancel
  backs out without contacting the network. A second, **optional** checkbox ("I have enabled
  local device sync and/or backup") invites confirming a local safety net but never gates
  continue. Opting out is **non-destructive** —
  the cloud schema is sticky so a rebuild never erases local content.
- **Four-device beta limit.** An account holds at most **four devices** while the beta runs,
  tracked in a synced, deliberately unencrypted `cloudDevices` registry — one row per joined
  device carrying only the addon's random per-device client identity (which the server already
  receives on every sync) and joined/last-seen/revoked timestamps; never a device name, user
  agent, or content. Ids and counts are readable while keyless by design, so a signed-in further
  device is **hard-blocked** before it can act: the keyless section is replaced by a banner
  naming the limit, and no unlock or set-up is offered. A device registers itself once it is
  signed in and holds a key, and refreshes its slot at most hourly — the registry is a synced
  table, so an unconditional refresh would push, settle the sync, re-trigger the registrar and
  push again, an unbounded loop (§ 4.9.1). Forgetting the key keeps the slot (the device is
  still signed in and expected to unlock again). A slot is freed in three ways: **signing out**
  on the device holding it, **removing** it from any other device (which stamps a tombstone the
  removed device can see, and frees the slot at once), or by the device going quiet for seven
  days, after which its slot is **reclaimed** — so a wiped or discarded browser profile cannot
  hold a slot for ever. Only live slots count against the limit. The gate is a client-side beta
  courtesy, not a security boundary; the section heading carries a persistent beta notice naming
  the limit and advising local backups.
- **Server sees / does not see.** Cannot: bodies, titles, note text, citation
  metadata, attachment bytes. Can: record ids and relationships, timestamps, note kinds,
  citation keys and years, the sign-in email, sync timing/IP, and the device-registry rows
  (random per-device client identity plus joined/last-seen timestamps — identifiers and timing
  the sync protocol already exposes). Account creation is not supported.

See [`docs/cloud-sync-beta.md`](cloud-sync-beta.md) for the full design note and the
manual verification protocol. *Covered by:* `middleware.test.ts` (the P1–P8 ciphertext and
mismatch-lock spike), `envelope.test.ts`, `keys.test.ts` (incl. fingerprints),
`errors.test.ts`, `keyMismatch.test.ts`, `keylessLock.test.ts`, `lockReason.test.ts`,
`keylessGuard.test.ts`, `useCloudLockReason.test.tsx`,
`recoveryCode.test.ts`, `setup.test.ts` (incl. adopt/erase, add-only publish, sign-in guard),
`escrowReconcile.test.ts` (incl. re-arm and the deferred pull-gate), `cloudClient.test.ts`
(pull-complete + sign-in guard), `buildDb.test.ts`, `reconcile.test.ts` (cross-device
reconciliation and empty-log healing), `reconcileDocForMount.test.ts` (the pre-mount gate,
incl. the missing-baseline fallback), `useDocCrdtReady.test.tsx`, `snapshot.test.ts` (the
CRDT ⇄ body round-trip), the `src/components/errors/`, `src/components/templates/` (the
write-lock notice) and `src/components/settings/tabs/cloud/` component tests, and
`cloud-sync.spec.ts` / `cloud-crdt-recovery.spec.ts` / `templates-form.spec.ts`.

#### 4.9.2 Device pairing (Stage 2A, in progress)

Direct device-to-device sync over the local network, with no Writer-operated
server. The normative protocol lives in `packages/writer-sync/docs/`
(threat model, pairing protocol, test vectors); this section tracks what is
wired into the app.

- **Entry point.** Settings → Device sync → **Pair another device** opens the
  pairing dialog; the tab itself is one link away from Home (§ 4.9 route table).
  The dialog is mounted only while open and opens on a **start choice**: *Show a
  code to start pairing* or *Scan the code on your other device*. Nothing protocol-shaped is on that screen — no code, no symbol pager,
  no scanner — so the flow reads as a sequence (one device shows, the other
  scans) instead of two codes appearing at once with nothing to say whose turn
  it is.
- **The choice is presentational.** It selects what this screen displays and
  nothing else; the protocol half a device plays is still settled by the payload
  that arrives (`resolvePairingRole` — a reply is accepted by the device whose
  offer it answers, an offer is answered by whichever device read it). Choosing
  *show* on both devices costs a tap, not a stuck exchange: the showing screen's
  own action leads to the scanner. This is not the earlier role question, which
  committed a device to a half before anything had been scanned.
- **One step per screen.** A code and a scanner are never shown together, nor a
  code beside the verification gate. Two QR surfaces at once read as two things
  to do at once and give no clue which device is meant to be doing which.
- **Showing.** Gathering starts when the dialog opens, not when the code is
  asked for, so choosing *show* reveals a code that is usually already prepared;
  until it is, the wait is named in place. Every device gathers a WebRTC offer
  over a connection with **no ICE servers** (same-network only, never a public
  STUN fallback) and displays it as one or more QR symbols, with a single
  action — **It's been scanned — scan the reply** — that replaces the code with
  the scanner and back. Candidate gathering is bounded by a deadline; reaching
  it is not a failure, and the code is shown from whatever candidates were
  gathered. Only a description with **no** candidate at all fails. Failures are
  reported generically (never peer-supplied text), with two named exceptions
  whose advice differs: a payload too large to encode (retrying cannot shrink
  it) and an expired code (the fix is a fresh code — payloads are valid for
  five minutes, sized for the photograph-and-paste path).
- **Reading.** A device that reads an offer answers it, from a session opened
  for the purpose: it cannot answer a description it authored, so the offer it
  was showing is closed and replaced. It then shows the reply for the peer to
  read back, and moves to the digits only when the user says the reply was
  taken — nothing reaches this device when its peer reads a code. That ordering
  is why the reply and the gate are separate screens: this device knows the six
  digits as soon as it has answered, but its peer learns them only after reading
  the reply.
- **Nothing lands under a moving finger.** The reply step replaces the scanner
  the instant a payload decodes, so the reply waits **behind a reveal** rather
  than sharing a screen with the action that dismisses it, and the digits keep a
  secondary way back to it. That way back re-shows the same reply: answering is
  replay-guarded, and a second answer would move the digits the peer is
  comparing against. Without both, a reflex press cost the whole exchange. The
  reply keeps the usual five-minute validity — the guard buys deliberation, not
  a longer life.
- **Role resolution.** Decided from the payload (`resolvePairingRole`): a reply
  is accepted by the device whose offer it answers, and an offer is answered by
  whichever device read it. An earlier rule ranked the two device ids and let
  only the greater answer, which is sound for two devices watching a channel and
  wrong for two watching a camera — in the ordinary flow only one device ever
  reads anything, so the lower-ranked reader waited on a reply nobody was
  preparing. Scanning on both devices now fails visibly on the next scan instead
  of hanging. A device that reads **its own** code is told so, with the scanner
  left open.
- **Verification gate.** Both devices hold at the same gate and complete only on
  an explicit human confirmation that the six digits match. Nothing is
  transferred on authentication alone.
- **Trust is committed in two phases.** Confirming the digits authenticates the
  peer in memory only. Nothing is written to `trustedDevices`, the session is not
  published to the P2P provider, no scope channel is taken up and catch-up does
  not start until the root secret has crossed; the device is recorded at that
  point and gains sync authority only then. An incomplete pairing therefore
  leaves nothing behind, whether it expired, failed or was cut short by the tab
  closing — there is no cleanup step for a crash to skip. A known device id
  presenting a different identity key is refused before any key material moves,
  not after.
- **Confirming too late.** The session deadline is the earlier of the two signed
  ones, and is checked again when the account key is sealed — the step the human
  confirmation gates. Past it the pairing ends instead of completing: no key is
  sealed, the ephemeral key is discarded, the channel closes, and the dialog
  reads *expired*. Nothing was recorded, so a device the user had removed is
  still removed and one that was already trusted is untouched.
- **Reading a code.** Three paths, offered together: the **live camera**, an
  **uploaded photograph**, or **pasted text**. The camera is offered first
  because it is the only one that works between a desktop and a phone unaided,
  but it is never the only one — the other two need no permission and remain
  present regardless. `getUserMedia` is called on an explicit press, never on
  mount, and asks for the rear camera by preference. Frames are sampled every
  300 ms and passed straight to the decoder; a frame that will not decode is the
  normal case, not an error. The stream is released on every exit — a successful
  scan, an explicit stop, or the surface unmounting — so no camera outlives the
  dialog. A refusal (`NotAllowedError` / `SecurityError`) and an absent camera
  are reported as distinct, non-terminal states with the fallbacks intact, and
  the user may try again. Delivery requires `Permissions-Policy: camera=(self)`
  in `vercel.json`; without it the browser blocks the camera in production while
  local development works. Decoding happens entirely on the device — where the
  browser has no `BarcodeDetector` the WASM engine is **served by the app**,
  never fetched from a CDN, so scanning works offline and contacts nobody. An
  uploaded photograph is decoded to a bitmap before the platform detector sees
  it: Chromium's own `BarcodeDetector` refuses a `Blob` although the IDL admits
  one, and a chosen file is exactly that.
- **Pairing code display.** The codec carries **2600 characters per symbol**
  (headroom under the encoder's 2953-character version-40/EC-L ceiling for the
  part prefix), so an ordinary offer is a single symbol and no pager appears.
  A payload larger than that is split into the codec's bounded sequence (max 8
  parts) and stepped through manually — no timed cycling, so nothing needs
  reduced-motion gating. The symbol's own text sits beneath it as selectable
  text and follows the pager, so the exchange works with no camera at all. A
  payload past the symbol ceiling reports an error rather than rendering
  nothing. Outstanding symbols are named individually ("Still to scan: symbol
  2"), never as a bare count that reads as a quantity. Progress and failure are
  announced via `role="status"` / an error banner, and failure copy never embeds
  peer-supplied text.
- **Device identity.** Created on first use and stored in the never-synced
  device vault: a non-extractable ECDSA P-256 pair persisted as `CryptoKey`s.
  The device id is **derived from the public key** (SHA-256 over its SPKI form,
  first 16 bytes), never minted, so id and key cannot disagree. The account
  vault binds stored roots to this same id.
- **Journal retention and compaction.** Settings → Account → **Keep sync history
  for** sets how long journalled operations are kept: 7 / 30 / 90 days or 1 year,
  default **30 days**, stored in `meta` (`journalRetentionDays`, malformed values
  read as the default). The journal is compacted once per sync boot, off the boot
  path (best-effort, logged on failure). A frame is dropped once **every
  currently-trusted device has acknowledged it**, or once the window has elapsed —
  whichever comes first, so a device that never returns cannot hold the journal
  open. With no trusted device paired, the window governs alone. Acknowledgements
  are tracked per originating device within a scope, never as one mark per scope:
  an operation from one device that is logically older than an acknowledged
  operation from another has not thereby been seen. Inbox rows are **never**
  pruned — the inbox is the replay guard — and a deletion is exempt from the
  window entirely: a tombstone and the signed delete frame it names are one
  retention unit, dropped together in one transaction. A peer's acknowledgement
  marks every deletion from that origin it has read past, recorded with the
  watermark it arrived with, so the evidence outlives the frames the comparison
  was made against. Release needs every still-trusted device to have marked it;
  age alone can take neither half, so a long-absent device can neither resurrect
  a deleted entity nor be left holding it. Removing a device is the other
  release: it is what lets go of what was only being kept for that device, and
  what releases everything when the last device goes — a routine pass with no
  devices paired deliberately holds, because a peer paired tomorrow could still
  be holding what was deleted today. A peer last seen beyond the window resynchronises by full
  state exchange, not journal replay: it is sent freshly minted `put` frames for
  current state alongside the scope's retained deletions, which merge by the
  normal convergence rules rather than overwriting what it changed while away.
- **Frames are device-signed.** Every journalled frame carries an ECDSA P-256
  signature made with this device's identity key, computed over the whole frame
  except the signature itself under a domain label distinct from the pairing
  labels. A receiver verifies it after structural and payload-hash validation and
  before decryption, against the public key in its trusted-device record. A frame
  whose origin is unknown, removed or revoked — or whose signature is absent or
  does not verify — is refused and never journalled. The AAD already proved a
  frame's header and payload belonged together; the signature is what makes its
  `deviceId` a claim the receiver can check, since every device in the account
  holds the same content key. One consequence: a device accepts operations only
  from devices it has itself paired with, so a device paired with two others
  cannot relay their operations to each other.
- **Transfer and catch-up.** Paired devices exchange one manifest per accessible
  scope — a high-water mark and a count per originating device — and each asks
  only for what it lacks. Counts, not marks alone, reveal a gap: a peer holding
  more operations behind the same mark is missing frames no mark can name, so
  that origin is requested whole. A scope this device cannot decrypt is never
  requested. Replies are batched under both the protocol's frame-count ceiling
  and the byte budget the transport advertises, so no message outgrows the
  channel; a frame too large for any message even alone is skipped and
  reported rather than allowed to kill the reply, and a send failure mid-reply
  never withholds the final marker the acknowledgement depends on. Verified
  frames are appended to the journal and materialised by the
  same inbox-guarded sweep every provider shares, so an operation arriving by two
  providers still applies exactly once. Attachments transfer in the same
  conversation, but never as an oversized frame: the raw `noteAttachments.blob`
  is AES-GCM-sealed once, split into 128 KiB ciphertext chunks, and replaced in
  the row payload by its authenticated manifest. The holder offers manifests
  after the final catch-up frame batch, one page at a time and only as many as
  the peer will take at once; the peer asks for the page after the one it has
  finished with, so a space with hundreds of images is walked rather than
  offered once and refused. The peer asks only for the chunks it lacks, a page
  at a time, and asks for the next page only once the one in flight has been
  answered. Chunks are served at the connection's pace rather than written as
  fast as they are read, so a large attachment cannot outrun the link and end
  its own session. A holder that cannot supply a chunk it was asked for says so rather
  than falling silent, and the receiver drops that transfer instead of waiting
  on it for the life of the session. Each chunk is verified before it is stored,
  and an interrupted transfer resumes from the persisted gap rather than
  restarting. The receiver keeps the
  thin frame journalled but unstamped in the inbox until the complete ciphertext
  verifies and opens into the domain `Blob`. Dexie Cloud replicates the same
  bounded ciphertext as `syncAttachmentChunks` rows, so cloud and WebRTC carry
  one provider-neutral thin-frame contract.
- **Rebuilding a scope.** A request with no starting point, or one reaching
  behind this device's compaction cutoff, cannot be answered from history — the
  frames are gone — so the scope is described as it stands now: one freshly
  signed `put` frame per journalled row, indistinguishable from a journalled
  frame, so the receiver needs no second way to apply it, plus the scope's
  retained deletions as the frames their authors signed rather than replacements
  minted here. Absence describes nothing, so a scope whose every row was deleted
  answers with deletions rather than with silence. This is not the backup path,
  which exports a snapshot for a human. A scope this device holds no key for is
  not rebuilt: one it cannot seal for is one it cannot serve.
- **Root-secret handover.** A device paired for the first time holds no key
  material, so it could decrypt nothing it was sent. After confirmation — never
  on connectivity alone — each device announces whether it holds a root, and the
  holder seals its own for the one that lacks it: ECDH P-256 to the peer's
  session ephemeral key, AES-256-GCM, with the transcript bound into the AAD so
  a wrapper lifted from another exchange cannot be replayed. Which device sends
  follows from who holds key material, not from the pairing role. The rotation
  epoch travels beside the wrapper, since a receiver that guessed it would derive
  a key that decrypts nothing and look exactly like a peer with nothing to send.
  A device that already holds a root refuses an unasked-for one — its rows are
  sealed under the key it has. Announcements repeat until the peer is heard,
  because two people never confirm at the same instant and a channel drops what
  arrives before anything is listening. Key material and catch-up share the one
  channel, and both are read from the moment it opens rather than in turn: each
  device waits for key material on a deadline of its own, so a peer whose
  deadline passes first starts syncing while this one is still listening for
  keys. Its opening manifest is held until catch-up reads it, rather than being
  refused — sent once and never repeated, a refusal cost that direction of the
  exchange for the whole session. Each protocol withholds only what certainly
  belongs to the other, so a message belonging to neither still reaches both
  decoders and is refused by each. The root is zeroed as soon as it is
  stored, and the receiving device derives its ring exactly as a passphrase
  unlock would; there is no separate paired-device key path.
- **The device list, removal, and re-pairing.** Settings → Device sync lists
  every device the account has paired with, revoked ones included and badged as
  removed — a list that silently forgot a removal would leave "never paired"
  and "paired and removed" indistinguishable. Removing a device marks its
  trust record revoked (kept, never deleted): it can open no new authenticated
  session and every frame it signs is refused, but nothing already copied to it
  can be recalled, and the list says so beside the action. A device removed
  while it is connected is disconnected as the removal commits, and any frame
  still in flight from it is refused — trust is re-read for every inbound frame,
  never cached for the life of a session — so removal takes effect at once
  rather than at the next reload. Removal is undone
  only by pairing the device afresh: a completed, digit-confirmed exchange
  reactivates the record if — and only if — the presented identity key equals
  the stored one, and the dialog declares success only after that adoption has
  been recorded. A known device id presenting a different key fails the pairing
  with named copy (`trusted-key-mismatch`) and leaves the record untouched.
- **Connection state.** Sessions are made by the pairing exchange and survive no
  reload, so *not connected* is the resting state on every app start. Every row
  states it — a blank row left a paired device looking ready to sync when
  nothing could reach it — and every row not carrying offers **Reconnect**.
  Only the app-wide notice is gated to a live loss. Each session publishes a `PeerLinkState`
  (`connecting` / `connected` / `interrupted` / `closed`); `disconnected` and
  `failed` collapse into `interrupted`, since with signalling only through the QR
  exchange there is no ICE restart to attempt. The registry reports these to a
  page-lifetime store (`peerLinkStatus`) holding `connecting` / `connected` /
  `dropped` per device, where **`dropped` is reachable only from `connected`** —
  so a pairing that never came up, and a session torn down locally, both leave
  nothing behind. Liveness lives there rather than in the provider observable:
  `useSyncStatus` reads `durableSync`, which P2P does not offer. A row shows its
  state as a `StatusBadge` (*Not connected* at rest, glyphless; *Disconnected*
  for a link lost mid-session); that loss also raises one app-wide notice (`NoticeDock` → `InlineBanner`, `role="status"`, out of flow,
  no dialog, no focus taken). Its action opens the device list; the row offers
  **Reconnect**, a fresh exchange — the transport is gone and no channel remains
  to renegotiate over. The trust record persists and both devices already hold
  the root secret, so **no second key handover** occurs.
- **What a device may ask for.** A peer's manifest is filtered by whether this
  device *could decrypt* a scope, which is not the same question as which scopes
  it already holds. Stage 1 derives one content key for every scope, so a device
  holding the account key can read any scope offered; deciding from what it
  already had would leave a freshly paired device — holding none — asking for
  nothing, and so never receiving the first scope that would let it ask.
- **Channels are used only once open.** A device that creates a data channel
  holds it in `connecting` while the connection forms, and writing then throws;
  the answering device never sees that state, since its channel arrives open.
  Catch-up and key transfer therefore wait for `open` rather than for the channel
  to exist.
- **Proven end to end.** `pair-sync.spec.ts` drives two browser contexts through
  a real WebRTC pairing and asserts that writing held by one device appears on
  the other, live and after a reload. `pair-sync-content.spec.ts` goes inside a
  space: a brain-space note and the text typed into it cross to a canvas that is
  already on screen, and text typed into a document reaches an editor the other
  context already has open — with no navigation on the receiving side, which is
  what separates a document that syncs from one that merely would on a revisit.
  `attachments-pair-sync.spec.ts` adds an
  image larger than two transfer chunks on one context and proves it renders on
  the peer and survives reload. `peer-link-state.spec.ts` drives the real
  registry, store and surfaces through every state around a lost link, faking
  only the browser event (`window.peerLink`, dev/E2E builds only);
  `pair-device-drop.spec.ts` pairs two contexts for real and closes one, proving
  a genuine drop reaches the same place. Two physical devices on a network remain
  slice 2A.9 and are not discharged by any of them.
- **Live peer sync.** Catch-up answers "what did I miss?" when a connection
  opens; work written *while* a peer is connected reaches it as it is journalled.
  The P2P provider is named at boot beside Dexie Cloud and supplies a transport
  per scope over the paired connection; a registry stands between it and pairing,
  so the provider never depends on the dialog's lifetime. Only frames this device
  authored are sent — one that arrived from a peer is already held there. The
  message is the same `frames` message catch-up speaks, so a receiver verifies,
  journals and materialises it by exactly the path everything else takes.
- **An arrived document reaches the screen.** Materialising a frame updates a
  row, and every surface but one refreshes itself from there. A document is the
  exception: its editor renders from the CRDT log, which is local-only and which
  no frame touches, so an arriving body used to stay invisible until the editor
  was remounted by navigating away and back. Each document another device wrote
  to is therefore put through the same gate a mount uses (§ 4.9.1): the arriving
  body replaces what an open editor is showing at once, and a document no editor
  holds has its log reseeded and other tabs told to remount onto it. A document
  the gate found already in agreement is announced to nobody. Local work that
  was never written to the row is kept first as a recoverable **pre-sync**
  revision, and only then replaced — but a revision is minted only where there
  is something to protect, since a body arrives on every pause in the other
  person's typing and revisions replicate. This device's own frames are skipped:
  it already shows what it typed. Convergence remains whole-document
  last-writer-wins; merging concurrent edits needs the CRDT itself to cross the
  peer link, which is still not wired.
  A device accepts any channel its peer opens, which is how it receives work in a
  scope it never writes to and so never asks for a channel for. Both directions
  are covered by `pair-sync.spec.ts`. A transport is made once per scope and
  kept, so it is only ever written to while it can carry something: a frame
  journalled before the channel has finished connecting waits for it to open, and
  a bearer that goes away is given up rather than written into — the channel
  leaves its session, the link is dropped, and the next frame opens a fresh one.
  Pairing a device again replaces whatever session was registered for it, which
  is what lets a device carry live work again after a connection dropped. A frame
  that misses the peer either way stays journalled, and catch-up carries it.
- **Recorded limits.** Revision payloads are not chunked: an individual revision
  that exceeds the carrier budget is skipped and reported, then offered again on
  a later catch-up. Attachment chunk rows are removed transactionally when their
  attachment is deleted, but orphan collection beyond that same-transaction
  path is deferred. More than two devices is also not wired: the channel factory
  takes the peer that is connected, and fanning a scope across several needs a
  send that reaches all of them and a receipt credited to one. The pairing exchange
  runs against real WebRTC between two browser profiles, driven end to end by
  `pair-device.spec.ts`; it has not yet been verified between two physical devices
  on a real network.

*Covered by:* `qrSignallingAdapter.test.ts`, `pairingSession.test.ts`,
`payloadValidation.test.ts`, `replayCache.test.ts`, `pairingCodec.test.ts`,
`qrSequence.test.ts` (package); `deviceIdentityStore.test.ts`,
`createPairingSignaller.test.ts`, `journalRetentionPreference.test.ts`,
`pruneExpiredOperations.test.ts`, `journalRetention.test.ts`,
`PairingCodeDisplay.test.tsx`, `PairingCodePager.test.tsx`,
`PairDeviceDialog.test.tsx`, `PairDeviceSection.test.tsx`,
`PairingRoleChoice.test.tsx`, `InitiatorPairingView.test.tsx`,
`JoinerPairingView.test.tsx`, `pairingExchangeReducer.test.ts`,
`JournalRetentionSelector.test.tsx`; and `pair-device.spec.ts`.
Attachment framing, assembly and transfer are covered by
`operationJournalMiddleware.test.ts`, `writerFullState.test.ts`,
`writerOperationMaterializer.test.ts`, `attachmentChunkStore.test.ts`,
`attachmentTransfer.test.ts`, `peerCatchUp.test.ts`, and
`attachments-pair-sync.spec.ts`.

---

### 4.10 Per-space settings (`/s/:spaceId/settings`)

Reached via the cog in the sidebar header. The **back** link returns to the active space (not Home). The shell-header tag badge is likewise a link back to the space's Write view — the way out of settings on mobile.

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
- **Quick settings surface:** The popover's controls live in the rail's Quick Settings popover, reached from the rail's **⋮** button — on mobile the rail travels inside the nav drawer, so the popover opens from there. Order: **Writing** (the focus and floating-toolbar toggles, reading as one group with no hairline between them), a **Settings** group holding the **universal settings** and **account** links, **Appearance** (theme and reading width), the guided-tour list, and the **help** link — styled like the other links — directly above the **More** group. There is no footer. Keyboard-shortcut hints (focus `mod+\`, help `mod+?`, universal settings `mod+,`) are rendered via `Kbd` so the modifier matches the running platform (⌘ on Apple, Ctrl elsewhere), and are hidden on any coarse pointer. The popover caps its height to the available viewport space and scrolls internally, so the links at its bottom stay reachable in a short window.
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

**Storage cost.** Blobs sit inside IndexedDB on the `backups` object store. The `payload` field is not indexed (index spec: `'id, when, scope, kind'`) so changing its type to `Blob` required no change to the schema spec at all. Practical implication: many snapshots of a large space can accumulate quickly — there is no auto-prune in v1.

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

- **Global Settings → Account → sign-in & cloud sync** — the Account tab manages a local, on-device profile (display name + presence colour). An **encrypted cloud-sync beta** (§ 4.9.1) exists behind two activation gates but is **hidden by default**; account creation is not supported, and it is not part of the default experience.
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
