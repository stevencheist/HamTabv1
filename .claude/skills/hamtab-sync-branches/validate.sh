#!/usr/bin/env bash
# Post-merge validation for HamTabV1 deployment branches.
# Encodes CLAUDE.md §Branch Sync Protocol "Post-merge validation".
#
# Two severities:
#   BLOCKERS (exit 1) — unambiguous; NEVER push: syntax error, missing @cloudflare/containers.
#   WARNINGS (exit 0) — need judgment before pushing: duplicate section headers, root *.js not
#                       in the Dockerfile COPY list. The caller (Claude) must resolve or
#                       consciously accept each warning before `git push`.
#
# Usage: bash .claude/skills/hamtab-sync-branches/validate.sh <branch>
#   <branch> = lanmode | hostedmode  (drives the hostedmode-only checks)

set -u
branch="${1:-}"
block=0
warn=0
ok()    { printf '✓ %s\n' "$1"; }
fail()  { printf '✗ BLOCK: %s\n' "$1"; block=1; }
warng() { printf '! WARN: %s\n' "$1"; warn=1; }

echo "== HamTabV1 post-merge validation (branch: ${branch:-unknown}) =="

# 1. Syntax check (BLOCKER) — catches duplicate declarations / missing brackets.
#    This is the exact guard that would have stopped the 2026-02-06 outage.
if node -c server.js 2>/tmp/hamtab-nodec.err; then
  ok "node -c server.js — syntax OK"
else
  fail "node -c server.js failed:"; sed 's/^/    /' /tmp/hamtab-nodec.err
fi

# 2. @cloudflare/containers (BLOCKER, hostedmode only) — git can silently drop it when main
#    edits the dependencies block. Missing => container build/runtime breakage.
if [ "$branch" = "hostedmode" ]; then
  if grep -q '@cloudflare/containers' package.json; then
    ok "@cloudflare/containers present in package.json"
  else
    fail "@cloudflare/containers MISSING — npm install @cloudflare/containers, commit, re-run"
  fi
fi

# 3. Duplicate '// ---' section headers (WARNING) — a merge that duplicates a block reprints its
#    header. NOTE: some duplicates are legitimate on main (e.g. '// --- Routers ---'); the real
#    danger (duplicate declarations) is already caught by check #1. Review any NEW duplicates.
dupes=$(grep -n '^// ---' server.js | sed 's/^[0-9]*://' | sort | uniq -d)
if [ -z "$dupes" ]; then
  ok "no duplicate '// ---' section headers in server.js"
else
  warng "duplicate section headers in server.js — confirm none are merge artifacts:"
  printf '%s\n' "$dupes" | sed 's/^/    /'
fi

# 4. Dockerfile COPY vs root *.js (WARNING) — every RUNTIME .js must be copied (missing =>
#    MODULE_NOT_FOUND in the container). Dev-only utilities (keygen, decrypt CLI) are NOT runtime
#    deps and are expected here — judge each. esbuild.mjs is build-only (stage 1 COPY . .).
if [ -f Dockerfile ]; then
  notcopied=$(comm -23 \
    <(ls *.js 2>/dev/null | grep -v '^esbuild' | sort) \
    <(grep 'COPY' Dockerfile | grep -oE '[A-Za-z0-9_-]+\.js' | sort -u))
  if [ -z "$notcopied" ]; then
    ok "Dockerfile COPY list covers all root *.js"
  else
    warng "root *.js NOT in Dockerfile COPY — add any that server.js requires at runtime:"
    printf '%s\n' "$notcopied" | sed 's/^/    /'
  fi
fi

echo
if [ "$block" -eq 1 ]; then
  echo "RESULT: BLOCKED — DO NOT PUSH. Fix on '$branch', then re-run this script."
  exit 1
elif [ "$warn" -eq 1 ]; then
  echo "RESULT: PASS WITH WARNINGS — resolve or consciously accept each WARN above before pushing."
  exit 0
else
  echo "RESULT: PASS — safe to push."
  exit 0
fi
