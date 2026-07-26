# Architecture decision records — reference branch

This branch holds the decision records for Writer. They are deliberately **not**
on the working branches: the repository carries the rules, not the deliberation
behind them. Nothing on a feature branch links here, and nothing here is a rule —
if a record and `AGENTS.md` disagree, `AGENTS.md` wins.

Keep them here for the reasoning and the measurements, which are otherwise lost
once a decision is folded into a one-line rule.

| ADR | Decision |
|---|---|
| [0001](./0001-qr-encoding-and-scanning-dependencies.md) | QR generation and scanning dependencies — `uqr` and `barcode-detector`, behind the `writer-qr` facade |
| [0002](./0002-single-dexie-schema-version.md) | A single declared Dexie schema version |

To add one, branch from this branch, add the file, and merge back here — never
into a working branch.
