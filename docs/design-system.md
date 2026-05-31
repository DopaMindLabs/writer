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

---

## 1. Principles

The design system is built around these rules. Most decisions downstream are derivable from
them.

1. **Hairline grammar, no ornament.** Two rule weights (1 px `#e5e5e5` and 1 px `#f0f0f0`);
   nothing thicker. No shadows except on the desktop window chrome. No gradients. No rounded
   corners except the 8 px on the desktop window itself and 16 px on mobile bottom-sheet tops.
2. **Pure grayscale palette; status is the one exception.** The ink scale is strict
   black-to-white. The single typed exception is the **status palette** (error · warning ·
   success · info), defined in §5 — used only in toasts, banners, field errors, badges, and
   inline glyphs. Never in branding, layout, or hierarchy.
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
  ink fill. Never introduce a brand accent. The status palette (§5) is the single exception,
  and only for feedback.
- **Decorative emoji or stroked icons.** Icons are typographic glyphs (`⌕ ⤢ ⋯ ⋮ ◐ §`) on
  transparent grounds.
- **More than two type sizes per block.** Eyebrow + title + body — that's the upper bound. If
  you need a third size, you're building a new block.
- **Soft tints for status.** Status is text + glyph, not a coloured pill. The single exception
  is the highlight-colour palette inside annotations.

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

The familiar 28×16 pill switch. Rail is hairline at rest, ink at on.

| Prop | Type | Default |
|---|---|---|
| `on` | boolean | `false` |

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
| `multiple` | boolean | `false` | Allow selecting more than one file. |
| `disabled` | boolean | `false` | Disables the input; `open()` becomes a no-op (use at limits). |
| `onPick` | `(files: File[]) => void` | — | Called with chosen files; the input resets after. |
| `children` | `(open) => ReactNode` | — | Render prop wiring `open()` to a DS button. |

> **In this repo:** `src/components/ui/FileInputTrigger.tsx`. Rejected files (wrong type, over
> size) surface through the existing `InlineBanner kind="warning"` — the status palette is the
> only colour exception, per §1.2.

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

Four kinds. Square corners always.

| Kind | Look | Use for |
|---|---|---|
| `primary` | Ink fill, white text. | The most important call to action on the surface. Never more than one per surface. |
| `secondary` | Hairline outline, ink text, transparent ground. | Secondary CTA next to a primary (e.g. *cancel* next to *save*). |
| `ghost` | Geist 500, ink, single 1-px underline. | Most actions: *continue reading →*, *peek inside*. |
| `dangerous` | Same as primary — context, not colour, signals risk. | Delete / archive / destructive verbs. |

**Sizes**: `sm` (12 px text, 6×12 padding), `md` default (13 px text, 9×16), `lg` (14 px text,
12×22).

| Prop | Type | Default |
|---|---|---|
| `kind` | `"primary" \| "secondary" \| "ghost" \| "dangerous"` | `"primary"` |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` |
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
| **Info** | `#E7ECF4` | `#1F86D6` (electric blue) | `#14568F` | Tips, "what's new", neutral notices. |

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

> **In this repo:** `src/components/chrome/MobileNavDrawer.tsx` + `MobileMoreSheet.tsx`.

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
