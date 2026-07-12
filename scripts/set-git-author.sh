#!/usr/bin/env bash
#
# Set Shavindra as the git author *and* committer for this repository,
# using a no-reply email address so the real inbox stays private.
#
# Usage:
#   ./scripts/set-git-author.sh            # apply to this repo only (default)
#   ./scripts/set-git-author.sh --global   # apply to the global git config

set -euo pipefail

NAME="Shavindra"
EMAIL="shavindra@users.noreply.github.com"

SCOPE="--local"
if [[ "${1:-}" == "--global" ]]; then
  SCOPE="--global"
fi

# Author identity (who wrote the change)
git config "$SCOPE" user.name "$NAME"
git config "$SCOPE" user.email "$EMAIL"

# Committer identity (who committed it). Git normally derives the committer
# from user.name/user.email above, but these env vars are exported here so
# any tooling in the same shell session records the same identity explicitly.
export GIT_AUTHOR_NAME="$NAME"
export GIT_AUTHOR_EMAIL="$EMAIL"
export GIT_COMMITTER_NAME="$NAME"
export GIT_COMMITTER_EMAIL="$EMAIL"

echo "Git author/committer set (${SCOPE#--}):"
echo "  name:  $NAME"
echo "  email: $EMAIL"
