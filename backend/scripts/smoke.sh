#!/usr/bin/env bash
set -euo pipefail

BASE="${SMOKE_BASE_URL:-http://127.0.0.1:4000}"
BASE="${BASE%/}"

curl -fsS "$BASE/api/health" | grep -q ok

gql_post() {
  local body="$1"
  local auth="${2:-}"
  if [ -n "$auth" ]; then
    curl -fsS -X POST "$BASE/api/graphql" \
      -H 'content-type: application/json' \
      -H "authorization: Bearer $auth" \
      -d "$body"
  else
    curl -fsS -X POST "$BASE/api/graphql" \
      -H 'content-type: application/json' \
      -d "$body"
  fi
}

resp="$(gql_post '{"query":"{ health }"}')"
echo "$resp" | grep -q '"health"'

resp="$(gql_post '{"query":"{ appCustomization { convertPdfToEpub siteName } }"}')"
echo "$resp" | grep -q 'appCustomization'

resp="$(curl -fsS "$BASE/api/files/health")"
echo "$resp" | grep -q '"status"'

resp="$(curl -fsS "$BASE/api/auth/bootstrap")"
echo "$resp" | grep -q 'needsFirstUser'

if echo "$resp" | grep -q '"needsFirstUser":true'; then
  reg="$(curl -fsS -X POST "$BASE/api/auth/register" \
    -H 'content-type: application/json' \
    -d '{"username":"smoke_ci","password":"smoke-ci-password-32-chars-min!!"}')"
  echo "$reg" | grep -q '"token"'
  token="$(printf '%s' "$reg" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
else
  login="$(curl -fsS -X POST "$BASE/api/auth/login" \
    -H 'content-type: application/json' \
    -d '{"username":"admin","password":"nookline"}')"
  token="$(printf '%s' "$login" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
fi

if [ -z "${token:-}" ]; then
  echo "smoke failed: no auth token" >&2
  exit 1
fi

resp="$(gql_post '{"query":"{ me { username } libraries { id name } }"}' "$token")"
echo "$resp" | grep -q '"me"'

echo "smoke ok: $BASE"