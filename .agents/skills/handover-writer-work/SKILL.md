---
name: handover-writer-work
description: >
  Capture in-progress Writer work as a handover so another agent or a later session can
  resume it without loss. Use when context or token budget is running low, when work will
  span sessions, or when passing a task to someone else. Trigger terms: "handover",
  "hand off", "handoff", "pause", "resume later", "context running out", "pick up where
  I left off", "continue this later".
metadata:
  version: 1.0.0
  tags: [handover, continuity, todo, resumability]
---

# Hand Over Writer Work

## When to hand over

- Context or token budget is running low mid-task.
- Work will resume in a later session, or another agent is taking over.
- A stop-and-ask rule has fired and no one can answer right now (see AGENTS.md, "When a
  stop-and-ask rule fires and no user can answer").

## The todo list is the spine of the handover

The live todo list (see [AGENTS.md § "Todo tracking"](../../../AGENTS.md)) **is** the
handover — a handover is that list plus where you stopped. A handover without an accurate
todo list is incomplete.

Before you write the handover, reconcile the list with reality:

1. Mark every finished item completed; leave anything unverified open.
2. Mark the item you were on in-progress and record the exact next action for it.
3. Add any work you discovered but had not yet captured as new items — including every task
   the runbook you were following still has outstanding.

## Handover format

Produce this, in order:

```
## Handover: <task, one line>

### Branch / working-tree state
<branch name>; <clean, or list uncommitted/untracked changes>; last verification command
run and its result.

### Todo list (source of truth)
- [x] <done item>
- [~] <in-progress item> — stopped at: <exact point>; next action: <concrete step>
- [ ] <pending item>
- [ ] <pending item>

### Context the next agent needs
- Key files touched: <path — why>
- Decisions made and why: <...>
- Analogue / runbook being followed: <skill or playbook workflow>

### Open questions / blocked (stop-and-ask)
- <question no one could answer, stated so it can be answered cold>

### Gates not yet green
- <lint / typecheck / test:run / test:e2e / coverage — which have not passed, and why>
```

## Hard rules

- **Never mark an item done that is not verified done.** A handover that reports green when
  a gate has not passed is a broken handover — the next agent inherits a false baseline.
- **Carry every unanswered stop-and-ask question into the handover prominently.** Never drop
  it or guess past it; AGENTS.md forbids guessing your way past a stop-and-ask.
- **State the branch and working-tree state exactly** so the next agent starts from truth,
  not assumption. Note whether changes are committed, staged, or only in the working tree.
- **Do not commit, push, or open a PR** just to produce a handover unless the user asked for
  it — the handover is a record of state, not a new change.
- Keep the copy factual and in British English; a handover is a record, not a summary meant
  to impress.

## Track this work as a todo list

Producing a handover is itself a short runbook: seed a todo list from the reconcile steps
and the format sections above — reconcile the list, then fill each `###` block in order (see
[AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Mark exactly one item in-progress as you
begin it and completed the moment it is done. Reconciling the *task's* todo list is the first
of those items, and it must be honest — an unverified item stays open.
