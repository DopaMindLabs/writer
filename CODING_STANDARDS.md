# Coding Standards

These rules are adapted from NASA/JPL's *"Power of Ten: Rules for Developing
Safety-Critical Code"* for this TypeScript/React codebase. They keep the code easy to read
and to check statically. ESLint (`eslint.config.js`) enforces most of them; the rest are
checked in review.

This file is the canonical coding standard. `AGENTS.md` owns repository workflow and hard
stops; [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) owns accessibility conformance; and
[`docs/design-system.md`](./docs/design-system.md) owns UI tokens and primitives. Keep detailed
domain rules in those sources rather than copying them here.

## Summary: the ten rules

1. **[Simple control flow](#1-simple-control-flow).** Keep cyclomatic complexity low (≤ 12); no unbounded recursion.
2. **[Bounded loops](#2-bounded-loops).** Every loop has an obvious upper bound; no `while (true)` without a guaranteed exit.
3. **[No unbounded growth, no leaks](#3-no-unbounded-growth-no-leaks).** Clean up every effect, listener, timer, and live query; no growing module-level caches.
4. **[Small functions](#4-small-functions).** ≤ 60 lines, ≤ 3 parameters (use an options object beyond that).
5. **[Assert at boundaries](#5-assert-at-boundaries).** Validate all untrusted input (IndexedDB, localStorage, import, URL) with `invariant()`.
6. **[Smallest data scope](#6-smallest-data-scope).** `const` by default; no module-level mutable state; narrowest types.
7. **[Check every return value](#7-check-every-return-value).** No floating promises; handle nullable returns; never silently swallow errors.
8. **[Proper types, no escape hatches](#8-proper-types-no-escape-hatches).** Model known data with concrete types; no `any`; keep `unknown`, `as` and `!` at validated boundaries.
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

These are pre-existing, config-level scope settings — **not** licence to add new exemptions:

- `src/tours/` (driver.js guided tours) is exempt and not linted.
- `src/editor/` (Lexical) keeps all correctness rules but relaxes the size limits, because
  the editor API forces large or recursive node walks.
- Tests, stories, and e2e specs relax size limits and allow `!` and floating promises.

**Do not relax limits or silence the linter to make code pass.** Never raise/loosen the size
limits, weaken or disable an ESLint rule, or add `// eslint-disable*`, `// nasa-exception`,
`@ts-ignore`/`@ts-expect-error`, or any other suppression. Refactor instead — split the
function or file, extract a module, correct the type. If you are convinced a limit genuinely
cannot be met by refactoring, **stop and ask the user clearly and explicitly what to do** before
changing any config or adding a suppression; do not decide unilaterally.

### Structure and file organisation

- **Single responsibility and modularity.** Keep high cohesion and low coupling. Depend on
  abstractions at subsystem boundaries and put a facade in front of complex subsystems so
  callers do not depend on implementation detail.
- **Functional style is the default.** Prefer pure functions, immutable data and composition.
  These are tools for clear boundaries, not substitutes for sound module design.
- **One component or service per file.** Put each React component in its own PascalCase file;
  put each service in its own module. Group related files in a feature folder and compose them
  instead of adding another component or service to an existing file.
- **Keep types close to their owner.** Put shared or substantial types in a dedicated
  `*.types.ts` file; otherwise co-locate them with the module they describe.
- **Separate compliance refactors.** If a file you must edit already violates these rules,
  bring it into compliance in a behaviour-preserving `refactor:` commit before the feature or
  fix commit. Do not bundle the clean-up with the behavioural change.

### Root-cause fixes

Fix the defect at the boundary or invariant that owns it. Reproduce or trace the failing flow
far enough to explain why it fails before choosing the implementation. Do not mask a symptom
with a retry, delay, fallback value, duplicate code path, compatibility branch or one-off
condition. A regression test must exercise the failure mode the root cause produced, not merely
pin the replacement constant or implementation detail.

If the root cause cannot be repaired within the authorised scope, stop and report the blocker.
Do not substitute a workaround or hack to make the visible symptom disappear.

### Comment discipline

Make names, types and control flow carry the explanation wherever they can. Add an inline
comment only when a non-obvious invariant, safety constraint or external behaviour cannot be
made clear in code. Explain **why** the constraint exists; do not narrate what the next line
does.

When an API or non-obvious contract needs documentation, use concise TSDoc/JSDoc (`/** … */`).
Write comments in British English. Do not restate signatures or types, preserve debugging
narration, address a reviewer, or add tutorial-style filler and repetitive generated prose.

### Security engineering

Use the [OWASP Top 10:2025](https://owasp.org/Top10/) as the minimum application-security
risk taxonomy for design, implementation and review. It is a baseline, not a complete threat
model: apply a feature-specific threat model whenever one exists, and do not force an OWASP
category onto a finding that does not fit.

- **Review every trust boundary.** Client-side code still has security boundaries: browser
  APIs, local/IndexedDB persistence, URLs and imports, rendered content, peer/provider traffic,
  cryptographic material, dependencies and build/configuration are all in scope.
- **Validate before trust.** Treat external, persisted and cross-device data as untrusted at
  the receiving boundary. Enforce shape, size, state and authorisation invariants before side
  effects or decryption/materialisation where the domain requires it.
- **Protect secrets and sensitive data.** Do not hard-code, log, place in URLs or persist
  secrets/keys in plaintext. Use the repository's established crypto/key-vault boundary rather
  than inventing primitives or bypassing it.
- **Preserve least privilege and integrity.** Expose only the capability a caller/provider
  actually has; verify identity/integrity before accepting privileged or replicated actions.
- **Fail deliberately.** Exceptional conditions must not fail open, partially apply a
  security-sensitive operation or silently downgrade a control.
- **Test the failure path.** Security-sensitive changes ship with negative/adversarial tests
  for the protected invariant, including malformed or exceptional input where applicable.

The `audit-writer-change` skill owns the PR-review checklist and finding format; domain skills
own additional controls such as the Writer Sync threat model.

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
A function should fit on a screen: 60 lines or fewer, 3 parameters or fewer. Past three
arguments, pass an options object. Split large React components into smaller pieces.
(ESLint's `max-params` is still set to 4 as the hard floor for the pre-existing backlog —
that is not licence to write new 4-parameter functions; new code targets 3, checked in
review.)

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

### 8. Proper types, no escape hatches
Model known shapes explicitly with domain types, interfaces, discriminated unions and typed
generics. Do not use `any`, `unknown`, `object`, `Record<string, unknown>` or a broad cast as a
substitute for a type the application already knows.

`unknown` is appropriate only while a genuinely untyped or untrusted value crosses a boundary,
such as parsed JSON, storage, imported content or an external message. Validate it there and
return a concrete type; do not propagate `unknown` through domain, service or component APIs.
Do not suppress the type checker to make an error go away.

```ts
// ✗ Bad: silences the compiler, no runtime safety
const data = JSON.parse(raw) as Settings;

// ✓ Good: parse into a validated shape
const data = parseSettings(JSON.parse(raw)); // returns Settings or throws
```

No `any`. No `@ts-ignore`, `@ts-nocheck`, or `@ts-expect-error` to make an error go away — fix
the types instead. If you believe a suppression is genuinely unavoidable, **stop and ask the
user explicitly first**; do not add one unilaterally. Keep `as` casts and non-null `!`
assertions at validated boundaries, not as a convenience.

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
- **Google TypeScript Style Guide**: backs rule 8 (prefer runtime checks over `as` and `!`)
  and rule 9 (`readonly`, CONSTANT_CASE). This repo is stricter than Google on suppressions:
  Google permits `@ts-expect-error` over `@ts-ignore`; here both are forbidden (see
  [Scope and exceptions](#scope-and-exceptions)).
- **[OWASP Top 10:2025](https://owasp.org/Top10/)**: the application-security baseline used by
  [Security engineering](#security-engineering). It supplements rather than replaces
  feature-specific threat models and security invariants.
- **MISRA C and the JPL Institutional C Standard**: the Power of Ten sits on top of MISRA
  within the JPL standard and was written to be statically checkable, which is why every
  rule here maps to a lint check. The C-only rules were adapted rather than dropped: "no
  heap after init" becomes no leaks and cleanup (rule 3), "limited preprocessor" becomes no
  type escape hatches (rule 8), and "restricted pointers" becomes immutability (rule 9).
