# Home & About

A pair of static landing pages that replace the silent boot-time redirect at `/`.

## Why

Previously `/` was a `BootScreen` that auto-navigated to the user's most recent world. There was no surface to introduce the app, no link to source, and no place to communicate that it is local-only and in alpha. The home and about pages fix that.

## Routes

| Path     | Component                                       | Purpose                               |
| -------- | ----------------------------------------------- | ------------------------------------- |
| `/`      | [HomeScreen](../src/screens/Home.tsx)           | Landing page with primary actions.    |
| `/about` | [AboutScreen](../src/screens/About.tsx)         | Creator note, status, license, source. |

Wired up in [src/App.tsx](../src/App.tsx).

## Home page behavior

- **Continue writing →** renders only when at least one world exists. The most recent world is fetched on mount via `db.worlds.orderBy('updatedAt').reverse().first()`.
- **Start a new world →** always renders; links to `/new` ([TemplatesScreen](../src/screens/Templates.tsx)).
- Bottom row: `About` link, `GitHub` link (placeholder), and an "alpha · local only" chip.

## About page content

Static page with sections for the maker's note (ADHD/Autism framing), status (alpha, IndexedDB-only, no sync), license ([GNU AGPL](https://www.gnu.org/licenses/agpl-3.0.html)), and source (GitHub link placeholder). Includes a `← back` link to `/`.

## In-app navigation

[Sidebar.tsx](../src/components/chrome/Sidebar.tsx) has a pinned footer block (Home / About / GitHub) below the scrollable document list. It uses the same `font-mono text-[10px] uppercase` treatment as the `PRIVATE · LOCAL` chip in the sidebar header so it reads as chrome.

## Placeholders to fill in

The GitHub URL appears three times as `href="#"` with a `TODO` comment:

- [src/screens/Home.tsx](../src/screens/Home.tsx)
- [src/screens/About.tsx](../src/screens/About.tsx) (Source section)
- [src/components/chrome/Sidebar.tsx](../src/components/chrome/Sidebar.tsx) (footer)

Replace all three when the public repo URL is available.

## Styling

Reuses existing Tailwind theme tokens (`bg-paper`, `text-ink*`, `border-rule`, `font-serif`, `font-mono`). No new tokens, fonts, or CSS variables introduced. Both pages render correctly in light and dark themes via the existing [ThemeProvider](../src/theme/ThemeProvider.tsx).
