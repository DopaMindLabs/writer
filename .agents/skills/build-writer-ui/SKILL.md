---
name: build-writer-ui
description: >
  Design system, accessibility, i18n, and testing requirements for Writer UI work.
  Use when adding or changing any component, screen, or user-facing copy. Trigger
  terms: "component", "UI", "design system", "accessibility", "a11y", "i18n",
  "copy", "help article", "story", "storybook", "style".
metadata:
  version: 1.3.0
  tags: [ui, design-system, accessibility, i18n, storybook]
---

# Build Writer UI

## Design system (read first)

`docs/design-system.md` is the single source of truth for tokens, primitives, and
principles. Read the relevant sections before choosing any component or colour.

### Tokens
Use the token-backed Tailwind classes from `tailwind.config.ts` / `src/index.css`:
`ink`, `paper`, `rule`, `accent`, `hl-*`, `warning`, `danger`, `success`, `info`.
**Never hard-code a hex colour or a raw `px` value** for anything a token covers.

### Primitives
Build from `src/components/ui/` — Button, TextField, Select, Checkbox, RadioRow,
FormRow, Fieldset, Chip / ChipGroup, dialog, popover, tooltip, tabs, `InlineBanner`,
`StatusGlyph`, `StatusBadge`, `SkipLink`, `VisuallyHidden`.

Survey `docs/design-system.md` component tables **and** `src/components/ui/` before
writing new markup. If no suitable primitive exists, add it under `src/components/ui/`
and update `docs/design-system.md` — do not work around the gap.

### Composition helpers
`cva` from `@/components/libs/variants`, `cn` from `@/lib/utils`, Radix wrappers from
`@/components/libs/primitives`, icons from `@/components/libs/icons`, drag-and-drop from
`@/components/libs/dnd` (never raw `lucide-react` or `@dnd-kit/*` imports).

## Accessibility requirements (every UI change)

- Target WCAG 2.2 Level AAA for every applicable success criterion, including
  the Level A and AA criteria required by AAA. Use `ACCESSIBILITY.md` as the
  canonical target and gap list; automated checks alone are not proof of AAA.
- Keyboard-operable: every interactive element reachable by Tab with a visible focus ring.
- Accessible name: every control has an `aria-label` or a visible `<label>`.
- Correct semantics: use HTML roles (`<button>`, `<nav>`, landmarks) before ARIA.
- `aria-live` / `aria-describedby` for dynamic content changes.
- Keyboard shortcuts: always `event.metaKey || event.ctrlKey` — never one platform only.
  Derive the display label from the running platform; never hard-code `⌘` or `Ctrl`.
- Respect `prefers-reduced-motion` and the `data-motion` token; no hard-coded durations.
- For text in every theme, target SC 1.4.6: 7:1 for normal text and 4.5:1 for
  large text, subject to its exceptions. Apply the relevant WCAG criterion to
  non-text UI instead of treating 7:1 as a universal graphics ratio.
- New opt-in states must be behind their own story and non-regression test (no
  behaviour-changing `data-*` applied by default).

See `docs/design-system.md §11` and `ACCESSIBILITY.md` for the full layer.

## British English

All user-facing copy uses British English: `-ise`/`-isation`, `-our`, `-re`, `colour`,
`organise`, `behaviour`, `centre`. Exceptions: code identifiers, URL slugs, CSS tokens,
and established product names stay as written.

UI strings live in `src/i18n/locales/en/*.json`. Help Center articles are in
`src/help/content/en/<slug>.md`.

## One component per file

Each React component in its own PascalCase file. Group related sub-components under a
shared folder; never co-locate multiple components in one file.

## Required artefacts for every new component

1. `ComponentName.tsx` — the component (in `src/components/` or the feature folder)
2. `ComponentName.test.tsx` — Vitest unit tests; cover all interactive states
3. `ComponentName.stories.tsx` — Storybook stories; enable the a11y addon check

## Help Center updates

User-facing behaviour changes ship with a help update in the same PR:

1. Write or edit `src/help/content/en/<slug>.md` (task-oriented, end-user prose)
2. Register the article in `src/lib/help/registry.ts` (`category`, `keywords`, `featureArea`)
3. `src/lib/help/registry.test.ts` fails if a `featureArea` has no article — treat a
   red test as a missing doc, not a test to weaken

### Help article structure

Use only the sections that help the reader complete or recover the task:

```markdown
# <Task or feature name>

<One sentence: what it does and why it helps.>

## At a glance

- <Up to five facts the reader needs before starting.>

## Before you start

- <Prerequisites only.>

## <Complete the main task>

1. <One action using the exact UI label.>

## After <the task>

<Result, status and likely next action.>

## Troubleshooting

### <Visible problem or exact error>

<Direct fix first.>

## Privacy and security

<Only information relevant to the user's decision.>

## Related

- [Article](slug) — <reason to open it>.
```

### Help writing rules

- Lead with what the feature is, its outcome and its useful differentiator.
  Describe capabilities directly instead of defining the feature by exclusions.
  Negative phrasing is appropriate for a genuine product benefit such as **no
  account and no server**.
- Put the primary path before alternatives, edge cases and technical detail.
- Keep each paragraph to one idea and usually one to three sentences. Use bullets
  for independent facts and numbered lists for ordered actions; give each step one
  user action.
- Use clear, task-based headings so readers can find the next action without
  reading the whole article. Keep setup, normal use, recovery and troubleshooting
  separate.
- Use exact visible labels and verified behaviour. Never invent a control, promise
  an untested outcome or expose implementation detail as user guidance.
- Explain a limitation once, beside the action it affects. Repeat or emphasise a
  warning only for security, privacy, data loss or irreversible actions.
- Remove conversational filler, repeated reassurance, rhetorical explanations and
  protocol narration. State the action, result and reason directly.
- Use British English. Keep code identifiers, slugs and established product names
  unchanged.
- End with two to four relevant links. Name the destination in the link text and
  say why it is useful.

## Spec update

Any behaviour change must update the relevant section of `docs/technical-specification.md`
in the same PR. See `plan-writer-change` for the full requirement.

## Track this work as a todo list

Before you start, seed a todo list from this skill's requirements and the Required-artefacts
list — one item per artefact (`.tsx`, `.test.tsx`, `.stories.tsx`, help article, spec
section) and per checklist you have to satisfy — and work it top to bottom (see
[AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Mark exactly one item in-progress as you
begin it and completed the moment it is verified done, and append any newly discovered work
as new items. Keep the list current: it is the source of truth for what remains and the
backbone of any [handover](../handover-writer-work/SKILL.md).
