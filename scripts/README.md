# scripts

Standalone Node scripts. Some are wired into `package.json`; the rest are run
directly with `node`, deliberately kept out of the pass/fail test runner.

## Feature tours (recorded walkthroughs)

Scripted Playwright sessions that drive the real app and write a `.webm`
screencast to `.demo-tours/` (git-ignored). They assert nothing — they exist to
show a feature working, repeatably. Same shape as the multi-device harness.

Both need the app running with a DEV build, because they use the `?reseed`
affordance to start from a known state:

```bash
npm run dev            # in another terminal
node scripts/demo-scientific.mjs
node scripts/demo-fiction.mjs
```

| Script | Tour |
|---|---|
| `demo-scientific.mjs` | Seeded research space → drafts a results section → citations: add references, sort by year, select and clear. |
| `demo-fiction.mjs` | Creates a space from the fiction template → drafts opening scenes → opens Brain Space. |

Options (both):

| Flag / env | Default | Effect |
|---|---|---|
| `--slow <ms>` / `DEMO_SLOW_MO` | `350` | Pause between actions — raise it to make the video watchable. |
| `--type-delay <ms>` / `DEMO_TYPE_DELAY` | `22` | Per-keystroke delay while typing. |
| `DEMO_URL` | `http://localhost:5173` | Target origin. |

`demo-fiction.mjs` carries **placeholder** prose: replace `SCENES` with the real
text and fill `BRAIN_NOTES` with the notes to place on the Brain Space canvas.

## Cloud

| Script | Purpose |
|---|---|
| `cloud-device-harness.mjs` | Multi-device harness against a **real** Dexie Cloud account: drives N Chromium profiles through sign-in and key acquisition, asserts each device registers, watches for sync loops, and round-trips a maximum-size attachment. Needs a live account and one-time codes, so it is not in CI. Run via `npm run cloud:harness`. `--purge` requires a typed confirmation. |
| `cloudDeviceKeyState.mjs` | Pure classifier for a signed-in device's key state (keyed / unlock / setup / error), used by the harness. Tests: `node --test scripts/cloudDeviceKeyState.test.mjs`. |
| `preview-origin.mjs` | Allow-list validator for the origins the Vercel protection-bypass secret may be sent to — the exact production hosts and the exact Vercel project+owner preview pattern, never a broad `*.vercel.app`. Used by the preview Playwright setup and the whitelist workflow. Configurable via `WRITER_VERCEL_OWNER`, `WRITER_VERCEL_PROJECT`, `WRITER_PRODUCTION_HOSTS`. Tests: `node --test scripts/preview-origin.test.mjs`. CLI: `node scripts/preview-origin.mjs <url>` prints the validated origin or exits non-zero. |

## Repository hygiene

| Script | Purpose |
|---|---|
| `coverage-ratchet.mjs` | Compares a live coverage run against the floors in `coverage-baseline.json` and only ever raises them. Run via `npm run test:e2e:coverage` / `npm run coverage:ratchet`. Never lower a floor to make CI pass. |
| `validate-branch-name.mjs` | Enforces the `<type>/<kebab-description>` branch convention on the pre-commit, pre-push and CI checks (`--warn` on post-checkout). |
| `check-commit-attribution.mjs` | Rejects commit messages and author identities that reference an AI assistant. |
