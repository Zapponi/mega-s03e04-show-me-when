#!/bin/sh
# Run the pinned wrangler (4.149.0) against Giovanni's personal Cloudflare account, never the Mahta one
# set in the Windows environment (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN). Auth: wrangler OAuth.
# The account id lives in the git-ignored .challenge/cf-account-id.
# Usage (Git Bash): sh scripts/wr.sh <wrangler args>     e.g. sh scripts/wr.sh deploy
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACCOUNT="$(tr -d '\r\n' < "$ROOT/.challenge/cf-account-id")" || exit 1
cd "$ROOT" || exit 1
exec env -u CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID="$ACCOUNT" "$ROOT/node_modules/.bin/wrangler" "$@"
