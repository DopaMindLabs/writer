# LIpsum Writer — Technical Specification

> Derived from the test suite (15 Playwright e2e specs + 60+ Vitest unit/component specs) and source layout. Each feature below is grounded in tests that verify it, so this doc doubles as the source of truth for user-facing documentation.

---

## 1. Product Overview

**Product name:** LIpsum Writer
**Package name:** `lorem-ipsum-writer` (v0.5.0)
**Tagline:** *A clutter-free space for long-form writing — fiction, research, essays, journals.*

**What it is.** A local-first, browser-based writing app for long-form prose. It combines:
- a distraction-free Lexical editor with multiple view modes,
- a freeform visual "Brain Space" canvas for non-linear thinking,
- BibTeX-based citation management,
- per-project ("space") organization with templated section layouts.

**Who it's for.** Writers working on fiction, research, essays, or journals — including researchers who need to manage references.

**Status.** Experimental. All data is stored locally in IndexedDB; there is no cloud sync. Clearing browser data deletes the user's work.

**Tech stack.** React 19, Vite, TypeScript, Lexical (editor), Dexie (IndexedDB), Zustand (state), Tailwind, Radix UI primitives, Driver.js (tours), i18next (i18n).

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
| 7 | **Sidebar** | Per-space navigation: section list, doc list, add doc, inline rename, Brain Space link with unsorted-note count, settings cog. |
| 8 | **Mobile nav** | Hamburger drawer on small viewports; settings tabs reflow without horizontal overflow. |
| 9 | **Global settings** | Editor preferences (floating toolbar toggle), Theme (Light / Dark / High Contrast), placeholder tabs for Account, Typography, Shortcuts, Backups. |
| 10 | **Per-space settings** | General (name, tag), Sharing (coming soon), Template (coming soon), Members, Danger Zone (delete with typed confirmation). |
| 11 | **Persistence** | IndexedDB autosave (~600 ms debounce). Survives reload, route changes, browser restart. Versioned Dexie migrations. |
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
| `/s/:spaceId/dump` | Brain Space | Visual note canvas. |
| `/s/:spaceId/citations` | Citations | Full-page citations table. |
| `/s/:spaceId/settings` | Space settings | Per-space configuration. |
| `*` | Not Found | 404. |

### 3.2 Data model (Dexie tables)

`Space`, `Section` (hierarchical via `parentSectionId`), `Doc`, `Note` (state machine: `seed-prompt → seed-fetched → user`), `Connection`, `Annotation`, `Citation`, `Backup`, `Settings`, `HighlightPalette`, `Meta`.

Schema is on **version 5**; migrations backfill `Section.parentSectionId` and `Note.state` from prior versions.

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

**Add a doc.** In the sidebar, each section has an **+ Add doc to *<Section>*** button. Clicking it reveals an inline input. Type a name and press **Enter** to create the doc and navigate to it; **Escape** cancels.

**Rename a doc.** Double-click the doc name in the topbar breadcrumb. Rename input appears. **Enter** commits; **Escape** reverts.

**Autosave.** Edits flush to IndexedDB ~600 ms after the last keystroke. Content survives navigation and hard reload.

**Empty space.** Visiting `/s/:spaceId` without a docId redirects to the first doc; if none exists, the user sees an empty state.

*Covered by:* `editor.spec.ts`, `persistence.spec.ts`, `split-and-sidebar.spec.ts`, `Sidebar.test.tsx`, `WriteSurface.test.tsx`, `Topbar.test.tsx`.

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
- **Sections:** grouped doc lists, with an **+ Add doc to *<Section>*** button under each.
- **Brain space link:** routes to `/s/:spaceId/dump`; shows the unsorted-note count and highlights when active.
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
| **Account** | Coming soon | Placeholder: *"Cloud sync is unavailable"*. |

Mobile: all tabs reflow without horizontal overflow at 390×800.

*Covered by:* `settings.spec.ts`, `settings-mobile.spec.ts`, `Settings.test.tsx`.

---

### 4.10 Per-space settings (`/s/:spaceId/settings`)

Reached via the cog in the sidebar header. The **back** link returns to the active space (not Home).

| Tab | Status | Contents |
|-----|--------|----------|
| **General** | Active | Space name and tag — Enter or blur commits, Escape reverts. |
| **Sharing** | Coming soon | *"Per-space visibility and shared links"* placeholder. |
| **Template** | Coming soon | Cannot change template after creation; placeholder explains. |
| **Members** | Present | Component scaffold (no implementation). |
| **Danger zone** | Active | Delete button stays disabled until the typed confirmation matches the space name. Deletion redirects to Home. |

*Covered by:* `space-settings.spec.ts`, `SpaceSettings.test.tsx`.

---

### 4.11 Persistence

- **Storage:** IndexedDB via Dexie. No network calls for user content.
- **Autosave:** ~600 ms debounce from the last keystroke.
- **Survival:** Hard reload, route navigation, browser restart.
- **Migrations:** Versioned schema; v1→v5 upgrade path tested. Backfills are non-destructive.
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
- **Replay:** From the help menu.
- **Persistence:** Completed tour IDs are stored in `localStorage` under `lipsum-tours`. A `resetAll` utility clears them.

*Covered by:* `tours/HelpMenu.test.tsx`, `tours/storage.test.ts`, `tours/useTour.test.ts`, `tours/useAutoTour.test.ts`.

---

### 4.14 Internationalization

i18next is wired in with namespaces `common`, `chrome`, `screens`, `app`, `templates`. Currently the only supported language is **English (`en`)**. Missing translations fall back to the key. Adding a language requires only resource files.

*Covered by:* `i18n.test.ts`.

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

### 7.1 End-to-end (Playwright) — 15 specs

| Spec file | Feature area |
|-----------|--------------|
| `smoke.spec.ts` | Routing, Home, About, 404 |
| `editor.spec.ts` | Editor autosave, doc rename |
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
- **Hooks:** `useCitations`, `useConnections`, `useDocuments`, `useNotes`, `useSpaces`.
- **Store:** `ui` (Zustand).
- **DB:** `db` (Dexie migrations), `seed`.
- **Utilities:** `bibtex`, `formatting`, `doc-naming`, `ids`, `utils`, `templates`, `i18n`.
- **Theme / tours:** `ThemeProvider`, `tokens`, `HelpMenu`, `storage`, `useTour`, `useAutoTour`.

---

## 8. Known gaps and "coming soon" surfaces

These exist as scaffolding only — they are visible in the UI but not yet functional:

- **Global Settings → Account** (cloud sync).
- **Space settings → Sharing** (per-space visibility, shared links).
- **Space settings → Template** (change template after creation).
- **Space settings → Members** (no implementation behind the tab).
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
