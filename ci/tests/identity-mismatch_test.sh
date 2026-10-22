#!/usr/bin/env bash
# Identity mismatch test (R5/AC8): a manifest whose identity inputs were
# tampered — different target seed, different source revision, swapped target
# id, mutated release id — must be rejected by `release_set.py verify`.

set -euo pipefail

readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BUILDER_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
readonly RELEASE_SET="$BUILDER_ROOT/build/release_set.py"
readonly WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

readonly REVISION="d1c9e0e4e1ddeb24fe8f93e56860b3765043f8b1"
readonly OTHER_REVISION="$(printf '9%.0s' {1..40})"

fail() {
  printf 'identity mismatch test: %s\n' "$*" >&2
  exit 1
}

seed_for() {
  python3 - "$1" <<'PYEOF'
import sys
print(bytes((int(sys.argv[1]) * 64 + index) % 256 for index in range(32)).hex())
PYEOF
}

# Deterministic fixtures (test-only seeds; real variants/ are never read here).
mkdir -p "$WORK_DIR/variants"
for entry in "p0:0" "p1:1" "p2:1"; do
  IFS=: read -r name lock <<<"$entry"
  seed="$(seed_for "${name#p}")"
  if [[ "$lock" == 0 ]]; then domain=null; else domain="\"example${name}.invalid\""; fi
  cat >"$WORK_DIR/variants/$name.json" <<EOF
{"variant": "$name", "domain": $domain, "product_lock": $lock,
 "description": "fixture $name", "target_seed": "$seed"}
EOF
done

git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" add variants
git -C "$WORK_DIR" -c user.name=mismatch-test -c user.email=mismatch-test@example.invalid commit -qm fixture

python3 "$RELEASE_SET" --repo-root "$WORK_DIR" manifest \
  --source-revision "$REVISION" --output "$WORK_DIR/good.json"
RELEASE_ID="$(jq -r '.release_id' "$WORK_DIR/good.json")"
TARGET_A="$(jq -r '.targets[0].target_id' "$WORK_DIR/good.json")"

# Any verify invocation against the good manifest must succeed.
python3 "$RELEASE_SET" --repo-root "$WORK_DIR" verify \
  --source-revision "$REVISION" \
  --manifest "$WORK_DIR/good.json" \
  --release-id "$RELEASE_ID" \
  --target-id "$TARGET_A" ||
  fail "the untampered manifest must verify"

assert_verify_fails() {
  local label="$1"
  shift
  if python3 "$RELEASE_SET" --repo-root "$WORK_DIR" verify \
      --source-revision "$REVISION" --manifest "$WORK_DIR/tampered.json" \
      "$@" >/dev/null 2>&1; then
    fail "verify accepted a tampered manifest: $label"
  fi
  rm -f "$WORK_DIR/tampered.json"
}

# --- tamper 1: a target built from a DIFFERENT seed --------------------------
TAMPERED_SEED="$(seed_for 9)"
TAMPERED_TARGET="$(python3 - "$REVISION" "$TAMPERED_SEED" <<'PYEOF'
import hashlib, sys
revision, seed = sys.argv[1], sys.argv[2]
digest = hashlib.sha256(
    b"lo-release-target-v1" + b"\0" + revision.encode("ascii") + b"\0" + bytes.fromhex(seed)
).hexdigest()
sys.stdout.write("target-v1-" + digest)
PYEOF
)"
jq --arg bad "$TAMPERED_TARGET" \
  '.targets[0].target_id = $bad' "$WORK_DIR/good.json" >"$WORK_DIR/tampered.json"
assert_verify_fails "target derived from a wrong seed"

# --- tamper 2: different source revision -------------------------------------
jq --arg rev "$OTHER_REVISION" '.source_revision = $rev' \
  "$WORK_DIR/good.json" >"$WORK_DIR/tampered.json"
assert_verify_fails "foreign source revision"

# --- tamper 3: mutated release_id (identity no longer matches content) -------
jq --arg rid "release-v1-$(printf '0%.0s' {1..64})" \
  '.release_id = $rid' "$WORK_DIR/good.json" >"$WORK_DIR/tampered.json"
assert_verify_fails "mutated release_id"

# --- tamper 4: swapped target_id (valid format, wrong derivation) ------------
jq --arg tid "target-v1-$(printf '1%.0s' {1..64})" \
  '.targets[0].target_id = $tid' "$WORK_DIR/good.json" >"$WORK_DIR/tampered.json"
assert_verify_fails "swapped target_id"

# --- tamper 5: unknown target id for a known release -------------------------
if python3 "$RELEASE_SET" --repo-root "$WORK_DIR" verify \
    --source-revision "$REVISION" \
    --manifest "$WORK_DIR/good.json" \
    --release-id "$RELEASE_ID" \
    --target-id "target-v1-$(printf '2%.0s' {1..64})" >/dev/null 2>&1; then
  fail "verify accepted an unknown target_id"
fi

# --- tamper 6: unknown release id for a known revision -----------------------
if python3 "$RELEASE_SET" --repo-root "$WORK_DIR" verify \
    --source-revision "$REVISION" \
    --manifest "$WORK_DIR/good.json" \
    --release-id "release-v1-$(printf '3%.0s' {1..64})" >/dev/null 2>&1; then
  fail "verify accepted an unknown release_id"
fi

printf 'identity mismatch tests passed\n'
