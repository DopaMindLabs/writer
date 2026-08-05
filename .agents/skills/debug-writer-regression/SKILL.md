---
name: debug-writer-regression
description: >
  Root-cause debugging for behaviour that broke or never worked. Use when a feature
  regressed, an interaction stopped working, or a visual glitch appeared. Trigger
  terms: "broken", "stopped working", "regression", "doesn't work any more", "lost",
  "flash", "flicker", "root cause", "bisect", "why did this break".
metadata:
  version: "1.0.0"
  tags: "debugging,regression,root-cause"
---

# Debug a Writer Regression

## The prime rule: judge the design, not just the delta

Bisecting to the commit that introduced a bug tells you **where** it broke, not **what
correct looks like**. Before proposing "restore the previous value", always ask whether
the underlying implementation is itself the right design:

- **Compare against platform conventions.** How do mature applications (desktop and
  web) handle this exact interaction? If the codebase deviates from the convention,
  the deviation — not the changed parameter — may be the real defect. Example: drag
  activation for mouse input is conventionally **distance-based** (pointer moves N px
  while pressed); a press-and-hold **delay** is the *touch* convention. A delay tuned
  for mouse is fragile at any value, because it races human motor timing.
- **Check the library's canonical recipe.** Read what the library's own docs recommend
  for the use case (e.g. dnd-kit: `MouseSensor { distance }` + `TouchSensor { delay,
  tolerance }`). If the code uses a different shape, treat that as a candidate root
  cause.
- **Ask what the mechanism must classify.** A threshold (time, distance, size) is a
  classifier over real inputs. State the input ranges explicitly (a mouse click press
  lasts ~100–150 ms; a deliberate hold is >300 ms) and check the threshold separates
  them. A threshold inside the natural range of one class is a bug even if it "works
  on my machine".

Then present **both** options when they diverge — (a) restore last-known-good, (b) fix
the underlying pattern — with trade-offs, and **always recommend the proper fix**. A
regression that a small parameter change could cause is evidence the pattern is
fragile; fix the pattern. **Refactoring effort is never a tie-breaker toward the
band-aid**: if the sound design needs a refactor, propose the refactor (scoped per
AGENTS.md — compliance refactors in their own commit). A stopgap is the **absolute
worst-case scenario** — reach for it only when the proper fix is genuinely impossible
right now (e.g. blocked on an upstream release or an unanswered stop-and-ask), label
it explicitly as a stopgap, and record the proper fix as agreed follow-up work before
proceeding.

## Debug sequence

### 1. Characterise before reading code
Write down the exact user-visible symptom: the gesture or input, the expected result,
the actual result, and when it last worked (a branch point, a commit, a release). Ask
the user if unknown. Multiple symptoms may share one cause — list them all first.

### 2. Localise the code that owns the behaviour
Trace from the surface (component, hook, route) down to the mechanism. Read the
*current* implementation fully — including wrappers above it (a broken interaction is
often swallowed by an ancestor: drag surfaces, portals, event gates), not only the
handler that "should" fire.

### 3. Bisect to the introducing change
`git log --oneline <range> -- <paths>` over the owning files; read the suspect diffs.
Confirm the mechanism, not just the correlation: explain *why* the changed lines
produce the symptom (event order, threshold, render/effect timing).

### 4. Judge the current design (prime rule above)
Run the three checks: platform convention, library recipe, classifier ranges. Record
the verdict in the findings — "parameter regression within a sound design" or "design
itself is off-convention; parameter change merely exposed it".

### 5. Explain why tests missed it
Every escaped regression is also a test-suite finding. Name the gap class explicitly
and close what is closable with the fix. Classes that hide bugs by default:

- **Config-pinning tautologies.** A test asserting `delay: 90` merely mirrors the
  code; it changes in the same commit as the bug. Assert observable behaviour, or at
  minimum treat a pinned constant as untested.
- **Instant synthetic events.** jsdom and Playwright press-and-release in ~0 ms, so
  any human-timescale threshold (hold delays, double-click windows, long-press) is
  never exercised. Timing bugs pass green everywhere headless.
- **Final-state-only assertions.** `waitFor(settled)` skips intermediate frames;
  mount → unmount → remount flashes and stale-render frames are invisible. Assert the
  state *immediately* after the triggering render when the intermediate frame is the
  contract.
- **Portal/bubbling blind spots.** React routes portal events through the component
  tree — menus and dialogs bubble into ancestor listeners (drag surfaces). Tests that
  render the child in isolation never see the interference.

### 6. Fix per the task order
Follow AGENTS.md task order: failing test first (capture the regression *and* the gap
class from step 5 where feasible), implement, run the gates. A behaviour-restoring fix
needs no spec change; a pattern change that alters documented behaviour does.

## Findings format

Present findings to the user **before editing** when the fix involves any design
choice. State per symptom: root cause (file:line, mechanism), design verdict (step 4),
candidate fixes with trade-offs, and the test gap that let it escape.

## Track this work as a todo list

Seed a todo list from the Debug sequence above — one item per step, one per symptom —
and work it top to bottom (see [AGENTS.md § "Todo tracking"](../../../AGENTS.md)). Keep
exactly one item in progress; append newly discovered symptoms or gap classes as new
items. The list is the source of truth for what remains and the backbone of any
[handover](../handover-writer-work/SKILL.md).
