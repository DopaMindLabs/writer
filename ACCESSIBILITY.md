# Accessibility

Writer targets **WCAG 2.2 Level AAA** for every applicable success criterion. This
document is the canonical source for that target, current gaps and verification. The design
system implements the visual and preference layer in
[`docs/design-system.md` §11](./docs/design-system.md); `AGENTS.md` routes contributors here
instead of maintaining a second accessibility policy.

## Conformance summary

| Area | Target | Current evidence |
|---|---|---|
| Overall conformance | **WCAG 2.2 Level AAA** (all applicable A, AA and AAA criteria) | Target; not yet claimed. |
| Text contrast, every theme | SC 1.4.6 (AAA): 7:1 normal text, 4.5:1 large text | Core text exceeds AAA; known status-token gaps remain. |
| Non-text UI contrast | SC 1.4.11 (AA, required for AAA conformance): 3:1 where applicable | Covered by token tests in part; manual review still required. |
| Keyboard operability | SC 2.1.1 and applicable AAA keyboard criteria | Skip link + native/Radix focus management. |
| Focus not obscured | SC 2.4.12 (AAA) | Target; requires manual flow review. |
| Focus appearance | SC 2.4.13 (AAA) | Enhanced focus is available; full default-state audit remains. |
| Reduced motion | SC 2.3.3 (AAA) where applicable | `prefers-reduced-motion` + `data-motion` gating. |
| Name/role/value | SC 4.1.2 (A) | Roles, labels, landmarks, `aria-describedby`. |
| Automated audit | axe-core WCAG 2 A/AA | Supporting evidence only; it cannot establish AAA conformance. |

A Level AAA claim requires all applicable Level A, AA and AAA success criteria to be met for
the claimed scope. Until that has been verified, describe AAA as the **target**, not current
conformance. See the [W3C WCAG 2.2 conformance levels](https://www.w3.org/TR/WCAG22/#cc1).

High-contrast themes are useful enhancements, but they are not an alternative conformance
route. The default experience must progress towards the same target; known gaps below are work
to close rather than permanent policy exceptions.

## What accessibility applies to

Accessibility is a product and functional requirement, not only a UI-component requirement.
Review any change that affects what a person can perceive, operate, understand or recover from.
That includes settings, keyboard shortcuts, focus and state transitions, status/error messages,
timed behaviour, gestures, preference persistence, import/export and recovery flows, even when
the implementation change contains no JSX or CSS.

Purely internal refactors with no observable or interaction effect can mark accessibility
impact as not applicable. Everything else is assessed against the WCAG criteria that actually
apply to the changed behaviour.

## Preferences (Settings → Accessibility)

Preferences enhance the accessible baseline and persist locally (`localStorage` key
`lorem-a11y`, separate from `lorem-ui`). They are applied as orthogonal `data-*` attributes on
`<html>` that compose with the active theme. Meeting the conformance target must not require a
user to discover or enable one of these preferences first.

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

## Known gaps to close

- **Status colour contrast in the default `light` theme:** `--danger`
  (~3.2:1 on its tint) and `--success`-on-tint fall below the 4.5:1 small-text AA
  bar and therefore block both AA and AAA conformance for affected text. The existing
  `contrast.test.ts` 3:1 default-theme floor is a regression guard, not the target. Tracked in
  `docs/design-system.md` §11.3.
- **Complete AAA criterion audit:** axe and Storybook do not cover every AAA success criterion.
  A manual criterion-by-criterion review of the claimed scope is still required.
- The editor surface (Lexical) relies on the library's built-in semantics; deep
  rich-text screen-reader review is ongoing and remains part of the conformance work.

## How accessibility is tested

- **Unit:** preference layer, store, provider, primitives, and the
  `contrast.test.ts` regression floor (Vitest). Its current thresholds are not proof of AAA.
- **E2E:** `accessibility-settings`, `accessibility-non-regression`,
  `skip-link`, and `a11y-axe` (axe-core WCAG 2 A/AA scans) under `e2e/`. These scans support
  the audit but do not establish AAA conformance.
- **Storybook:** the `@storybook/addon-a11y` checks component stories.
- **Manual:** review every applicable WCAG 2.2 A, AA and AAA criterion for new or changed
  user-facing or interaction-affecting behaviour,
  including keyboard-only and screen-reader flows, focus visibility/obscuring, zoom/reflow and
  criteria that automated tools cannot evaluate.

Report accessibility issues the same way as any other bug.
