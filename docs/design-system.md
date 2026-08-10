# Lorem Ipsum — Design System

**Version:** 0.1 (draft)
**Date:** May 2026

> Adapted from the canonical "Lorem Ipsum — Design System" design spec. This copy documents
> the **LIpsum Writer** surface only; reading-and-publishing surfaces are out of scope for
> this repository and have been omitted. This document is the **single source of truth** for
> the design tokens, principles, and primitives used in this app. New components and features
> must align with it — see [`AGENTS.md`](../AGENTS.md) for the alignment rules agents follow.

---

## 0. About this document

- **Names are normalized.** This spec uses the normalized component name (e.g. `WorldRail`,
  `WriterSidebar`). The source-file binding (e.g. `final.jsx · FSidebar`) is noted so you can
  cross-reference the original prototypes.
- **Props are documented as `name: type — description`.** Defaults are noted where they exist.
- **States** (rest / hover / active / dark) appear under each component below.
- **Storybook is the executable component catalogue.** Run `npm run storybook` and use each
  component's `*.stories.tsx` states alongside this specification. The theme toolbar in
  [`.storybook/preview.tsx`](../.storybook/preview.tsx) exposes `light`, `dark`, `hc-light` and
  `hc-dark`; [`.storybook/main.ts`](../.storybook/main.ts) enables the accessibility and docs
  addons. This document owns the design rules; Storybook shows their implemented states.

---

## 1. Principles

The design system is built around these rules. Most decisions downstream are derivable from
them.

1. **Hairline grammar, no ornament.** Two rule weights (1 px `#e5e5e5` and 1 px `#f0f0f0`);
   nothing thicker. No shadows except on the desktop window chrome. No gradients. No rounded
   corners except the 8 px on the desktop window itself and 16 px on mobile bottom-sheet tops.
2. **Pure grayscale palette; a few typed colour exceptions.** The ink scale is strict
   black-to-white. The only typed colour exceptions are the **status palette** (error · warning ·
   success · info, §5), the **annotation highlight palette** (§7.4), and the **presence hues**
   (§7.6) — each confined to one purpose (feedback, annotation, collaboration presence). Never in
   branding, layout, or hierarchy.
3. **Three families, no more.** Source Serif 4 is editorial (titles, prose, captions). Geist
   is UI (buttons, nav labels). Geist Mono is meta (eyebrows, dates, counts, shortcuts).
4. **Borderless icons.** Glyphs sit in 28 px hit zones with transparent backgrounds at rest;
   "on" inverts colour. Hover paints a faint background, never a stroke.
5. **Affordances are explicit, not algorithmic.** Reading-time pills, continue-bars, a
   length+mood filter. Nothing is hidden behind a rank.

### 1.1 Do

| Do | When |
|---|---|
| **Inverted ink fill** | For the most important call to action on a surface (Continue · Save). White text on `Color.ink`. |
| **Hairline-underlined sans** | For secondary actions (cite · mark · share). Geist 500 with a 1-px underline. |
| **Ghost link** | For everything else (clear · sort · "see all →"). Geist 400, `Color.ink3`, no underline. |

### 1.2 Avoid

- **Drop shadows on cards.** The system uses hairlines, never elevation. Only the desktop
  window has a shadow.
- **A brand accent colour for hierarchy.** If a primary CTA needs emphasis, flip it to a solid
  ink fill. Never introduce a brand accent. The status palette (§5), annotation highlights
  (§7.4), and presence hues (§7.6) are the only typed colour exceptions, each for its stated
  purpose.
- **Decorative emoji or stroked icons.** Icons are typographic glyphs (`⌕ ⤢ ⋯ ⋮ ◐ §`) on
  transparent grounds.
- **More than two type sizes per block.** Eyebrow + title + body — that's the upper bound. If
  you need a third size, you're building a new block.
- **Soft tints for status.** Status is text + glyph, not a coloured pill. The tinted-colour
  exceptions are the highlight-colour palette inside annotations (§7.4) and the presence hues
  (§7.6).

### 1.3 When to use which ink

| Token | Use it for | Notes |
|---|---|---|
| `Color.ink` | Headlines · primary text · inverted fills | Use sparingly. Save for the thing the eye should land on first. |
| `Color.ink2` | Body prose | Default for paragraphs longer than one line. Easier on the eye than ink. |
| `Color.ink3` | Meta · captions · italic-serif voice · ghost links | The "second voice." Italic serif at this tone carries blurbs and marginalia. |
| `Color.ink4` | Micro-meta · counts · shortcuts | The faintest readable colour. Counts, "⌘S". |
| `Color.off` | Sidebar tint · side rails · settings grounds | Visually steps back without introducing a divider. |
| `Color.white` | Page ground · cards | The page; the surface a card sits on. |
| `Color.rule` | Hairline dividers | The default 1-px line everywhere. |
| `Color.ruleS` | Sub-dividers inside tinted areas | Softer line that doesn't fight an off-tint ground. |

### 1.4 When to use which family

**`Type.serif` · Source Serif 4** — headlines, prose, captions, blurbs, pull-quotes.
- Titles always weight 400 (regular). Never 700.
- Body prose 14–18 px, line-height 1.5–1.65, `ink2`.
- Italic serif carries the "voice" — blurbs, captions, pull-quotes, second-place meta lines.
- Use `text-wrap: balance` on headlines and `text-wrap: pretty` on prose.

**`Type.sans` · Geist** — buttons, nav labels, mode tabs, settings labels.
- UI text only. Never set body prose in sans.
- Weight 400 at rest, 500 when active or interactive.
- Primary CTA: ink fill + white text. Secondary: 1 px underline.

**`Type.mono` · Geist Mono** — eyebrows, dates, counts, shortcuts.
- 9–11 px, letter-spaced 0.6–1.2. All caps unless it's a number/date.
- Mono italics don't exist. Mono is always upright.
- Use for meta only — never as a substitute for sans UI text.

---

## 2. Foundations

### 2.1 Colour scale

| Token | Hex | Where it's used |
|---|---|---|
| `Color.white` | `#ffffff` | Page ground; card backgrounds. |
| `Color.off` | `#fafafa` | Sidebar tint, side rails, settings card grounds. |
| `Color.rule` | `#e5e5e5` | Standard hairline rule. Cards, dividers, default borders. |
| `Color.ruleS` | `#f0f0f0` | Softer rule within tinted areas (sidebar internal dividers). |
| `Color.ink4` | `#a3a3a3` | Micro-meta — hint shortcuts, counts. |
| `Color.ink3` | `#737373` | Meta, captions, blurbs, "italic-serif voice." |
| `Color.ink2` | `#404040` | Body prose. |
| `Color.ink` | `#111111` | Headlines, primary text, inverted fills (chip-on). |
| `Color.black` | `#000000` | Reserved for the device chassis only. |

> **In this repo:** these map to CSS custom properties in [`src/index.css`](../src/index.css)
> (`--paper` = white, `--paper-2` = off, `--ink`/`--ink-2`/`--ink-3`/`--ink-4`, `--rule`,
> `--rule-s`, `--accent`) and to Tailwind colour utilities in
> [`tailwind.config.ts`](../tailwind.config.ts) (`bg-paper`, `text-ink-2`, `border-rule`, …).
> Four themes are defined: `light`, `dark`, `hc-light`, `hc-dark` (via `data-theme`). Always
> use the token-backed classes; never hard-code a hex value.

### 2.2 Typography

| Family | Weights | Italics | Used for |
|---|---|---|---|
| `Type.serif` — Source Serif 4 | 300 · 400 · 500 · 600 · 700 | yes | Headlines, prose, captions, blurbs. |
| `Type.sans` — Geist | 300 · 400 · 500 · 600 · 700 | — | Buttons, nav labels, mode tabs. |
| `Type.mono` — Geist Mono | 400 · 500 | — | Eyebrows, dates, counts, all meta. |

**Type rules**

- **Eyebrows** are mono, 9–10 px, `Color.ink3`, letter-spaced 0.8–1.2. They sit above titled
  blocks.
- **Titles** are serif, weight 400 (regular) — never weight 700. Letter-spacing -0.3 to -1.2
  depending on size. Use `text-wrap: balance`.
- **Body prose** is serif, 14–18 px, `Color.ink2`, line-height 1.5–1.65, `text-wrap: pretty`.
- **Italic-serif** is the "voice" treatment — used for blurbs, pull-quotes, captions.
- **Mono italics don't exist.** Mono is always upright.

> **In this repo:** font families are wired in [`tailwind.config.ts`](../tailwind.config.ts)
> (`font-sans` = Geist, `font-serif` = Source Serif 4, `font-mono` = Geist Mono). Heading and
> body presets live in `src/components/ui/typography/`.

### 2.3 Rules & radius

- `1px solid Color.rule` — standard divider.
- `1px solid Color.ruleS` — sub-divider inside a tinted ground.
- **No 2 px rules.** When a stronger separator is needed, use `1px solid Color.ink`.
- **Radius:** `0` everywhere by default. `8 px` on the desktop window frame only. `16 px` on
  the rounded scrim corners of mobile bottom sheets.

---

## 3. Atoms

### 3.1 `Eyebrow`

Tiny mono micro-label. Sits above every titled block.

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | node | — | The label text. Almost always uppercase. |
| `size` | number | `10` | Font size in px. Common values: 9, 10. |
| `tone` | `"ink2" \| "ink3" \| "ink4"` | `"ink3"` | Colour token (ink only — status is never tinted into a label). |
| `asChild` | boolean | `false` | Render through Radix `Slot` so the style lands on the child element (e.g. a `<th>`/`<td>`). |

**Usage rules**

- Always uppercase, letter-spaced 1.0–1.2.
- Pair with a serif title — never with another mono line.
- Length: short.

> **In this repo:** `src/components/ui/Eyebrow.tsx`.

---

### 3.2 `Glyph` (source: `final.jsx · Glyph`)

Borderless icon in a 28 px hit-zone.

| State | Colour | Weight |
|---|---|---|
| **REST** | `Color.ink3` | 400 |
| **ON** | `Color.ink` | 600 |
| **ITALIC** | as above but family = serif italic; used for the `?` help glyph. |

| Prop | Type | Default |
|---|---|---|
| `children` | node | — |
| `on` | boolean | `false` |
| `size` | number | `28` |
| `title` | string | — |
| `italic` | boolean | `false` |

> **In this repo:** `src/components/ui/Glyph.tsx`. Icons come from
> [`@/components/libs/icons`](../src/components/libs/icons.ts) (lucide-react re-exports).

---

### 3.3 `PillToggle` (source: `final.jsx · Toggle`)

The familiar 28×16 pill switch. Rail is hairline at rest, ink at on. The `md` size
(44×24) is for a touch row — a full-height mobile control where the compact `sm`
default would be an undersized tap target.

| Prop | Type | Default |
|---|---|---|
| `on` | boolean | `false` |
| `size` | `'sm' \| 'md'` | `'sm'` |

> **In this repo:** `src/components/ui/PillToggle.tsx`.

---

### 3.4 `ChipGroup` (source: `final.jsx · Chips`)

A row of small hairline-bordered options. Active fills ink.

**Variants used in product**

- 2 options: Light · Dark theme.
- 3 options: S · M · L reading width; Write · Focus · Read mode.

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `string[]` | — | Labels. |
| `active` | number | `0` | Index of the active option. |

Also supports a **value-based** mode (`options: { label: string; value: number }[]` + `value`
+ `onChange(value)`) for non-positional choices such as the sync-interval picker.

> **In this repo:** `src/components/ui/Chip.tsx` + `src/components/ui/ChipGroup.tsx`.

---

### 3.5 `Rule`

Horizontal or vertical hairline.

| Prop | Type | Default | Description |
|---|---|---|---|
| `v` | boolean | `false` | If true, vertical (1 px wide, stretches via `alignSelf: stretch`). |
| `light` | boolean | `false` | If true, uses `Color.ruleS` instead of `Color.rule`. |

> **In this repo:** `src/components/ui/separator.tsx` (Radix Separator wrapper).

---

### 3.6 `EmptyState`

Dashed, centered placeholder card for when a list or feature has nothing to show (no history
yet, an unsupported browser). Distinct from the full-pane "empty" idiom (`TypographyP
variant="empty"`) — this is the small inline card used in Settings.

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Optional eyebrow-style heading (via `TypographyLabel`). |
| `caption` | string | — | Body caption (via `TypographyP variant="caption"`). |

> **In this repo:** `src/components/ui/EmptyState.tsx`.

---

### 3.7 Media / attachments

The first media surface in the writer is **picture attachments on brain-dump notes**. Two
primitives back it; both follow the hairline grammar (square corners, 1-px `rule` frame, no
shadow) and compose with existing atoms rather than introducing new button shapes.

#### `ImageThumb`

Square image tile rendered from a `Blob`. Frames the image with a hairline `rule` on a
`paper-2` ground and clips with `object-cover`. The optional remove control is a borderless
`IconButton` (`X` glyph) revealed on hover — never a stroked button.

| Prop | Type | Default | Description |
|---|---|---|---|
| `blob` | `Blob` | — | Image data; an object URL is created and revoked via `useObjectUrl`. |
| `name` | string | — | Alt text / accessible name. |
| `size` | `"sm" \| "md"` | `"md"` | `sm` ≈ 48 px (card strip), `md` ≈ 80 px (drawer grid). |
| `onRemove` | `() => void` | — | When set, shows the hover-revealed remove control. |

> **In this repo:** `src/components/ui/ImageThumb.tsx`.

#### `FileInputTrigger`

Logic-only (renderless) primitive that owns a visually hidden `<input type="file">` and hands
its child an `open()` callback. **Compose it with an existing DS `Button`/`IconButton`** — do
not style a bespoke upload control. This keeps every file picker consistent with every other
action (the labelled drawer button uses `Button kind="secondary"`; the card's quick-add uses
the hover-revealed `IconButton`).

| Prop | Type | Default | Description |
|---|---|---|---|
| `accept` | string | — | `accept` attribute (e.g. the image MIME list). |
| `capture` | `'user' \| 'environment'` | — | Optional camera-facing hint for direct capture on supported mobile browsers. |
| `multiple` | boolean | `false` | Allow selecting more than one file. |
| `disabled` | boolean | `false` | Disables the input; `open()` becomes a no-op (use at limits). |
| `onPick` | `(files: File[]) => void` | — | Called with chosen files; the input resets after. |
| `children` | `(open) => ReactNode` | — | Render prop wiring `open()` to a DS button. |

> **In this repo:** `src/components/ui/FileInputTrigger.tsx`. Rejected files (wrong type, over
> size) surface through the existing `InlineBanner kind="warning"` — the status palette is the
> only colour exception, per §1.2.

---

### 3.8 `MenuItem`

A single row inside a menu (a `DropdownMenu`, or a `Popover` acting as an action list). A
menu is a **list, not a card**: the row has no background at rest; hover and keyboard
highlight paint the faint `paper-2` wash and darken the label from `ink-2` to `ink` (and the
leading glyph from `ink-3` to `ink`). Square corners, sans 13 px label, an optional 14-px
leading glyph slot, and an optional trailing slot — a mono `Kbd` shortcut, or a `Check` when
`checked`. A `checked` row exposes `data-checked` for callers that style or query row state.
Set `checkPosition="leading"` for a menu of peers where each row can be ticked (a guided-tour
replay list): the tick moves to a reserved leading gutter so ticked and unticked rows align,
and the trailing shortcut stays visible. The destructive row shows the `X` icon (never Unicode, never a coloured row) and is
placed under a `MenuDivider` by the caller; the ink-fill `dangerous` Button stays reserved for
the `ConfirmDialog` footer alone (§4.5, §5a).

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `ReactNode` | — | Row label (omitted in `asChild` mode). |
| `icon` | `LucideIcon` | — | Leading glyph; ignored when `danger` is set. |
| `shortcut` | `ReactNode` | — | Trailing hint (compose a `Kbd`); hidden when `checked` under the default trailing tick. |
| `danger` | boolean | `false` | Destructive row: shows the `X` icon. |
| `checked` | boolean | `false` | Shows a `Check` and reflects on the row as `data-checked`. |
| `checkPosition` | `'leading' \| 'trailing'` | `'trailing'` | `trailing` swaps the shortcut for a tick (on/off idiom); `leading` reserves a fixed leading gutter so rows align ticked or not and keeps the shortcut visible (e.g. a replayed tour list). |
| `disabled` | boolean | `false` | Non-interactive; sets `aria-disabled`. |
| `asChild` | boolean | `false` | Render the row as the provided child (e.g. a router `Link`). |

Renders a `<button>` by default. Compose it via the parent's `asChild` to inherit menu
semantics — `<DropdownMenuItem asChild>` gives it `role="menuitem"` and arrow-key navigation,
`<PopoverClose asChild>` makes it dismiss the panel — so every menu shares one row grammar
instead of hand-rolling its own.

> **In this repo:** `src/components/ui/MenuItem.tsx` (+ `MenuItem.recipe.ts`).

---

### 3.8a Submenu (nested menu)

A menu row that opens a second panel of rows to its side — for a branching choice too long
or too dynamic to sit inline (e.g. "Move to section" over the space's sections). Compose
`DropdownMenuSub` (state) + `DropdownMenuSubTrigger` (the row; inherits the `MenuItem`
grammar and carries a trailing `ChevronRight`) + `DropdownMenuSubContent` (the nested panel;
same hairline `paper` panel grammar as `DropdownMenuContent`). The submenu shares the parent
menu's roving focus, `Escape`, and click-outside behaviour, so it is keyboard-operable by
default.

- Reach for a submenu when the branch is a **list of peer targets** (sections, projects,
  labels); keep flat inline rows for a handful of fixed actions.
- When that list is long enough to need filtering, put a **`SearchableMenuList` (§3.8b)** inside
  the `DropdownMenuSubContent` rather than a bare stack of rows.

> **In this repo:** `src/components/ui/dropdown-menu.tsx` re-exports `DropdownMenuSub` /
> `DropdownMenuSubTrigger` / `DropdownMenuSubContent` (Radix `DropdownMenu.Sub*`, styled in
> `dropdown-menu.components.tsx`).

---

### 3.8b `SearchableMenuList`

A search field over a filterable, single-select list of rows — the "type to narrow, then
pick" pattern for when a menu's choices are too many to scan (move a document to one of many
sections; assign a label). Composes the `SearchField` (§4.7) over a `listbox` of rows that
reuse the `MenuItem` row grammar (hover/active `paper-2` wash, a trailing `Check` on the
current value). Host-agnostic: drop it inside a `DropdownMenuSubContent` (§3.8a), a `Popover`,
or render it standalone.

- **One combobox, not a menu of menu-items.** Keyboard focus stays in the search input;
  Arrow keys move a highlight through the rows via `aria-activedescendant` and Enter commits
  the active row. This is what lets the input coexist with a parent Radix menu — the list is
  not a second roving menu, and the component stops the parent menu's typeahead from stealing
  the user's keystrokes. Escape/Tab still bubble so the surrounding menu closes normally.
- Pass `selectedId` for the ticked current value, `emptyLabel` for the no-match message, and a
  `label` that names both the input and the listbox for assistive tech.

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `readonly { id, label }[]` | — | The choices. |
| `selectedId` | `string \| null` | — | The current value; shown with a persistent tick. |
| `onSelect` | `(id) => void` | — | Fired on click or Enter. The host owns closing the menu. |
| `label` | `string` | — | Accessible name for the search input and the listbox. |
| `placeholder` | `string` | — | Search-field placeholder. |
| `emptyLabel` | `string` | — | Shown when the filter matches nothing. |
| `autoFocus` | boolean | `true` | Focus the search input on mount. |

> **In this repo:** `src/components/ui/SearchableMenuList/` (`SearchableMenuList.tsx` +
> `SearchableMenuOptions.tsx` / `SearchableMenuOption.tsx` rows + `useSearchableMenu.ts`).

---

### 3.9 `Kbd`

A keyboard-shortcut hint in the mono meta voice (10 px, `ink-4`, letter-spaced). The
modifier is **derived from the running platform at render** — ⌘ on macOS, Ctrl on
Linux/Windows — so each user sees the key they actually press. Write chords
platform-neutrally and never hard-code a glyph: `mod` resolves to the platform modifier,
alongside `shift` / `alt` / `enter`, joined with `+` (e.g. `mod+,`, `mod+shift+m`, or a bare
`?`). On Apple the glyphs sit adjacent (`⌘⇧M`); elsewhere the words join with `+`
(`Ctrl+Shift+M`). Locale strings hold only the bare key — the modifier is never translated
or stored.

| Prop | Type | Default | Description |
|---|---|---|---|
| `keys` | string | — | A platform-neutral chord (`mod`/`shift`/`alt`/`enter` + keys, `+`-joined). |

Renders a semantic `<kbd>`. The handler side stays on `event.metaKey || event.ctrlKey`
(§11); `Kbd` is its display companion.

> **In this repo:** `src/components/ui/Kbd.tsx`, backed by
> `src/lib/shortcuts/platform.ts` (`isApplePlatform` / `getModifierLabel`, injectable for
> tests).

---

### 3.10 `SectionLabel`

The one uppercase-mono heading for a group of rows — the "APPEARANCE" / "WRITING" labels in
Quick Settings, the group eyebrows inside menus, the settings-nav group headings. It is a
named specialisation of `Eyebrow` (§3.1) that shares the same recipe
(`Eyebrow.recipe.ts`), narrowed to the group-label sizes and tones — so every section label
reads identically instead of being hand-rolled per surface. `DropdownMenuLabel` is rebased
onto the same recipe.

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `9 \| 10` | `10` | `9` for the tightest group eyebrow, `10` for a standard section label. |
| `tone` | `"ink3" \| "ink4"` | `"ink3"` | Label colour. |
| `asChild` | boolean | `false` | Render as the provided element (e.g. an `<h2>` for a labelled landmark). |

> **In this repo:** `src/components/ui/SectionLabel.tsx` (over `Eyebrow` /
> `Eyebrow.recipe.ts`).

---

## 4. Forms

Every form primitive follows the same rule set: hairline borders, ink fill on active focus,
mono micro-labels, italic-serif hints, square corners.

### 4.1 `TextField`

Single-line input. No box — just a hairline along the baseline. Focus state darkens the rule
from `Color.rule` to `Color.ink`; no thickening, no glow.

**States**: rest (empty) · rest (filled) · focus · disabled · error.

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | string | `""` | Default value. |
| `placeholder` | string | `""` | Placeholder text. |
| `disabled` | boolean | `false` | Off-tint background, `Color.ink4` text. |
| `error` | boolean | `false` | Baseline darkens. Pair with `FieldError`. |

> **In this repo:** `src/components/ui/TextField.tsx` (and the lower-level
> `src/components/ui/input.tsx`).

---

### 4.2 `TextArea`

Multi-line input with a hairline frame on all four sides — reads like a small writing surface.
Serif body, line-height 1.55. `resize: vertical`.

**States**: rest · focus · disabled.

| Prop | Type | Default |
|---|---|---|
| `rows` | number | `4` |
| `value` | string | `""` |
| `placeholder` | string | `""` |
| `disabled` | boolean | `false` |

> **In this repo:** `src/components/ui/TextArea.tsx`.

---

### 4.3 `SearchField`

Hairline-baseline input with a leading `⌕` glyph and a trailing `×` clear button when there's a
value.

| Prop | Type | Default |
|---|---|---|
| `value` | string | `""` |
| `placeholder` | string | `"title, writer, or call number…"` |

> **In this repo:** `src/components/ui/SearchField.tsx`.

---

### 4.4 `Select`

Same hairline as `TextField` with a trailing `▾`. Use when `ChipGroup` has too many options to
fit one line.

| Prop | Type | Default |
|---|---|---|
| `options` | `string[]` | `[]` |
| `value` | string | `options[0]` |

> **In this repo:** `src/components/ui/Select.tsx`.

---

### 4.5 `Button`

Four styled kinds, plus a `bare` escape hatch. Square corners always.

| Kind | Look | Use for |
|---|---|---|
| `primary` | Ink fill, white text. | The most important call to action on the surface. Never more than one per surface. |
| `secondary` | Hairline outline, ink text, transparent ground. | Secondary CTA next to a primary (e.g. *cancel* next to *save*). |
| `ghost` | Geist 500, ink, single 1-px underline. | Most actions: *continue reading →*, *peek inside*. |
| `dangerous` | Same as primary — context, not colour, signals risk. | Delete / archive / destructive verbs. |
| `bare` | No surface of its own — the button reset only (focus ring, disabled handling). | Bespoke inline text triggers that own their type and layout via `className` — an editable title, an eyebrow section label, an eyebrow *Add section* affordance. Never a raw `<button>`. Pair with `size="none"`. |

**Sizes**: `sm` (12 px text, 6×12 padding), `md` default (13 px text, 9×16), `lg` (14 px text,
12×22), `none` (no box — the caller sizes it, used with `bare`).

| Prop | Type | Default |
|---|---|---|
| `kind` | `"primary" \| "secondary" \| "ghost" \| "dangerous" \| "bare"` | `"primary"` |
| `size` | `"sm" \| "md" \| "lg" \| "none"` | `"md"` |
| `disabled` | boolean | `false` |

> **In this repo:** `src/components/ui/Button.tsx` — implemented with `cva`
> (`buttonRecipe`) over the exact `kind` × `size` matrix above, `rounded-none`, token-backed
> classes (`bg-ink text-paper`, `border-ink`, …). Supports `asChild` (Radix `Slot`).

---

### 4.6 `Checkbox`

A 14×14 hairline square. On state fills ink with a small inset `✓`. Always pair with a sans-13
label to its right (no orphan checkboxes).

| Prop | Type | Default | Description |
|---|---|---|---|
| `on` | boolean | `false` |  |
| `label` | string | — | Sans-13 label, ink2. |
| `disabled` | boolean | `false` | 50% opacity, not-allowed cursor. |

> **In this repo:** `src/components/ui/Checkbox.tsx`.

---

### 4.7 `RadioRow`

Two-or-three mutually-exclusive choices with a name. Hairline-circle dots, ink fill when
active.

> When the options have no name (e.g. text-size S/M/L), reach for `ChipGroup` instead.
> `RadioRow` is for named pickers like *Light / Dark / Match system*.

| Prop | Type | Default |
|---|---|---|
| `options` | `string[]` | `[]` |
| `active` | number | `0` |

> **In this repo:** `src/components/ui/RadioRow.tsx`.

---

### 4.8 `FormRow`

The standard label-on-left, control-on-right layout used in every Settings panel.

**Composition**: 200-px label column (Geist 13/500) + optional italic-serif hint + flex control
column + optional mono error below the control. Bottom hairline divider (`Color.ruleS`).

| Prop | Type | Description |
|---|---|---|
| `label` | string | Sans 13/500 label. |
| `hint` | string | Italic-serif 12, ink3. Sits under the label. |
| `error` | string | Mono 10, ink. Sits under the control. Prefix `✕` is added. |
| `children` | node | The control (TextField / Select / RadioRow / Checkbox / etc). |

> **In this repo:** `src/components/ui/FormRow.tsx`.

---

### 4.9 `Fieldset`

A grouping wrapper inside a multi-section form (Settings · Onboarding). Mono eyebrow on top with
a 1-px-ink underline; rows inside.

| Prop | Type | Description |
|---|---|---|
| `label` | string | Eyebrow text, e.g. `"Account · 03"`. |

> **In this repo:** `src/components/ui/Fieldset.tsx`.

---

### 4.10 `DateField`

A date picker for deadlines, composed from `TextField` (same hairline baseline, disabled and error
styling). Speaks epoch milliseconds at its boundary while the native control shows a local
`yyyy-mm-dd`.

| Prop | Type | Description |
|---|---|---|
| `value` | `number` (epoch ms) | The selected date; `undefined` when empty. |
| `onChange` | `(value?: number) => void` | Fired with epoch ms, or `undefined` when cleared. |
| `min` / `max` | `number` (epoch ms) | Optional selectable bounds. |
| `error` | boolean | Hairline error tone. |

> **In this repo:** `src/components/ui/DateField.tsx`.

---

## 5. Status & feedback

The one place the system breaks its grayscale rule. Four roles — **error · warning · success ·
info** — live alongside the ink scale and surface only here: in toasts, banners, field errors,
badges, and inline glyphs. Never in branding, layout, or hierarchy.

### 5.1 Palette

The canonical spec defines three steps per role: **tint** (soft background), **base**
(saturated colour for icons, accent borders, bold text on tinted ground), **deep** (darker text
colour for legibility on tint, and hover/active states).

| Role | Tint | Base | Deep | Used for |
|---|---|---|---|---|
| **Error** | `#FBEBE7` | `#E8341A` (chili) | `#A11808` | Field errors, danger toasts, destructive confirms. |
| **Warning** | `#FAEFD4` | `#F4B41A` (saffron) | `#9A7005` | About-to-overwrite notices, quota nudges, "unsaved changes". |
| **Success** | `#E8EFE6` | `#A7B92E` (chartreuse) | `#677515` | "Saved", "Sent", finished imports. |
| **Info** | `#E7ECF4` | `#1F86D6` (electric blue) | `#14568F` | Tips, "what's new", neutral notices; alpha build status badge and banner. |

**Glyph pairing** (used inside components, never standalone):

| Role | Glyph |
|---|---|
| Error | `✕` |
| Warning | `⚠` |
| Success | `✓` |
| Info | `ⓘ` |

**Rules**

- Status colours don't appear outside the feedback components. They never colour titles,
  dividers, navigation, or backgrounds.
- The same role is used for the matching verb everywhere: *success* for "saved", *warning* for
  "unsaved", *error* for "failed", *info* for "noticed". Avoid mixing roles for ambiguous
  states.
- When in doubt, fall back to **info**. It's the only role that doesn't carry urgency.

### 5.2 Implementation status in this repo

This repo currently ships a **pragmatic two-token form** of each role rather than the full
tint/base/deep triad. Tokens are defined in [`src/index.css`](../src/index.css) across all four
themes and mapped in [`tailwind.config.ts`](../tailwind.config.ts):

| Role | Foreground token | Background token | Tailwind classes |
|---|---|---|---|
| Error / danger | `--danger` | `--danger-bg` | `text-danger`, `bg-danger-bg` |
| Warning | `--warning` | `--warning-bg` | `text-warning`, `bg-warning-bg` |
| Success | `--success` | `--success-bg` | `text-success`, `bg-success-bg` |
| Info | `--info` | `--info-bg` | `text-info`, `bg-info-bg` |

**Implemented feedback components** (`src/components/ui/`, built on the two-token form):

| Component | Use |
|---|---|
| `StatusGlyph` | Inline icon + label for status that reads as text (e.g. a failed-sync `role="alert"` line). |
| `StatusBadge` | Tinted pill for state attached to a table row (e.g. a sync history row: success / error). |
| `InlineBanner` | Full-width strip with a coloured left rail for a persistent notice (e.g. the sync reconnect prompt). |
| `NoticeDock` | Fixed bottom-left host for a notice that must be visible from any screen without interrupting one (e.g. a peer link that dropped while writing). Holds a feedback component — typically `InlineBanner` — rather than styling anything itself. |

> **Where an app-wide notice goes.** `NoticeDock` is the only place for status that
> outlives its screen. **Out of the flow** (an in-flow element would move the writing
> surface as it appeared) and **bottom-left**, clear of the reading column and of the
> bottom-right actions. The wrapper is `pointer-events-none` with an interactive child, so
> it never swallows a press meant for the page beneath. It takes no focus and traps none;
> what it holds announces itself politely (`role="status"`) or not at all. Anything that
> must interrupt is a dialog, not a dock.

> **Semantic use: diff highlighting.** The version-history diff viewer
> (`VersionHistoryModal`) reuses the success/danger two-token form to mark
> **added** text (`bg-success-bg text-success`) and **removed** text
> (`bg-danger-bg text-danger` + `line-through`). This is a deliberate semantic
> extension of the status palette — added/removed reads the same way "saved" and
> "error" do — and stays within the grayscale-plus-status rule. Any future diff or
> change-tracking surface must reuse these tokens, never hard-coded greens/reds.

> **Icons, not glyphs.** The §5.1 glyph column is realised with lucide icon components from
> `@/components/libs/icons` (`success → Check`, `error → X`, `warning → AlertTriangle`,
> `info → Info`) rendered via the `Icon` wrapper — never Unicode characters.

> **Gap → DS update.** `success` and `info` were added at the token level to close the
> four-role gap; `StatusGlyph`/`StatusBadge`/`InlineBanner` are now implemented (above). The
> spec's full three-step (tint/base/deep) model and the remaining components (`FieldError`,
> `Toast`) are a **future extension**: build them — and extend these tokens to the triad —
> when richer status UI is needed, rather than hard-coding one-off status colours at the call
> site.

---

## 5a. Overlays (dialogs, confirms, popovers)

Transient surfaces that float above the page. All share the hairline grammar: square
corners (no radius), a 1 px `rule` border, `paper` ground, and a dimmed scrim. They are
**modal Radix primitives** — never the browser's native `window.alert` / `confirm` /
`prompt`, which ignore the tokens and type families.

| Primitive | Source | Use it for |
|---|---|---|
| **Dialog** | `src/components/ui/dialog.tsx` | A centred modal task (compose `DialogContent` + `DialogHeader`/`DialogTitle`/`DialogDescription`). Default `max-w-lg`; override the `className` width as needed (e.g. `HelpPalette`, `VersionHistoryModal`). |
| **ConfirmDialog** | `src/components/ui/ConfirmDialog.tsx` | A yes/no confirm for an irreversible or destructive action. Two `Button`s: `secondary` cancel + a confirm whose `confirmKind` is `dangerous` for destructive verbs. Autofocuses confirm; wires `aria-describedby`. |
| **Popover** | `src/components/ui/popover.tsx` | A small panel anchored to a trigger (Quick Settings, Space menu). Not modal. |
| **Bottom sheet** | `src/components/chrome/MobileMore/MobileMoreSheet.tsx` | The mobile-only slide-up menu. The one place radius is allowed (16 px scrim corners, per §1/§2.3). |

**Rules**
- **Never** use `window.alert` / `window.confirm` / `window.prompt`. For a confirm, use
  `ConfirmDialog`; for text entry, compose a `Dialog` with the `TextField` primitive (see
  `SaveVersionDialog`).
- A dialog always has a `DialogTitle`; pair a destructive confirm with a `description` so the
  consequence is stated. Keep the confirm button's verb specific ("Restore", "Delete"), not
  "OK".
- Buttons live bottom-right, cancel before confirm, built from the `Button` primitive (§4).
- **Scrim + shadow are token-driven, and the scrim never blurs.** Overlays veil the page with
  the `scrim` tokens — `bg-scrim` for the bottom sheet, the lighter `bg-scrim-drawer` for the
  side drawers (mobile nav, mobile inspector) — and cast a direction-matched shadow: the sheet
  uses `shadow-overlay-sheet` (upward), the right-anchored inspector uses `shadow-overlay-drawer`
  (leftward), and the left-anchored nav drawer uses `shadow-overlay-drawer-start` (rightward, the
  mirror added so a left drawer's shadow falls onto the page, not off-screen). Never hard-code a
  `bg-black/NN` scrim, a `shadow-lg/xl`, or a `backdrop-blur` on these surfaces.
- Side drawers and the bottom sheet pad for the device safe-area insets
  (`env(safe-area-inset-*)`) so content clears notches and home indicators.

> **Gap → DS update.** `ConfirmDialog` was added to close the "destructive confirm" gap that
> previously fell back to `window.confirm`. The native `Toast` notification remains a future
> extension (§5); until it lands, surface action results as inline status text, not a popup.

---

## 6. Navigation (writer surface)

### 6.1 `WorldRail` (source: `final.jsx · FRail`)

56-px world strip on the far left of the writer app. Home at the top, spaces below, `+` to add,
`⋮` at the bottom (Quick Settings).

| State | Behaviour |
|---|---|
| **REST** | All glyphs borderless. |
| **QUICK SETTINGS OPEN** | `⋮` flips to ink fill; popover renders to the right. |

| Prop | Type | Default |
|---|---|---|
| `open` | boolean | `false` |

> **In this repo:** `src/components/chrome/SpaceRail.tsx` (+ `FocusRail.tsx` for the compact
> Focus-mode form).

---

### 6.2 `WriterSidebar` (source: `final.jsx · FSidebar`)

224-px column inside a writer space.

| State | Behaviour |
|---|---|
| **REST** | Title only; ⚙ hidden. |
| **HOVER** | Title gets white ground; borderless ⚙ fades in; right-side tooltip "SPACE SETTINGS". |
| **OPEN** | ⚙ inverts to ink fill; popover below the title row with rename/settings/backups/etc. |

| Prop | Type | Default |
|---|---|---|
| `state` | `"rest" \| "hover" \| "open"` | `"rest"` |
| `menuOpen` | boolean | `false` |

> **In this repo:** `src/components/chrome/Sidebar.tsx`.

---

### 6.3 `WriterTopbar` (source: `final.jsx · FTopbar`)

Breadcrumb on the left, then the borderless cluster on the right: mode-tabs (ModeToggle) · ⌕
search · `cite` · ⤢ focus · ⋯ inspector.

| State | Behaviour |
|---|---|
| **DEFAULT** | Write mode active. |
| **FOCUS ON** | The ⤢ glyph inverts. |
| **INSPECTOR OPEN** | The ⋯ glyph inverts. |

| Prop | Type | Default |
|---|---|---|
| `mode` | `"write" \| "split" \| "dump"` | `"write"` |
| `focus` | boolean | `false` |
| `inspectorOpen` | boolean | `false` |

> **In this repo:** `src/components/chrome/Topbar.tsx`.

---

### 6.4 `ModeToggle`

The text-based mode switcher. Three modes; active is underlined.

| Prop | Type | Default |
|---|---|---|
| `value` | `"write" \| "split" \| "dump"` | `"write"` |
| `focus` | boolean | `false` |

> **In this repo:** `src/components/chrome/ModeToggle.tsx`.

---

### 6.5 `DocInspector` (source: `final.jsx · FInspector` + `FInspectorIcons`)

The right-hand drawer opened from `⋯`. Two forms.

| Form | Width | Use |
|---|---|---|
| **Collapsed icon rail** (`FInspectorIcons`) | 44 px | Quick access; one tab visible. |
| **Expanded** (`FInspector`) | 280 px | Full content. |

**Tabs** (in expanded form): `outline` · `info` · `history` · `actions`.

| Prop | Type | Default |
|---|---|---|
| `section` | `"outline" \| "info" \| "history" \| "actions"` | `"outline"` |

> **In this repo:** `src/components/chrome/DocInspector.tsx` +
> `src/components/chrome/DocInspectorIcons.tsx`.

---

### 6.6 `WriterMobileTopbar` (source: `MobileTopbar`)

Mobile chrome for the writer. Compact, 60-px tall.

**Composition**: ☰ hamburger · world tag + doc name (truncated) · `?` help · `⋯` overflow.

**Variants**: rest · menuOpen (⋯ pressed; popover anchored top-right).

| Prop | Type | Default |
|---|---|---|
| `docName` | string | `"The bell-keeper"` |
| `menuOpen` | boolean | `false` |

> **In this repo:** `src/components/chrome/MobileNavDrawer.tsx` + `MobileMore/MobileMoreSheet.tsx`.

---

### 6.7 `WriterMobileTabs` (source: `MobileTabs`)

Bottom tab strip on writer mobile.

**Tabs**: `write` · `brain` · `cite` · `more`.

| Prop | Type | Default |
|---|---|---|
| `active` | string | `"write"` |

> **In this repo:** `src/components/chrome/MobileTabs.tsx`.

---

## 7. Writer chrome

### 7.1 `WriteSurface`

The central writing canvas.

| Prop | Type | Default | Description |
|---|---|---|---|
| `compact` | boolean | `false` | Tighter (480 px max, smaller padding). |
| `focus` | boolean | `false` | Focus mode (620 px max, larger top padding, no breadcrumb). |
| `breadcrumb` | string | — | Optional breadcrumb above the title. |

> **In this repo:** `src/components/surfaces/WriteSurface.tsx`.

---

### 7.2 `BrainSpace` (source: `DumpCanvas`)

The dotted canvas for freeform thoughts/characters/places/lore.

**Note kinds** (vary by template): `note` · `char` · `place` · `lore` · `question` · `source` ·
`claim` · `figure` · `todo` · `loose-end` · `blank`.

| State | Visual |
|---|---|
| **seed-prompt** | Italic ghost text, ink4. |
| **user** | Solid ink/ink2. |

| Prop | Type | Default |
|---|---|---|
| `compact` | boolean | `false` |
| `withSelection` | boolean | `false` |

> **In this repo:** `src/components/surfaces/BrainSpaceCanvas.tsx` (+ `BrainSpaceNote.tsx`,
> `BrainSpaceConnection.tsx`, `BrainSpaceDetailDrawer.tsx`).

---

### 7.3 Annotation system

A single paragraph can render in five annotation modes, controlled by an `anno` prop that
propagates through `HL`, `CmtMark`, and `SideCmt`.

| Mode | Highlights | Inline marks | Margin comments |
|---|---|---|---|
| `off` | — | — | — |
| `highlights` | yes | — | — |
| `inline` | yes | yes | — |
| `side` | yes | — | yes |
| `both` | yes | yes | yes |

**`HL`** — wraps inline text; renders a highlight ground when active. **`CmtMark`** —
superscript reference number inside the prose; visible only in `inline` and `both`. **`SideCmt`**
— positioned card in the right margin; visible in `side` and `both`. **`AnnotationPanel`** —
popover for changing the mode at runtime. **`FormatPopover`** — appears on right-click on a
highlight; lets the user change the highlight colour.

---

### 7.4 Highlight colours (`HL_COLORS`)

Named tonal palette, not semantic. The names are mood-y on purpose so readers attach their own
meaning.

| Name | Hex |
|---|---|
| `yellow` | `#fff3c2` |
| `peach` | `#ffd9c2` |
| `sage` | `#d8e6d4` |
| `ash` | `#e5e5e5` |
| `slate` | `#cdd6e0` |
| `rose` | `#f3d4dd` |

> **In this repo:** the shipped highlight palette lives in [`src/index.css`](../src/index.css)
> as `--hl-yellow`, `--hl-pink`, `--hl-blue`, `--hl-green`, `--hl-ash` (mapped to `hl-*`
> Tailwind colours). High-contrast themes override these for accessibility.

---

### 7.5 Settings primitives

The full-screen Settings view is built from three primitives.

**`SettingsTabs`** — left rail listing setting groups (Editor · Account · Typography · Theme ·
Shortcuts · Backups). **`SettingRow`** — two-column row (label + control); `hint` renders as
small italic-serif under the label. **`Chip`** (settings) — small inline chip, used inside
SettingRows for choice fields.

| Prop | Type | Default |
|---|---|---|
| `active` | boolean | `false` |

> Don't confuse `Chip` (settings) with the chips described in §3.4: `Chip` carries a soft
> border at rest and inverts on `active`.
>
> **In this repo:** `src/components/settings/SettingsTabs.tsx`, `SettingRow.tsx`, and the
> `Chip` / `ChipGroup` primitives under `src/components/ui/`.

---

### 7.6 Presence hues (`--presence-1 … --presence-5`)

A small muted palette reserved exclusively for **collaboration presence** — remote carets,
selections, and name flags. Not semantic, and never used for hierarchy, branding, or status.

| Token | Light hue |
|---|---|
| `--presence-1` | terracotta |
| `--presence-2` | slate blue |
| `--presence-3` | moss |
| `--presence-4` | plum |
| `--presence-5` | ochre |

- **Assignment.** Each participant is given one hue (their `presenceHue` in their local identity
  profile); it labels their caret, selection tint, and name flag.
- **Contrast.** Presence marks are non-text graphical objects. Each hue follows the same
  per-theme floor as the status palette against `--paper` — **≥ 3:1** in light/dark (WCAG SC
  1.4.11) and **≥ 7:1** in the high-contrast themes — with values running deeper or lighter to
  suit the ground. Enforced by `src/theme/contrast.test.ts`.
- **Motion.** Caret and name-flag transitions are gated by `data-motion` /
  `prefers-reduced-motion`.

> **In this repo:** defined in [`src/index.css`](../src/index.css) as `--presence-1 …
> --presence-5` across `:root`, `[data-theme='dark']`, and both `hc-*` blocks, mapped to the
> `presence-1 … presence-5` Tailwind colours in `tailwind.config.ts`.

---

## 8. Patterns

Composed examples — not components on their own.

### 8.1 `WriteShell` (source: `final.jsx · FShell`)

The full writer shell — `WorldRail` + `WriterSidebar` + `WriterTopbar` + `WriteSurface`. Every
writing screen sits inside this.

---

## 9. File map (source prototypes)

| Source file | Owns |
|---|---|
| `lorem-bw-v2.jsx` | `Color` tokens (`BW`), `Type` tokens (`SERIF/SANS/MONO`), `Win` window frame, `WorldRail` (v2 form), `ModeToggle`, `WriteSurface`, `DumpCanvas`, the annotation system (`HL`, `CmtMark`, `SideCmt`, `AnnoPanel`, `FormatPopover`, `HL_COLORS`), settings primitives (`SettingsTabs`, `SettingRow`, `Chip`). |
| `lorem-bw-v2-mobile.jsx` | `Phone` chassis (writer), `MobileTopbar`, `MobileTabs`. |
| `final.jsx` | The canonical writer chrome — `FRail`, `FSidebar`, `FTopbar`, `FInspector`, `FInspectorIcons`, `FShell`, `QuickSettingsPop`. Local-only: `Glyph`, `Toggle`, `Chips`. |
| `ds-foundations.jsx` · `ds-atoms.jsx` · `ds-forms.jsx` · `ds-status.jsx` · `ds-writer.jsx` | Section bodies for the design-system page. |

---

## 10. Open questions

Things this spec doesn't pin down — open for next iteration:

1. **Dark mode.** The token swap exists (the "invert" Tweak); some imagery filters likely need
   tuning.
2. **Accent colour for serious calls-to-action** — currently all CTAs are either ink-fill
   buttons or hairline-underlined links. Will this hold for things like "Publish"?
3. **Iconography vocabulary.** The glyphs (⌕, ⤢, ⋯, ⋮, ◐, §) work in the current product but
   won't scale. We may need a small custom SVG set once the surface area grows.
4. **Status palette depth.** Whether to expand the repo's two-token status roles (§5.2) into
   the spec's full tint/base/deep triad, and to build the feedback components, when richer
   status UI lands.

---

## 11. Accessibility

Accessibility is a **baseline requirement** of this design system.
[`../ACCESSIBILITY.md`](../ACCESSIBILITY.md) is the canonical conformance statement and records
current gaps. The themes (§2.1) remain the source of truth for visual tokens: `light` and `dark`
have an AA contrast minimum, while `hc-light` and `hc-dark` target AAA enhanced contrast.
Accessibility preferences are orthogonal `data-*` modifiers that compose with those themes.

### 11.1 Preference axes

| Attribute | Values (default first) | Effect |
|---|---|---|
| `data-theme` *(see §2.1)* | `light` · `dark` · `hc-light` · `hc-dark` | Full token set. |
| `data-motion` | `auto` · `reduced` · `full` | `auto` follows the OS `prefers-reduced-motion`; `reduced` forces motion off; `full` restores it. |
| `data-text-scale` | `base` · `sm` · `lg` · `xl` | Scales the reading/writing surface via the `--reading-scale` multiplier. |
| `data-line-spacing` | `normal` · `relaxed` · `loose` | Prose leading via the `--reading-leading-scale` multiplier. |
| `data-link-underline` | `auto` · `always` | `always` underlines links (don't rely on colour alone — WCAG 1.4.1). |
| `data-focus` | `standard` · `enhanced` | `enhanced` thickens the focus ring (`--focus-ring-width`) and paints an extra `--accent` outline. |

> **In this repo:** tokens + override blocks live in [`src/index.css`](../src/index.css); the
> preference state is in `src/store/a11y.ts` (key `lorem-a11y`, separate from `lorem-ui`),
> applied by `src/theme/A11yPreferenceProvider.tsx` via `src/theme/a11y-prefs.ts`. The
> user-facing controls live in the Settings **Accessibility** tab.

### 11.2 Tokens

`--reading-scale` (1), `--reading-leading-scale` (1), `--focus-ring-width` (1px) and
`--motion-duration` (150ms) are defined on `:root` at their **current values** (a scale of 1 is
a no-op) and only changed by the override blocks above. Consume the scale multipliers with
token-backed arbitrary classes (e.g.
`text-[length:calc(17px*var(--reading-scale))] leading-[calc(1.6*var(--reading-leading-scale))]`)
— never hard-code a size, leading, focus width, or transition duration that a preference should
govern.

### 11.3 Contrast policy

- **`light` / `dark`: WCAG 2.2 AA minimum.** For text covered by SC 1.4.3, require ≥4.5:1 for
  normal text and ≥3:1 for large text, subject to the criterion's exceptions. For non-text UI
  covered by SC 1.4.11, require ≥3:1 where applicable.
- **`light` / `dark`:** core text already exceeds the AA target (≈26:1). The
  `light` status palette has known gaps: `--danger` (~3.2:1 on its tint) and
  `--success`-on-tint fall below even the 4.5:1 small-text AA threshold. Treat these as gaps to
  close, not intentional exceptions to preserve.
- **`hc-light` / `hc-dark`: WCAG 2.2 AAA enhanced contrast.** For text covered by SC 1.4.6,
  require ≥7:1 for normal text and ≥4.5:1 for large text, subject to the criterion's exceptions.
  These themes retain the stronger status and highlight overrides.
- `src/theme/contrast.test.ts` currently asserts ≥7:1 in `hc-*` and a ≥3:1 floor elsewhere.
  That default-theme threshold is a **regression floor, not the AA target**; strengthen it as
  the known token gaps are fixed.

### 11.4 Motion

`prefers-reduced-motion` and the `data-motion` preference gate animation. CSS transitions and
animations are near-instant under reduced motion (`src/index.css`), and the guided tours
(driver.js) disable smooth-scrolling via `tourMotionReduced()` in
`src/tours/driver-setup.ts` — both honour `reduced`/`full`/OS in the same order.

### 11.5 Primitives & rules

- **`SkipLink`** (`src/components/ui/SkipLink.tsx`) — "skip to content" bypass link, hidden
  until focused. Render first in the app shell, pointing at the main landmark `id`.
- **`VisuallyHidden`** (`src/components/ui/VisuallyHidden.tsx`) — named primitive for
  screen-reader-only text, composed from the Radix VisuallyHidden primitive. Use it instead of
  hand-rolling `sr-only`.
- Every interactive element must be keyboard operable with a visible focus indicator, carry an
  accessible name, and use correct ARIA (labels, roles, `aria-live`, `aria-describedby`,
  landmarks). Animations must respect `data-motion` / `prefers-reduced-motion`.
