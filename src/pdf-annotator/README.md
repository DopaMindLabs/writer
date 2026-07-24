# pdf-annotator

## What this is

A self-contained, engine-agnostic text-annotation layer for a rendered PDF. It
owns the pipeline from a DOM text selection through normalised geometry to
rendered marks. It knows nothing about pdf.js, Dexie, i18n or this app's design
system: it takes a DOM container and persistence callbacks, and renders marks
from plain data. It is written to be lifted out into its own npm package with
no code changes — only its import specifier changes.

## Public API

Everything is re-exported from `index.ts`; import the module only through it.

- `PdfRect`, `AnnotationKind`, `SelectionCapture`, `AnnotatorAnnotation`, `PdfSelectionCapture` — the shared data types.
- `rectToNormalized`, `normalizedToPixels`, `clientRectsToNormalized`, `buildSelectionCapture` — geometry helpers (client rects ⇄ page-fraction rects).
- `resolveSelectionPage` — resolves the single page a `Selection` sits on.
- `useTextSelection` — reports a `SelectionCapture` when the user finishes selecting text in the container.
- `useAnnotator` — the controller; owns the selection stash, exposes the host's persistence callbacks.
- `Annotator`, `AnnotatorCallbacks` — the controller's types.
- `AnnotationLayer` — the per-page overlay; renders one `AnnotationMark` per annotation on the page.
- `AnnotationMark` — one mark: a tinted span per rect plus an interactive union-box button.
- `swatchRecipe` — maps a colour name to its `bg-hl-*` token class.

## DOM contract

The host viewer must render each page wrapped in an element carrying
`[data-page-number]` (1-based) with `position: relative`, containing a
`.textLayer` with selectable text. Marks are positioned as fractions (0–1) of
that page-wrapper's box, so they re-project correctly at any zoom.

## CSS contract

The module emits only utility and token class **strings**; the host's Tailwind
theme must define the token-backed ones. Classes emitted today:

- Colour tokens (host must provide): `bg-hl-yellow`, `bg-hl-pink`,
  `bg-hl-blue`, `bg-hl-green`, `bg-hl-ash`; the list's 3px colour edges
  `border-l-hl-yellow`/`-pink`/`-blue`/`-green`/`-ash`.
- Ground and rule tokens (host must provide): `bg-paper`, `bg-paper-2`,
  `border-rule`, `bg-rule`, `text-ink`, `text-ink-2`, `ring-ink`,
  `ring-offset-paper`.
- Layout / type utilities (standard Tailwind): `absolute`, `inset-0`,
  `mix-blend-multiply`, `pointer-events-auto`, `rounded-sm`, `rounded-full`,
  `shadow-md`, `font-mono`, `font-serif`, `line-clamp-2`, and the spacing/size
  utilities the strip, note editor and list rows compose.

## Extraction checklist

1. Add a `package.json` with `react` as a **peer** dependency and
   `class-variance-authority` + `clsx` as dependencies.
2. Move `core/`, `react/` and `index.ts` verbatim — imports are already
   relative, so nothing changes.
3. Publish the package.
4. Replace every `@/pdf-annotator` import in the host with the package name.

Nothing else changes. `boundary.test.ts` guards that no forbidden import
(`@/`, `react-pdf`, `pdfjs`, `react-i18next`, `dexie`) creeps back in.
