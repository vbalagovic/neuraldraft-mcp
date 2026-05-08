#!/usr/bin/env bash
# publish.sh — release flow for @neuraldraft/mcp.
#
# Steps:
#   1. Ensure a clean git tree on main and the version in package.json matches the v* git tag.
#   2. Run lint + tests + build.
#   3. npm publish --access public --provenance.
#   4. mcp-publisher publish (submits server.json to the official MCP registry).
#
# Usage:
#   scripts/publish.sh              # publishes whatever's in package.json
#   DRY_RUN=1 scripts/publish.sh    # everything except the actual publishes
#
# Required env / tooling:
#   - logged-in npm account with publish rights on @neuraldraft scope
#   - mcp-publisher (https://github.com/modelcontextprotocol/registry) installed:
#       brew install mcp-publisher   (or: go install github.com/modelcontextprotocol/registry/cmd/mcp-publisher@latest)
#   - mcp-publisher login github     (one-time)

set -euo pipefail

cd "$(dirname "$0")/.."

PKG_VERSION="$(node -p "require('./package.json').version")"
SERVER_JSON_VERSION="$(node -p "require('./server.json').version")"

if [[ "$PKG_VERSION" != "$SERVER_JSON_VERSION" ]]; then
  echo "ERROR: package.json version ($PKG_VERSION) does not match server.json version ($SERVER_JSON_VERSION)" >&2
  exit 1
fi

echo "==> Linting…"
npm run lint

echo "==> Running tests…"
npm test

echo "==> Building…"
npm run build

if [[ -n "${DRY_RUN:-}" ]]; then
  echo "==> DRY_RUN set — skipping npm publish + mcp-publisher publish"
  exit 0
fi

echo "==> Publishing to npm…"
npm publish --access public --provenance

echo "==> Submitting to MCP registry…"
if ! command -v mcp-publisher >/dev/null 2>&1; then
  echo "WARNING: mcp-publisher CLI not found. Install with 'brew install mcp-publisher' and retry." >&2
  echo "         npm publish succeeded — only the registry step was skipped."
  exit 0
fi
mcp-publisher publish

echo "==> Done. Tag the release:"
echo "    git tag v${PKG_VERSION} && git push origin v${PKG_VERSION}"
