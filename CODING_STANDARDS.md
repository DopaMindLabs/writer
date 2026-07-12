# Coding Standards

These rules are adapted from NASA/JPL's *"Power of Ten: Rules for Developing
Safety-Critical Code"* for this TypeScript/React codebase. They keep the code easy to read
and to check statically. ESLint (`eslint.config.js`) enforces most of them; the rest are
checked in review against the enforcement map below.

## Summary: the ten rules

1. **[Simple control flow](#1-simple-control-flow).** Keep cyclomatic complexity low (≤ 12); no unbounded recursion; no dynamically constructed code.
2. **[Bounded loops](#2-bounded-loops).** Every loop has an obvious upper bound; no `while (true)` without a guaranteed exit.
3. **[No unbounded growth, no leaks](#3-no-unbounded-growth-no-leaks).** Clean up every effect, listener, timer, and live query; no growing module-level caches.
4. **[Small functions](#4-small-functions).** ≤ 60 lines, ≤ 3 parameters (use an options object beyond that).
5. **[Assert at boundaries and invariants](#5-assert-at-boundaries-and-invariants).** Validate all untrusted input (IndexedDB, localStorage, import, URL) with `invariant()`; assert impossible states inside non-trivial logic.
6. **[Smallest data scope](#6-smallest-data-scope).** `const` by default; no module-level mutable state; narrowest types; smallest export surface.
7. **[Check every return value](#7-check-every-return-value).** No floating promises; handle nullable returns; never silently swallow errors.
8. **[No type escape hatches](#8-no-type-escape-hatches).** No `any`, no `@ts-ignore`/`@ts-nocheck`; no `@ts-expect-error`; keep `as` and `!` at validated boundaries.
9. **[Immutability](#9-immutability).** `readonly` where possible; never mutate parameters or shared state; Zustand updates stay immutable.
10. **[Zero lint/type errors in CI](#10-zero-linttype-errors-in-ci).** ESLint and `tsc` run clean on every push.

## How this is enforced

- `npm run lint` runs ESLint over the repo, and CI fails on any error. Every configured
  rule runs at `error` severity. If a newly adopted rule ever has to land against
  pre-existing violations, it enters at `warn` (a tracked backlog) and is promoted to
  `error` the moment its backlog reaches zero — `warn` is a temporary state, never a
  destination.
- Pre-commit (`husky` plus `lint-staged`) runs `eslint --max-warnings=0` on staged
  `*.{ts,tsx}` files, so new and edited code must be clean, warnings included.
- `npm run typecheck` (`tsc -b --noEmit`) must pass. Strict mode is on (`strict`,
  `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`).

### Enforcement map

Which half of each rule the linter carries, and which half review carries:

| Rule | Machine-enforced by | Review-checked |
| --- | --- | --- |
| 1 | `complexity` (≤ 12), `max-depth` (≤ 4) | recursion bounds; no `eval`/`new Function` |
| 2 | — | loop bounds |
| 3 | `react-hooks/exhaustive-deps` | cleanup returned from every subscription; no growing caches |
| 4 | `max-lines-per-function` (60), `max-params` (4), `func-style`, `prefer-arrow-callback` | splitting components sensibly |
| 5 | `switch-exhaustiveness-check` | `invariant()` at every trust boundary; invariants in non-trivial logic |
| 6 | `prefer-const`, `no-var` | narrowest scope, types, and export surface |
| 7 | `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unnecessary-condition` | intentional `catch`es say why |
| 8 | `no-explicit-any`, `ban-ts-comment`, `no-non-null-assertion`, `no-unsafe-*` family | `as` kept to validated boundaries |
| 9 | `prefer-const` | `readonly` fields; no parameter/shared-state mutation |
| 10 | CI lint + typecheck jobs | — |

### Scope and exceptions

These are pre-existing, config-level scope settings — **not** licence to add new exemptions:

- `src/tours/` (driver.js guided tours) is not linted at all.
- `src/editor/` (Lexical) keeps every correctness rule — including `max-params` — but
  switches off `max-lines-per-function`, `complexity`, and `max-depth`, because the editor
  API forces large or recursive node walks.
- Tests, stories, e2e specs, `.storybook/`, and `src/test/` switch off the size limits and
  `func-style`, and relax several strictness rules that fight fixture code (`!` assertions,
  floating promises, `eqeqeq`, template-expression checks, and similar); e2e specs and
  Storybook config additionally skip type-aware linting.
- Config files (`*.config.*`, `eslint.config.js`) are not linted.

**Do not relax limits or silence the linter to make code pass.** Never raise/loosen the size
limits, weaken or disable an ESLint rule, or add `// eslint-disable*`, `// nasa-exception`,
`@ts-ignore`/`@ts-expect-error`, or any other suppression. Refactor instead — split the
function or file, extract a module, correct the type. If you are convinced a limit genuinely
cannot be met by refactoring, **stop and ask the user clearly and explicitly what to do** before
changing any config or adding a suppression; do not decide unilaterally.

---

## The rules in detail

### 1. Simple control flow
Prefer flat, early-return code over deep nesting. Keep cyclomatic complexity at 12 or below
and nesting at 4 or below. Avoid unbounded recursion; an explicit work-list or stack is
easier to bound, which matters most for Lexical node traversal. Never use `eval`,
`new Function`, or other dynamically constructed code — it defeats every static check this
standard is built on.

### 2. Bounded loops
Every loop must have a statically obvious upper bound. A `while (true)` or `for (;;)` is
only acceptable with a guaranteed `break` or a hard iteration cap.

### 3. No unbounded growth, no leaks
The browser will not reclaim memory you forget to release, so every subscription must be
undone.

```ts
// ✗ Bad: leaks a listener on every mount
useEffect(() => {
  const onResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', onResize);
}, []);

// ✓ Good: cleanup returned
useEffect(() => {
  const onResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []);
```

The same applies to `setInterval`/`setTimeout`, Dexie `liveQuery`/`useLiveQuery`
subscriptions, and any event emitter. Do not accumulate state in module-level caches.

### 4. Small functions
A function should fit on a screen: 60 lines or fewer (blank lines and comments not
counted), 3 parameters or fewer. Past three arguments, pass an options object. Split large
React components into smaller pieces. (ESLint's `max-params` is still set to 4 as the hard
floor for the pre-existing backlog — that is not licence to write new 4-parameter functions;
new code targets 3, checked in review.)

Write functions as arrow functions (`const f = () => …`), including utilities; `func-style`
and `prefer-arrow-callback` enforce this. A test file's extension mirrors the file under
test (`foo.ts` → `foo.test.ts`, `foo.tsx` → `foo.test.tsx`).

### 5. Assert at boundaries and invariants
A value that crosses a trust boundary (an IndexedDB read, `localStorage`, a ZIP/BibTeX
import, or a URL param) is `unknown` until checked. Use `invariant()` from `@/lib/invariant`.

```ts
// ✗ Bad: silences the compiler; fails later with a useless error
const doc = (await db.documents.get(id))!;
return doc.title;

// ✓ Good: checked, narrowed, and diagnosable
const doc = await db.documents.get(id);
invariant(doc, () => `document ${id} not found`);
return doc.title;
```

Distinguish *expected-bad input* from *impossible states*. Data a user can legitimately get
wrong (a malformed BibTeX or ZIP import) is validated and answered with a graceful,
user-visible error path — not a crash. `invariant()` is for states that cannot occur if the
code is correct: a missing row for an id we just wrote, an unreachable `switch` arm. Use
`assertNever` for exhaustive `switch` and union handling, which also satisfies rule 8.

Assertions are not only for boundaries: non-trivial logic should state its invariants too
(the original rule mandates a minimum assertion density for good reason). If a function has
a precondition worth a comment, it is worth an `invariant()` instead. The existing
`sanitize*` and `clamp*` helpers in `src/store/ui.ts` show the pattern for sanitising
persisted state.

### 6. Smallest data scope
Declare values in the narrowest scope that works. Use `const` by default (`let` only when
reassigned, `var` never). Avoid mutable module-level state; prefer the Zustand store or
React state. Keep types as narrow as the data allows, and export surfaces as small as the
callers allow — an export is an API contract; don't create one for internals.

### 7. Check every return value
Handle promise results and nullable returns explicitly.

```ts
// ✗ Bad: floating promise, so errors are lost
saveDocument(doc);

// ✓ Good: awaited (or explicitly handled)
await saveDocument(doc);
// or, intentionally not awaited:
void saveDocument(doc).catch(reportError);
```

The obligation is two-sided: callers check what they receive, and exported functions
validate what they are given (rule 5). A `catch` that ignores an error on purpose must say
why (see the `localStorage` quota handlers in `src/store/ui.ts`).

### 8. No type escape hatches
Do not suppress the type checker to make an error go away.

```ts
// ✗ Bad: silences the compiler, no runtime safety
const data = JSON.parse(raw) as Settings;

// ✓ Good: parse into a validated shape
const parsed: unknown = JSON.parse(raw);
const data = parseSettings(parsed); // validates; returns Settings or throws
```

No `any`. No `@ts-ignore` or `@ts-nocheck`, ever. The linter accepts `@ts-expect-error`
only with a description, and repo policy is stricter still: do not add one without **stopping
and asking the user explicitly first** — fix the types instead. Keep `as` casts and non-null
`!` assertions at validated boundaries, not as a convenience.

### 9. Immutability
Treat data as immutable. Mark never-reassigned fields `readonly`. Do not mutate function
parameters or shared objects; produce new values instead.

```ts
// ✗ Bad: mutates existing state
state.items.push(item);
set({ items: state.items });

// ✓ Good: new array
set((s) => ({ items: [...s.items, item] }));
```

### 10. Zero lint/type errors in CI
`npm run lint` and `npm run typecheck` run on every push and must pass. All rules sit at
`error`; a warning backlog exists only while a newly adopted rule is being burned down —
do not add to one (the pre-commit hook blocks that), reduce it when you touch nearby code,
and promote the rule to `error` when its backlog reaches zero.

---

## Appendix: validation against established standards

These rules were cross-checked against widely used strict standards so they match
established practice rather than local preference:

- **typescript-eslint `strict-type-checked` + `stylistic-type-checked`**: used directly as
  the ESLint presets. They supply the type-safety machinery behind rules 7 and 8 and parts
  of 6 and 9 (`no-unnecessary-condition`, `restrict-template-expressions`,
  `no-unnecessary-type-assertion`, and friends). The numeric limits behind rules 1 and 4
  are core ESLint (`complexity`, `max-depth`, `max-lines-per-function`, `max-params`).
- **Google TypeScript Style Guide**: backs rule 8 (prefer runtime checks over `as` and `!`)
  and rule 9 (`readonly`, CONSTANT_CASE). This repo is stricter than Google on suppressions:
  Google permits `@ts-expect-error` over `@ts-ignore`; here both are forbidden (see
  [Scope and exceptions](#scope-and-exceptions)).
- **MISRA C and the JPL Institutional C Standard**: the Power of Ten sits on top of MISRA
  within the JPL standard and was written to be statically checkable, which is why almost
  every rule here maps to a lint check — the enforcement map above marks the review-checked
  remainder. The C-only rules were adapted rather than dropped: "no heap after init"
  becomes no leaks and cleanup (rule 3), "limited preprocessor" becomes no type escape
  hatches (rule 8), and "restricted pointers" becomes immutability (rule 9).
