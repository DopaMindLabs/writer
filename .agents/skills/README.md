# Writer agent skills

`AGENTS.md` is the universal entry point. Read it first, then compose skills:

1. Choose one task skill: navigate, plan, implement, audit, or debug.
2. Add every matching domain skill: UI, persistence, collaboration, or cloud.
3. Add `test-writer-changes` whenever tests or behaviour change.
4. Reach for `handover-writer-work` when pausing or passing work to another session.

Every skill maintains a **live todo list** for the work in progress — each skill's steps or
checklist are a runbook you seed the list from. See [AGENTS.md § "Todo tracking"](../../AGENTS.md)
for the canonical rules; the todo list is also the backbone of a `handover-writer-work` handover.

Skills are tool-vendor-neutral. Exact search and TypeScript references are the baseline;
optional graph tooling may accelerate impact analysis but is never required.
