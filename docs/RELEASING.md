# Releasing

How releases work in this repo and what to do when things go sideways.

## Branch model

- `develop` — integration branch. All feature PRs target this.
- `main` — only ever updated by merging `develop → main`. Every commit on `main` is a release candidate.

**Merge strategy matters:**

| From → To | Strategy | Why |
|---|---|---|
| feature → `develop` | **Squash** | One conventional commit per PR. PR title becomes the commit message, so it must follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat: ...`, `fix: ...`). |
| `develop` → `main` | **Merge commit** (not squash) | Preserves the individual conventional commits so release-please can compute the version bump correctly. |

## Workflows at a glance

Three workflows handle deployment. They have single, non-overlapping purposes.

| Workflow | File | Trigger | Use when |
|---|---|---|---|
| **Release** | [release.yml](../.github/workflows/release.yml) | Push to `main` | You're creating a release branch for a new version. Not manually runnable. |
| **Deploy from tag** | [deploy.yml](../.github/workflows/deploy.yml) | Manual (`workflow_dispatch`) | You need to rebuild and republish an existing tag (e.g. Pages got corrupted, infra change). |
| **Rollback** | [rollback.yml](../.github/workflows/rollback.yml) | Manual (`workflow_dispatch`) | You need to revert Pages to a previous tag's archived build, without rebuilding. |

## Creating a release branch

1. Make sure `develop` is green ([Tests workflow](../.github/workflows/e2e.yml) passing).
2. Open a PR from `develop` → `main`. **Use a merge commit**, not squash.
3. Merging that PR pushes to `main` and triggers [release.yml](../.github/workflows/release.yml):
   - The `validate` job runs typecheck + build.
   - The `release-please` job inspects conventional commits since the last release and opens (or updates) a **release PR** with the version bump and changelog. **No deploy yet.**
4. Review the release PR. The changelog and version should match what you expect.
5. Merge the release PR. This creates the git tag and GitHub release, and triggers the `deploy` job, which builds from the tag and publishes to GitHub Pages.

The deploy job uploads the built `dist-vX.Y.Z.tar.gz` as a release asset — keep this around, the rollback workflow relies on it.

## Redeploying an existing tag

Use this when Pages is broken but the *artifact* is fine and you want a fresh build from the same source.

1. Go to **Actions → Deploy from tag → Run workflow**.
2. Enter the tag (e.g. `v0.4.2`).
3. Run.

This checks out the tag, rebuilds, and republishes to Pages. It does **not** touch the release or the tag itself.

## Rolling back to a previous release

Use this when a release is bad and you want to restore the last known good build immediately. This is faster than "Deploy from tag" because it doesn't rebuild — it just unpacks the archived `dist-*.tar.gz` from the release assets.

1. Find the tag you want to roll back to. **Actions → Rollback to previous release → Run workflow** with `list_only: true` shows recent tags.
2. Re-run with `version: vX.Y.Z` (and `list_only: false`).

After rollback, fix the broken release on a branch, merge through `develop → main` as normal. Don't try to delete or amend the bad tag — leave it as a record.

## Common gotchas

- **Release PR didn't bump the version, or didn't appear.** Release-please only reacts to conventional commits (`feat:`, `fix:`, `feat!:`, `BREAKING CHANGE:` footer, etc.). If the `develop → main` PR was squashed instead of merge-committed, all the conventional commits collapsed into one — and if that one isn't conventional, release-please ignores it. Recover by pushing a `chore: trigger release` empty commit on `main`, or fix the merge strategy and redo.
- **Pages deploy failed mid-release.** The tag exists but Pages is stale. Use "Deploy from tag" with that tag to retry, or "Rollback" to a known good one.
- **`develop` and `main` have diverged unexpectedly.** Don't force-push `main`. Merge `main` back into `develop` first, then proceed normally.
- **Two release PRs open.** Shouldn't happen, but if it does, close the older one — release-please always works from the latest commits on `main`.

## What *not* to do

- Don't push directly to `main`. The only commits on `main` should be `develop → main` merges and release-please's release commits.
- Don't force-push to `main` or rewrite release tags. The rollback workflow assumes tags and their attached artifacts are immutable.
- Don't squash `develop → main`. See the table above.
- Don't manually edit `CHANGELOG.md` or `.release-please-manifest.json` — release-please owns these.
