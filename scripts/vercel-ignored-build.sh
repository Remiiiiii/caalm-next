#!/usr/bin/env bash
# Vercel Ignored Build Step (vercel.json → ignoreCommand)
# Exit 0 = skip this deploy. Exit 1 = continue building.
#
# Allowed:
#   - production (production branch, usually main)
#   - Pull Request preview deployments
#   - shared staging branch `dev`
# Skipped:
#   - bare pushes to random feature branches (no open PR)

set -euo pipefail

ref="${VERCEL_GIT_COMMIT_REF:-unknown}"

if [[ "${VERCEL_ENV:-}" == "production" ]]; then
	echo "[vercel-ignore] build production ($ref)"
	exit 1
fi

if [[ -n "${VERCEL_GIT_PULL_REQUEST_ID:-}" ]]; then
	echo "[vercel-ignore] build PR #${VERCEL_GIT_PULL_REQUEST_ID} ($ref)"
	exit 1
fi

if [[ "$ref" == "dev" ]]; then
	echo "[vercel-ignore] build staging branch dev"
	exit 1
fi

echo "[vercel-ignore] skip feature branch without PR: $ref"
exit 0
