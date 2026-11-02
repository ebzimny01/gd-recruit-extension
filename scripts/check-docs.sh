#!/usr/bin/env bash
# Fails when extension code changed but the docs did not.
#
# Usage:
#   BASE_SHA=<sha> HEAD_SHA=<sha> PR_BODY="<text>" scripts/check-docs.sh

set -euo pipefail

CODE_PATHS='^(background\.js|manifest\.json|rules_1\.json|popup/|content/|lib/|modules/|data/)'
DOC_PATHS='^(README\.md|docs/USER_GUIDE\.md)$'
SKIP_BOX='^[[:space:]]*-[[:space:]]*\[[xX]\][[:space:]]*No docs update needed'

CHANGED=$(git diff --name-only "$BASE_SHA...$HEAD_SHA" --)

if ! grep -Eq "$CODE_PATHS" <<<"$CHANGED"; then
  echo "No extension code changed."
  exit 0
fi

if grep -Eq "$DOC_PATHS" <<<"$CHANGED"; then
  echo "Extension code and docs both changed."
  exit 0
fi

if grep -Eq "$SKIP_BOX" <<<"${PR_BODY:-}"; then
  echo "No docs update needed is ticked."
  exit 0
fi

echo "::error::Extension code changed without a docs update. Update docs/USER_GUIDE.md or README.md, or tick 'No docs update needed' in the pull request description."
exit 1
