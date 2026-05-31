# Accessibility

LIpsum Writer treats accessibility as a first-class, **additive** property of the
app: new accessibility behaviour is opt-in and never changes the default
experience for existing users. This document is the conformance statement; the
design-system source of truth is [`docs/design-system.md` §11](./docs/design-system.md),
and the rules every feature must follow live in [`AGENTS.md`](./AGENTS.md).

## Conformance summary

| Area | Target | Status |
|---|---|---|
| Text contrast (`light`/`dark`) | WCAG AA | Core text ≈26:1 (exceeds AAA). |
| Status palette (`light`/`dark`) | WCAG AA | Mostly AA; two known exceptions (below). |
| Text & status contrast (`hc-light`/`hc-dark`) | **WCAG AAA (7:1)** | Met — locked by `src/theme/contrast.test.ts`. |
| Keyboard operability | WCAG 2.1.1 | Skip link + native/Radix focus management. |
| Bypass blocks | WCAG 2.4.1 | "Skip to content" link on every route. |
| Reduced motion | WCAG 2.3.3 | `prefers-reduced-motion` + `data-motion` gating. |
| Name/role/value | WCAG 4.1.2 | Roles, labels, landmarks, `aria-describedby`. |
| Automated audit | axe-core WCAG 2 A/AA | `e2e/a11y-axe.spec.ts` scans key screens. |

This is a **conditional** conformance claim: we target AAA where it is achievable
without compromising the default design (contrast in the high-contrast themes,
focus, keyboard, motion, landmarks, headings), and AA elsewhere. We do not claim
blanket AAA across the entire product.

## Preferences (Settings → Accessibility)

All preferences default to today's behaviour and persist locally
(`localStorage` key `lorem-a11y`, separate from `lorem-ui`). They are applied as
orthogonal `data-*` attributes on `<html>` that compose with the active theme:

| Preference | Default | Effect |
|---|---|---|
| Theme & contrast | system / `light` | `light` · `dark` · `hc-light` · `hc-dark`. |
| Motion | Match system | `auto` follows the OS; `reduced` forces off; `full` forces on. |
| Text size | Default | Scales the reading/writing surface (`--reading-scale`). |
| Line spacing | Normal | Prose leading (`--reading-leading-scale`). |
| Always underline links | Off | Links don't rely on colour alone (WCAG 1.4.1). |
| Enhanced focus indicator | Off | Thicker, higher-contrast focus outline. |

## Keyboard

- **Tab / Shift+Tab** — move between controls; the **Skip to content** link is the
  first focusable element on every route and moves focus to the page's `<main>`.
- **⌘K / Ctrl+K** — Quick Help overlay. **⌘/ or ⌘?** — toggle help.
- **Escape** — dismiss the floating formatting toolbar, popovers, and dialogs.
- **Arrow keys** — resize the split-view divider; navigate Radix menus/tabs.
- Markdown shortcuts (`#`, `>`, `-`, `**`) work in the editor regardless of the
  floating toolbar.

## Screen readers

- Landmarks: `<header>` (Topbar), `<nav>` (sidebar document tree), labelled
  `<aside>` rails, and `<main id="main-content">` per screen.
- Form fields link their hint and error text via `aria-describedby`; errors use
  `role="alert"`.
- Use `VisuallyHidden` for screen-reader-only text rather than ad-hoc `sr-only`.

## Known limitations / conditional criteria

- **Status colour contrast in the default `light` theme:** `--danger`
  (~3.2:1 on its tint) and `--success`-on-tint fall below the 4.5:1 small-text AA
  bar. They are intentionally **not** changed, because altering the default
  tokens would change the experience for existing users. Users who need stronger
  status contrast switch to a high-contrast theme (which meets AAA). Tracked in
  `docs/design-system.md` §11.3 and asserted (with a 3:1 floor) by the contrast
  test.
- **AAA across all content** (e.g. 1.4.6 enhanced contrast for *every* text token,
  2.4.9 link purpose from link alone) is not claimed for the default themes.
- The editor surface (Lexical) relies on the library's built-in semantics; deep
  rich-text screen-reader review is ongoing.

## How accessibility is tested

- **Unit:** preference layer, store, provider, primitives, and the
  `contrast.test.ts` policy lock (Vitest).
- **E2E:** `accessibility-settings`, `accessibility-non-regression`,
  `skip-link`, and `a11y-axe` (axe-core WCAG 2 A/AA scans) under `e2e/`.
- **Storybook:** the `@storybook/addon-a11y` checks component stories.

Report accessibility issues the same way as any other bug.
