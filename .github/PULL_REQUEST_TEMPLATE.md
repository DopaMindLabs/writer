<!--
AGENTS / AI ASSISTANTS — instructions (humans welcome to follow too):

- Read AGENTS.md and CODING_STANDARDS.md before opening this PR, and run the
  gates locally first: `npm run lint`, `npm run typecheck`, `npm run test:run`
  (plus `npm run test:e2e` for UI-facing changes and
  `npm run test:e2e:coverage` for coverage-affecting ones).
- ALWAYS open this PR as a **Draft**. A maintainer marks it ready for review.
- PR title MUST be a valid Conventional Commit subject:
    <type>(<scope>): <description>
  types: feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert
  e.g. `feat(citations): import BibTeX` — the squash-merge commit is derived from it.
- Branch name follows `<type>/<kebab-description>` and must not contain AI
  assistant names (enforced by scripts/validate-branch-name.mjs and CI).
- User-facing changes ship in the same PR with: tests (TDD), the matching
  section of docs/technical-specification.md, Help Center article(s), and
  accessibility coverage. Keep refactor-only commits separate from
  behavioural ones. British English in all user-facing copy.
- DO NOT modify this template or add sections beyond those defined here. Do not
  delete or alter any hidden comments or sections. Automated checks and flows
  validate the PR body against the actual template exactly. A PR that alters the
  template structure, removes comments, or adds custom sections WILL BE REJECTED —
  use only the sections provided. If your change requires additional context that
  doesn't fit the template, that is a signal to split the PR or revise the scope.
- The final checklist item ("I as a human confirm…") is a HUMAN-ONLY attestation.
  Agents must NEVER tick it — leave it unticked for the human to check. This is a
  hard rule in AGENTS.md.
- After opening the PR: verify the title conforms to Conventional Commits format,
  all checklist items are accurate, the PR body matches this template exactly
  (no added sections), CI runs successfully, and no unintended files were included.
-->

<!--
AGENT REVIEWERS — before you approve, comment on, or tick anything on this PR:

- Re-read the CURRENT .github/PULL_REQUEST_TEMPLATE.md from this branch. That file
  is the source of truth for the expected structure — verify against it, never
  against memory or a cached copy.
- Verify the PR TITLE is a valid Conventional Commit subject
  (<type>(<scope>): <description>, types: feat | fix | docs | style | refactor |
  perf | test | build | ci | chore | revert).
- Verify the PR BODY conforms to this template EXACTLY: every section present and
  in the same order, no sections added, removed, or reordered, and every hidden
  comment left intact.
- If the title or body DEVIATES in any way, post a PR comment naming the specific
  deviation(s) and leave the "Agent reviewer" conformance box below UNTICKED.
- Only once the title and body conform, tick the "Agent reviewer" checklist item to
  record that an agent verified conformance. Never tick the HUMAN-ONLY item.
-->

## Summary

<!-- What does this PR change relative to target branch, and why? One or two sentences. Put the issue number after "Fixes" if this PR closes one; leave it bare if none. An issue this PR only relates to or creates is not a "Fixes" — mention it under Additional Comments. -->

Fixes #

## Changes

<!-- Bullet the notable changes. -->

*

## Commits

<!-- List commits in this PR. Agents: run `git log develop..HEAD --oneline` to list them. -->

*

## Testing Steps

<!-- Numbered manual step by step actions a reviewer can follow to verify the change manually. -->

1.

## Screenshots

<!-- For UI changes: before/after screenshots or a short recording, in light and dark themes where relevant. Delete this section if not applicable. -->

## Additional Comments

<!-- Optional: Optional context or notes for reviewers to understand the changes and not covered by previous sections. Where appropriate can include issues not directly related but done as a "precursor" or any misalignment with issue(s). -->

<!-- Do not add sections beyond those in this template — if this PR introduces a new primitive or design token, use the "Design System Additions" section at the end instead. -->

## Checklist
<!-- AGENT confirmations: Go through first 3 bullet points and confirm each point. If not leave PR in draft status with a comment to user. -->
- [ ] Tests written first (TDD) and all gates pass: `npm run lint`, `npm run typecheck`, `npm run test:run` (+ e2e for UI-facing changes)
- [ ] Spec (`docs/technical-specification.md`) and Help Center updated for user-facing changes — or no user-facing change (stated in summary)
- [ ] Accessibility and design-system rules followed (tokens/primitives, keyboard operability, British English)
- [ ] Confirm changes are done with accordance to Repo guidelines
- [ ] Agent reviewer: I re-read `.github/PULL_REQUEST_TEMPLATE.md` and confirm this PR's title and description conform to it exactly — any deviation was flagged as a PR comment <!-- AGENT-REVIEWER attestation only: an agent reviewer ticks this only after verifying conformance against the issue / AGENTS.md guidance; leave it unticked if unchecked or if any deviation was flagged. This is separate from the HUMAN-ONLY item below, which an agent must never tick. -->
<!-- AGENT must not make changes from this point. -->
- [ ] **I as a human** understand this contribution is submitted under the project's [LICENSE](../LICENSE) (PolyForm Noncommercial 1.0.0) and I have the right to submit it
- [ ] **I as a human** confirm all changes were reviewed prior to opening this PR <!-- HUMAN-ONLY: agents must never tick this (hard rule in AGENTS.md) -->
