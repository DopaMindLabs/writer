#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (ephemeral cloud sessions).
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Install repo dependencies so lint/typecheck/tests work in this session.
if [ -f package.json ]; then
  npm install --no-audit --no-fund --prefer-offline
fi

# Install the Caveman plugin from the JuliusBrussee/caveman marketplace.
# Both commands tolerate "already installed" so resume/compact don't fail the hook.
if command -v claude >/dev/null 2>&1; then
  claude plugin marketplace add JuliusBrussee/caveman </dev/null || true
  claude plugin install caveman@caveman </dev/null || true

  # Set Caveman intensity to ultra durably (level lives in the user-scope flag,
  # which is ephemeral in cloud sessions, so we write it on every start).
  printf 'ultra' > "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.caveman-active"
else
  echo "session-start: claude CLI not found; skipping Caveman plugin install" >&2
fi
