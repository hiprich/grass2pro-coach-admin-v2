#!/usr/bin/env bash
# Stage all changes, commit, and push the current branch to origin.
# Refuses to run on `main` (ship via PR from a feature branch).
#
#   npm run git:save -- "Your commit message"
#   npm run git:ship -- "Your commit message"   # runs lint + build first
#
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

verify=false
if [ "${1:-}" = "--verify" ]; then
  verify=true
  shift
fi

msg="${*:-}"
if [ -z "${msg// }" ]; then
  echo "Usage: npm run git:save -- \"Your commit message\"" >&2
  echo "       npm run git:ship -- \"Your commit message\"   # runs lint + build first" >&2
  exit 1
fi

branch="$(git branch --show-current)"
if [ "$branch" = "main" ]; then
  echo "git-save-push: refusing to commit on main. Use a feature branch, then open a PR." >&2
  exit 1
fi

if [ "$verify" = true ]; then
  npm run lint
  npm run build
fi

git add -A
if git diff --cached --quiet; then
  echo "git-save-push: nothing to commit (no changes)." >&2
  exit 0
fi

git commit -m "$msg"

if git rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1; then
  git push
else
  git push -u origin "$branch"
fi

echo "git-save-push: pushed $branch to origin."
