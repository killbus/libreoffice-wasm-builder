#!/usr/bin/env bash
# Negative publish test (R7/AC7 builder face): a prod-role (locked p1/p2)
# publication attempt that carries the private source repository must fail
# non-zero — prod never publishes to the source-private dev channel and the
# private source repository is only ever valid for dev publication. The dev
# role passes with mocks (proving the harness itself is sound).

set -euo pipefail

readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROMOTION="$TEST_DIR/../promote-accepted-build.sh"
readonly WORK_DIR="$(mktemp -d)"
readonly MOCK_BIN="$WORK_DIR/bin"
trap 'rm -rf "$WORK_DIR"' EXIT

readonly RUN_ID="555111"
readonly RUN_ATTEMPT="1"
readonly SOURCE_SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
readonly BUILDER_SHA="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
readonly LO_SHA="cccccccccccccccccccccccccccccccccccccccc"

fail() {
  printf 'negative publish test: %s\n' "$*" >&2
  exit 1
}

create_mock_commands() {
  mkdir -p "$MOCK_BIN"

  cat >"$MOCK_BIN/git" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "branch" && "${2:-}" == "--show-current" ]]; then
  printf '%s\n' "$MOCK_BRANCH"
elif [[ "${1:-}" == "status" && "${2:-}" == "--porcelain" ]]; then
  exit 0
elif [[ "${1:-}" == "commit" ]]; then
  cat >/dev/null
fi
EOF

  cat >"$MOCK_BIN/gh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "api" ]]; then
  printf '%s %s\n' "$MOCK_RUN_ID" "$MOCK_RUN_ATTEMPT"
elif [[ "${1:-}" == "release" && "${2:-}" == "create" ]]; then
  :
fi
EOF

  cat >"$MOCK_BIN/zip" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
for arg in "$@"; do
  case "$arg" in
    -*) ;;
    .) ;;
    *) : > "$arg"; break ;;
  esac
done
exit 0
EOF

  chmod +x "$MOCK_BIN/git" "$MOCK_BIN/gh" "$MOCK_BIN/zip"
}

create_payload() {
  local output_dir="$1" target_id="$2" build_role="$3"
  mkdir -p "$output_dir/wasm" "$output_dir/dist"
  printf 'candidate readme\n' >"$output_dir/README.md"
  printf 'wasm\n' >"$output_dir/wasm/soffice.wasm"
  printf 'cjs glue\n' >"$output_dir/wasm/soffice.cjs"
  printf 'js glue\n' >"$output_dir/wasm/soffice.js"
  printf 'data\n' >"$output_dir/wasm/soffice.data"
  printf 'loader\n' >"$output_dir/wasm/loader.cjs"
  printf 'esm\n' >"$output_dir/dist/browser.js"
  cat >"$output_dir/package.json" <<'EOF'
{
  "name": "lo-wasm",
  "version": "0.0.0",
  "description": "LO WASM",
  "repository": { "url": "https://example.invalid/source" },
  "homepage": "https://example.invalid",
  "bugs": { "url": "https://example.invalid/issues" },
  "files": [ "dist", "README.md" ],
  "scripts": { "prepack": "node scripts/build-package.mjs --silent" }
}
EOF
  # Accepted manifest in the promote script's accepted shape.
  jq -n \
    --arg target_id "$target_id" \
    --arg build_role "$build_role" \
    --arg builder_sha "$BUILDER_SHA" \
    --arg source_revision "$SOURCE_SHA" \
    --arg lo_sha "$LO_SHA" \
    '{
      artifact_status: "accepted",
      release_id: "release-v1-8888888888888888888888888888888888888888888888888888888888888888",
      target_id: $target_id,
      build_role: $build_role,
      build_timestamp: "2026-10-20T00:00:00Z",
      builder_sha: $builder_sha,
      source_revision: $source_revision,
      lo_source_sha: $lo_sha,
      focused_embedder_test: {
        filter: "LokNoPthreadRuntimeContract.SingleProfileNoWorkerSidecar",
        status: "passed"
      }
    }' >"$output_dir/accepted.json"
}

prepare_release() {
  local case_dir="$1" target_id="$2" build_role="$3" branch="$4"
  mkdir -p "$case_dir"
  printf 'builder readme\n' >"$case_dir/README.md"
  create_payload "$case_dir/artifacts" "$target_id" "$build_role"
  (
    cd "$case_dir"
    env -u GH_TOKEN -u SSH_AUTH_SOCK \
      PATH="$MOCK_BIN:$PATH" \
      MOCK_BRANCH="$branch" \
      MOCK_RUN_ID="$RUN_ID" \
      MOCK_RUN_ATTEMPT="$RUN_ATTEMPT" \
      "$PROMOTION" prepare \
        --artifact-dir artifacts \
        --accepted-manifest artifacts/accepted.json \
        --output-dir prepared \
        --build-role "$build_role" \
        --target-id "$target_id" \
        --repository owner/builder >/dev/null
  )
}

# Opaque target identities (never variant names).
PROD_TARGET="target-v1-$(printf 'd%.0s' {1..64})"
DEV_TARGET="target-v1-$(printf 'e%.0s' {1..64})"

create_mock_commands

# --- negative 1: prod-role publish carrying --source-repository fails --------
prepare_release "$WORK_DIR/prod" "$PROD_TARGET" prod "release/$PROD_TARGET"
if (
  cd "$WORK_DIR/prod"
  env PATH="$MOCK_BIN:$PATH" GH_TOKEN="test-token" \
    MOCK_BRANCH="release/$PROD_TARGET" \
    MOCK_RUN_ID="$RUN_ID" MOCK_RUN_ATTEMPT="$RUN_ATTEMPT" \
    "$PROMOTION" publish \
      --release-dir prepared \
      --accepted-manifest artifacts/accepted.json \
      --build-role prod \
      --target-id "$PROD_TARGET" \
      --repository owner/builder \
      --source-repository owner/source \
      --workflow-id 12345 \
      --workflow-run-id "$RUN_ID" \
      --workflow-run-attempt "$RUN_ATTEMPT" >/dev/null 2>&1
); then
  fail "prod publication accepted the private source repository"
fi

# --- negative 2: prod-role publish without it still must not push to the
#     source-private dev channel (branch is the public target branch) ----------
(
  cd "$WORK_DIR/prod"
  env PATH="$MOCK_BIN:$PATH" GH_TOKEN="test-token" \
    MOCK_BRANCH="release/$PROD_TARGET" \
    MOCK_RUN_ID="$RUN_ID" MOCK_RUN_ATTEMPT="$RUN_ATTEMPT" \
    "$PROMOTION" publish \
      --release-dir prepared \
      --accepted-manifest artifacts/accepted.json \
      --build-role prod \
      --target-id "$PROD_TARGET" \
      --repository owner/builder \
      --workflow-id 12345 \
      --workflow-run-id "$RUN_ID" \
      --workflow-run-attempt "$RUN_ATTEMPT" >/dev/null 2>&1
) || fail "prod publication without source repository failed unexpectedly"

# --- positive control: dev-role publish passes (with mocked push) ------------
prepare_release "$WORK_DIR/dev" "$DEV_TARGET" dev "release-dev"
(
  cd "$WORK_DIR/dev"
  env PATH="$MOCK_BIN:$PATH" GH_TOKEN="test-token" SOURCE_RELEASE_TOKEN="source-test-token" SSH_AUTH_SOCK="/nonexistent" \
    MOCK_BRANCH="release-dev" \
    MOCK_RUN_ID="$RUN_ID" MOCK_RUN_ATTEMPT="$RUN_ATTEMPT" \
    "$PROMOTION" publish \
      --release-dir prepared \
      --accepted-manifest artifacts/accepted.json \
      --build-role dev \
      --target-id "$DEV_TARGET" \
      --repository owner/builder \
      --source-repository owner/source \
      --workflow-id 12345 \
      --workflow-run-id "$RUN_ID" \
      --workflow-run-attempt "$RUN_ATTEMPT" >/dev/null
) || fail "dev publication failed under the mock harness"

# --- negative 3: dev-role publish without --source-repository fails ----------
if (
  cd "$WORK_DIR/dev"
  env PATH="$MOCK_BIN:$PATH" GH_TOKEN="test-token" \
    MOCK_BRANCH="release-dev" \
    MOCK_RUN_ID="$RUN_ID" MOCK_RUN_ATTEMPT="$RUN_ATTEMPT" \
    "$PROMOTION" publish \
      --release-dir prepared \
      --accepted-manifest artifacts/accepted.json \
      --build-role dev \
      --target-id "$DEV_TARGET" \
      --repository owner/builder \
      --workflow-id 12345 \
      --workflow-run-id "$RUN_ID" \
      --workflow-run-attempt "$RUN_ATTEMPT" >/dev/null 2>&1
); then
  fail "dev publication accepted a missing private source repository"
fi

printf 'negative publish tests passed\n'
