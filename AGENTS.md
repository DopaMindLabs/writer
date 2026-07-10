# AGENTS.md

> Bootstrap for every agent. Read this file first, then select and read the
> relevant `.agents/skills/*/SKILL.md` files before touching any code.
> Skills may be combined. When in doubt, read more skills, not fewer.

---

## Skill routing table

| Trigger | Skill |
|---|---|
| "find", "locate", "where is", "who calls", "trace", "callers of" | [`navigate-writer-codebase`](.agents/skills/navigate-writer-codebase/SKILL.md) |
| "plan", "design", "what files", "scope", "impact", "before I code" | [`plan-writer-change`](.agents/skills/plan-writer-change/SKILL.md) |
| "implement", "code it", "make the change", "write the code" | [`implement-writer-change`](.agents/skills/implement-writer-change/SKILL.md) |
| "audit", "review", "check", "risks in", "is this safe" | [`audit-writer-change`](.agents/skills/audit-writer-change/SKILL.md) |
| "test", "TDD", "vitest", "playwright", "coverage", "spec" | [`test-writer-changes`](.agents/skills/test-writer-changes/SKILL.md) |
| "component", "UI", "design system", "a11y", "i18n", "copy", "storybook" | [`build-writer-ui`](.agents/skills/build-writer-ui/SKILL.md) |
| "schema", "migration", "dexie", "table", "stores.ts", "LoremDB" | [`change-writer-persistence`](.agents/skills/change-writer-persistence/SKILL.md) |
| "collab", "yjs", "crdt", "multi-tab", "BroadcastChannel", "presence" | [`work-on-editor-collaboration`](.agents/skills/work-on-editor-collaboration/SKILL.md) |
| "cloud", "dexie cloud", "sync", "encryption", "escrow", "passphrase" | [`work-on-cloud-sync`](.agents/skills/work-on-cloud-sync/SKILL.md) |

---

## Reference documents

| Document | When to read |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | Before any change — layers, boundaries, call chains |
| [`docs/technical-specification.md`](./docs/technical-specification.md) | Before any user-facing behaviour change |
| [`docs/design-system.md`](./docs/design-system.md) | Before any UI work |
| [`docs/cloud-sync-beta.md`](./docs/cloud-sync-beta.md) | Before any cloud/encryption work |
| [`docs/agent-policies.md`](./docs/agent-policies.md) | Full policy detail for any rule below |
| [`docs/agent-playbooks.md`](./docs/agent-playbooks.md) | Step-by-step workflows (Locate / Plan / Audit / Change) |
| [`docs/agent-navigation-benchmarks.md`](./docs/agent-navigation-benchmarks.md) | Navigation benchmark cases |
| [`CODING_STANDARDS.md`](./CODING_STANDARDS.md) | Power-of-Ten coding rules |

---

## Hard stops — always on, no exceptions

### Language
All user-facing copy, docs, and comments use **British English** (`-ise`, `-our`, `-re`).
Exceptions: code identifiers, URL slugs, CSS/token names, established proper names.

### Code quality (Power-of-Ten adapted)
- Complexity ≤ 12; nesting ≤ 4; functions ≤ 60 lines, ≤ 3 params (else options object).
- No floating promises; no nullable blindspots; no module-level mutable state.
- **No suppressions** — no `any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable*`,
  `nasa-exception`, or any other suppression. Fix the code. If genuinely impossible,
  **stop and ask** — never decide unilaterally.
- One component per file (PascalCase filename). One service per file.

### Tests
- **Never skip, focus, delete, or weaken a test.** No `.skip`, `.only`, `xit`,
  `xdescribe`, `.fixme`, or commenting-out. A failing test signals a regression — fix it.
- **Coverage may only increase.** Never lower a value in `coverage-baseline.json`.

### User-facing changes
Every user-facing behaviour change ships with: a test, a help-article update
(`src/help/content/en/`), and a spec update (`docs/technical-specification.md`).

### Git / branches
- **`main` is protected.** Never commit, amend, or force-push to it.
- **Always confirm before any branch-level git write.** State the branch, operation,
  and blast radius; wait for explicit approval.

### Legacy support
Do not add new legacy code paths without explicit user approval.

---

## Key commands

```bash
npm run dev              # Vite dev server
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npx eslint <file> --max-warnings=0  # targeted lint check
npm run test:run         # Vitest (once)
npm run test:e2e         # Playwright e2e
npm run test:e2e:coverage  # e2e + ratchet check
npm run commit           # Commitizen prompt
```
