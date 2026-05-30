# Coding Standards

These rules are adapted from NASA/JPL's *"Power of Ten: Rules for Developing
Safety-Critical Code"* for this TypeScript/React codebase. They keep the code easy to read
and to check statically. ESLint (`eslint.config.js`) enforces most of them; the rest are
checked in review.

## Summary: the ten rules

1. **[Simple control flow](#1-simple-control-flow).** Keep cyclomatic complexity low (≤ 12); no unbounded recursion.
2. **[Bounded loops](#2-bounded-loops).** Every loop has an obvious upper bound; no `while (true)` without a guaranteed exit.
3. **[No unbounded growth, no leaks](#3-no-unbounded-growth-no-leaks).** Clean up every effect, listener, timer, and live query; no growing module-level caches.
4. **[Small functions](#4-small-functions).** ≤ 60 lines, ≤ 4 parameters (use an options object beyond that).
5. **[Assert at boundaries](#5-assert-at-boundaries).** Validate all untrusted input (IndexedDB, localStorage, import, URL) with `invariant()`.
6. **[Smallest data scope](#6-smallest-data-scope).** `const` by default; no module-level mutable state; narrowest types.
7. **[Check every return value](#7-check-every-return-value).** No floating promises; handle nullable returns; never silently swallow errors.
8. **[No type escape hatches](#8-no-type-escape-hatches).** No `any`, no `@ts-ignore` (use `@ts-expect-error` with a reason); keep `as` and `!` at validated boundaries.
9. **[Immutability](#9-immutability).** `readonly` where possible; never mutate parameters or shared state; Zustand updates stay immutable.
10. **[Zero lint/type errors in CI](#10-zero-linttype-errors-in-ci).** ESLint and `tsc` run clean on every push.

## How this is enforced

- `npm run lint` runs ESLint over the repo, and CI fails on any error. Pre-existing
  violations of newly introduced rules are set to `warn` so they surface without breaking
  CI. This is a going-forward standard, not a mass refactor.
- Pre-commit (`husky` plus `lint-staged`) runs `eslint --max-warnings=0` on staged files
  only, so new and edited code must be clean, warnings included. When a rule's backlog
  reaches zero, promote it from `warn` to `error` in `eslint.config.js`.
- `npm run typecheck` (`tsc --noEmit`) must pass. Strict mode is already on.

### Scope and exceptions

- `src/tours/` (driver.js guided tours) is exempt and not linted.
- `src/editor/` (Lexical) keeps all correctness rules but relaxes the size limits, because
  the editor API forces large or recursive node walks. For a one-off correctness exception,
  add `// nasa-exception: <rule> (<reason>)` above an `// eslint-disable-next-line <rule>`.
- Tests, stories, and e2e specs relax size limits and allow `!` and floating promises.

---

## The rules in detail

### 1. Simple control flow
Prefer flat, early-return code over deep nesting. Keep cyclomatic complexity at 12 or below
and nesting at 4 or below. Avoid unbounded recursion; an explicit work-list or stack is
easier to bound, which matters most for Lexical node traversal.

### 2. Bounded loops
Every loop must have a statically obvious upper bound. A `while (true)` or `for (;;)` is
only acceptable with a guaranteed `break` or a hard iteration cap.

### 3. No unbounded growth, no leaks
The browser will not reclaim memory you forget to release, so every subscription must be
undone.

```ts
// ✗ Bad: leaks a listener on every mount
useEffect(() => {
  window.addEventListener('resize', onResize);
}, []);

// ✓ Good: cleanup returned
useEffect(() => {
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []);
```

The same applies to `setInterval`/`setTimeout`, Dexie `liveQuery`/`useLiveQuery`
subscriptions, and any event emitter. Do not accumulate state in module-level caches.

### 4. Small functions
A function should fit on a screen: 60 lines or fewer, 4 parameters or fewer. Past four
arguments, pass an options object. Split large React components into smaller pieces.

Write functions as arrow functions (`const f = () => …`), including utilities; `func-style`
and `prefer-arrow-callback` enforce this. A test file's extension mirrors the file under
test (`foo.ts` → `foo.test.ts`, `foo.tsx` → `foo.test.tsx`).

### 5. Assert at boundaries
A value that crosses a trust boundary (an IndexedDB read, `localStorage`, a ZIP/BibTeX
import, or a URL param) is `unknown` until checked. Use `invariant()` from `@/lib/invariant`.

```ts
// ✗ Bad: assumes the row exists
const doc = await db.documents.get(id);
return doc.title; // may throw at runtime

// ✓ Good: checked, and narrowed
const doc = await db.documents.get(id);
invariant(doc, () => `document ${id} not found`);
return doc.title;
```

Use `assertNever` for exhaustive `switch` and union handling, which also satisfies rule 8.
The existing `sanitize*` and `clamp*` helpers in `src/store/ui.ts` show the pattern for
sanitising persisted state.

### 6. Smallest data scope
Declare values in the narrowest scope that works. Use `const` by default (`let` only when
reassigned, `var` never). Avoid mutable module-level state; prefer the Zustand store or
React state. Keep types as narrow as the data allows.

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

A `catch` that ignores an error on purpose must say why (see the `localStorage` quota
handlers in `src/store/ui.ts`).

### 8. No type escape hatches
Do not suppress the type checker to make an error go away.

```ts
// ✗ Bad: silences the compiler, no runtime safety
const data = JSON.parse(raw) as Settings;

// ✓ Good: parse into a validated shape
const data = parseSettings(JSON.parse(raw)); // returns Settings or throws
```

No `any`. No `@ts-ignore` or `@ts-nocheck`; use `@ts-expect-error` with a description when a
suppression is unavoidable. Keep `as` casts and non-null `!` assertions at validated
boundaries, not as a convenience.

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
`npm run lint` and `npm run typecheck` run on every push and must pass. Warnings are the
running backlog: do not add to it (the pre-commit hook blocks that), and reduce it when you
touch nearby code. When a rule's backlog reaches zero, promote it to `error`.

---

## Appendix: validation against established standards

These rules were cross-checked against widely used strict standards so they match
established practice rather than local preference:

- **typescript-eslint `strict-type-checked`**: used directly as the ESLint preset. It
  supplies rules 1, 4, and 6 to 9, and adds `no-unnecessary-condition`,
  `restrict-template-expressions`, and `no-unnecessary-type-assertion`.
- **Google TypeScript Style Guide**: backs rule 8 (prefer runtime checks over `as` and `!`;
  `@ts-expect-error` over `@ts-ignore`) and rule 9 (`readonly`, CONSTANT_CASE).
- **MISRA C and the JPL Institutional C Standard**: the Power of Ten sits on top of MISRA
  within the JPL standard and was written to be statically checkable, which is why every
  rule here maps to a lint check. The C-only rules were adapted rather than dropped: "no
  heap after init" becomes no leaks and cleanup (rule 3), "limited preprocessor" becomes no
  type escape hatches (rule 8), and "restricted pointers" becomes immutability (rule 9).
