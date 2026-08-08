# writer-sync pre-beta fix runbook

Everything for landing the pre-beta review of `fix/writer-sync-fixes` → `develop`: the actionable fix runbook, the findings report, the full per-finding log, and the raw reviewer output. Review date 2026-08-06/08; whole-codebase review across 11 dimensions, every finding independently verified.

## Start here

| File | What it is |
|---|---|
| [`RUNBOOK.md`](./RUNBOOK.md) | **The actionable runbook** — ordered fix plan for the 6 blockers, the parked Opus 5 re-verify, the highs, gates, and a definition-of-done. Follow the repo task order per item. |
| [`REPORT.md`](./REPORT.md) | Findings report — verdict, gates, blockers, Part A (this branch) / Part B (pre-existing), inconsistencies, British-English sweep. |
| [`findings-log.md`](./findings-log.md) | Full per-dimension log: every confirmed finding with `file:line`, every refuted finding with the reason, severity/origin corrections. |
| [`raw/wf-*.json`](./raw/) | Raw finder output (pre-verification) for the six code/security dimensions. Verdicts that overrode these are in `findings-log.md`. |

## At a glance

- **6 blockers** (5 static + 1 runtime repro: image bytes don't sync A→B). See `RUNBOOK.md` §Blockers.
- **Crypto-pairing:** re-verified on Opus 5 (2026-08-08). Five confirmed findings stand; one refutation (frame-ingestion re-verify cost) was overturned to a confirmed LOW.
- **Gates:** lint / typecheck / unit pass; `npm audit` 7 vulns (5 high); targeted e2e not yet run.
- **Method & scope:** every finding tagged `diff` (this branch) or `pre-existing`; pre-existing items ship in the beta and are reported because there is no separate review on `develop`.

## Needs a human decision

- **B3** (passphrase-unlock cloud convergence) and the **British help-slug rename** (vs AGENTS.md "never rename slugs") need a product decision — recorded in `RUNBOOK.md`.
- **B6** root cause is a strong hypothesis, not yet runtime-confirmed — `RUNBOOK.md` gives the confirm-first steps.
