# AGENTS.md

## Coding standards (read first)

This repo enforces a strict standard adapted from NASA/JPL's "Power of Ten". See
[CODING_STANDARDS.md](./CODING_STANDARDS.md). When writing or editing code:

- New or edited code must pass `npx eslint <files> --max-warnings=0` (the pre-commit hook
  enforces this on staged files). Existing warnings are a tracked backlog; do not add to it.
- Run `npm run lint` and `npm run typecheck` before committing; both gate CI.
- Use `invariant()` and `assertNever()` from `@/lib/invariant` to validate untrusted input.
- Write all functions as arrow functions (`const f = () => …`), including utilities.
- A test file's extension mirrors the file under test: `foo.ts` → `foo.test.ts`,
  `foo.tsx` → `foo.test.tsx`.
- `src/tours/` is exempt; `src/editor/` relaxes size limits only. For a one-off exception,
  add `// nasa-exception: <rule> (<reason>)` above an `// eslint-disable-next-line`.

## Design system (read before building UI)

[`docs/design-system.md`](./docs/design-system.md) is the **single source of truth** for
design tokens, principles, and UI primitives, adapted from the canonical "Lorem Ipsum — Design
System" design spec. When adding or changing any component or feature, verify it aligns:

- **Verify alignment.** Use the design tokens (the token-backed Tailwind classes
  `ink`/`paper`/`rule`/`accent`/`hl-*`/`warning`/`danger`/`success`/`info` from
  `tailwind.config.ts`, backed by `src/index.css`) and follow the principles: hairline grammar,
  grayscale palette with status as the only colour exception, three type families (Geist /
  Source Serif 4 / Geist Mono), square corners, borderless icons. **Never hard-code a hex or
  px colour** — there is a token for it.
- **Compose, don't reinvent.** Build from the existing primitives in `src/components/ui/`
  (Button, TextField, Select, Checkbox, RadioRow, FormRow, Fieldset, Chip/ChipGroup, dialog,
  popover, tooltip, tabs, …). Style variants with `cva` (`@/components/libs/variants`) + `cn`
  (`@/lib/utils`); use Radix wrappers from `@/components/libs/primitives` and icons from
  `@/components/libs/icons`. Don't duplicate a primitive or reach for a raw `lucide-react`
  import.
- **Raise gaps, don't work around them.** If no suitable primitive or token exists, **do not**
  hard-code a one-off. Give feedback that the design system must be extended — add the
  primitive under `src/components/ui/` and update `docs/design-system.md` to match — so the DS
  stays the source of truth and the gap is addressed, not buried.
- **HOCs must be composed from and consistent with the DS** — its primitives and tokens, not
  bespoke markup or colours.
- **Scope.** Reading-and-publishing surfaces are out of scope for this repo and are omitted
  from `docs/design-system.md`; build the **writer** surface only.
- Add a `.test.tsx` and a `.stories.tsx` mirroring the file under test (see
  [CODING_STANDARDS.md](./CODING_STANDARDS.md)).

## Key commands

- `npm run dev`: Vite dev server
- `npm run lint` and `npm run lint:fix`: ESLint
- `npm run typecheck`: `tsc --noEmit`
- `npm run test:run`: unit tests (Vitest, once)
- `npm run test:e2e`: Playwright e2e
