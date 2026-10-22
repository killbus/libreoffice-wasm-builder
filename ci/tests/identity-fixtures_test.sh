#!/usr/bin/env bash
# Release-set identity test (R5/AC8): hand-computed SHA-256 identity fixtures.
# target_id and release_id derivations are recomputed here with openssl/sha256sum
# from the domain-separated spec and compared byte-for-byte against the ported
# release_set.py output. Also covers canonical-JSON byte exactness, seed
# unicity, and seed-diversity rejection.

set -euo pipefail

readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BUILDER_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
readonly RELEASE_SET="$BUILDER_ROOT/build/release_set.py"
readonly WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

readonly REVISION="d1c9e0e4e1ddeb24fe8f93e56860b3765043f8b1"

fail() {
  printf 'identity fixtures test: %s\n' "$*" >&2
  exit 1
}

# Recompute target_id exactly per the spec:
#   "target-v1-" + hex(SHA-256(b"lo-release-target-v1" + NUL + source_revision
#                             + NUL + raw_32_byte_seed))
hand_target_id() {
  local revision="$1" seed="$2"
  python3 - "$revision" "$seed" <<'PYEOF'
import hashlib, sys
revision, seed = sys.argv[1], sys.argv[2]
digest = hashlib.sha256(
    b"lo-release-target-v1" + b"\0" + revision.encode("ascii") + b"\0" + bytes.fromhex(seed)
).hexdigest()
sys.stdout.write("target-v1-" + digest + "\n")
PYEOF
}

# Recompute release_id exactly per the spec:
#   "release-v1-" + hex(SHA-256(b"lo-release-set-v1" + NUL + canonical_json))
# canonical_json is produced with python (sorted keys, no spaces, ASCII) —
# the same rules release_set.py uses, but computed independently here.
hand_release_id() {
  local canonical="$1"
  {
    printf 'lo-release-set-v1\0'
    printf '%s' "$canonical"
  } | sha256sum | awk '{print "release-v1-" $1}'
}

# Deterministic test seeds: 32 distinct bytes each, offset by variant index.
# These are TEST-ONLY seeds; the real variants/ are never read or printed here.
seed_for() {
  python3 - "$1" <<'PYEOF'
import sys
print(bytes((int(sys.argv[1]) * 64 + i) % 256 for i in range(32)).hex())
PYEOF
}

SEED_P0="$(seed_for 0)"
SEED_P1="$(seed_for 1)"
SEED_P2="$(seed_for 2)"

# --- fixture 1: target_id derivation (hand-computed vs release_set.py) -------
mkdir -p "$WORK_DIR/variants"
for entry in "p0:0:$SEED_P0" "p1:1:$SEED_P1" "p2:1:$SEED_P2"; do
  IFS=: read -r name lock seed <<<"$entry"
  if [[ "$lock" == 0 ]]; then domain=null; else domain="\"example${name}.invalid\""; fi
  cat >"$WORK_DIR/variants/$name.json" <<EOF
{"variant": "$name", "domain": $domain, "product_lock": $lock,
 "description": "fixture $name", "target_seed": "$seed"}
EOF
done

# Pin the working tree via a throwaway Git repo so committed_variant_paths
# reads the fixtures from the committed tree at HEAD (deviation 1b).
git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" add variants
git -C "$WORK_DIR" -c user.name=identity-test -c user.email=identity-test@example.invalid commit -qm fixture

python3 "$RELEASE_SET" --repo-root "$WORK_DIR" manifest \
  --source-revision "$REVISION" --output "$WORK_DIR/manifest.json"

# Every emitted target_id must equal the hand-computed identity for the
# corresponding test seed.
for entry in "p0:$SEED_P0" "p1:$SEED_P1" "p2:$SEED_P2"; do
  IFS=: read -r name seed <<<"$entry"
  expected="$(hand_target_id "$REVISION" "$seed")"
  if ! jq -e --arg expected "$expected" \
    '.targets | map(.target_id) | index($expected) != null' \
    "$WORK_DIR/manifest.json" >/dev/null; then
    fail "target_id for fixture variant $name does not match the hand-computed SHA-256 fixture"
  fi
done

# --- fixture 2: release_id derivation ----------------------------------------
# Independently recompute the canonical projection: 4-key manifest minus
# release_id, keys sorted, no whitespace, targets already sorted by target_id.
CANONICAL="$(python3 - "$WORK_DIR/manifest.json" <<'PYEOF'
import json, sys
manifest = json.load(open(sys.argv[1], encoding="utf-8"))
projection = {k: manifest[k] for k in ("schema_version", "source_revision", "targets")}
print(json.dumps(projection, ensure_ascii=True, separators=(",", ":"), sort_keys=True))
PYEOF
)"
EXPECTED_RELEASE_ID="$(hand_release_id "$CANONICAL")"
ACTUAL_RELEASE_ID="$(jq -r '.release_id' "$WORK_DIR/manifest.json")"
[[ "$ACTUAL_RELEASE_ID" == "$EXPECTED_RELEASE_ID" ]] ||
  fail "release_id does not match the hand-computed domain-separated SHA-256 fixture"

# --- fixture 3: canonical JSON byte exactness --------------------------------
# canonical_json(v) must be: sorted keys, separators (",", ":"), ASCII-escaped,
# no trailing newline in the hashed bytes. Re-encoding through an independent
# path must produce identical bytes.
python3 "$RELEASE_SET" --repo-root "$WORK_DIR" manifest \
  --source-revision "$REVISION" --output - >"$WORK_DIR/manifest-2.json"
cmp "$WORK_DIR/manifest.json" "$WORK_DIR/manifest-2.json" ||
  fail "manifest emission is not byte-deterministic"
# The stored file carries exactly one trailing newline; the hashed projection
# has none (checked implicitly by the release_id fixture above).
[[ "$(tail -c 1 "$WORK_DIR/manifest.json" | od -An -tx1 | tr -d ' \n')" == "0a" ]] ||
  fail "manifest file must end with a single newline"
[[ "$(grep -c $'\n' "$WORK_DIR/manifest.json")" == 1 ]] ||
  fail "canonical manifest must be a single line"

# --- negative: duplicate seeds fail closed -----------------------------------
cp "$WORK_DIR/variants/p1.json" "$WORK_DIR/variants/p1.json.bak"
python3 - "$WORK_DIR" <<'PYEOF'
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
seed = json.loads((root / "variants/p0.json").read_text())["target_seed"]
path = root / "variants/p1.json"
config = json.loads(path.read_text())
config["target_seed"] = seed
path.write_text(json.dumps(config))
PYEOF
git -C "$WORK_DIR" add variants
git -C "$WORK_DIR" -c user.name=identity-test -c user.email=identity-test@example.invalid commit -qm duplicate
if python3 "$RELEASE_SET" --repo-root "$WORK_DIR" manifest \
    --source-revision "$REVISION" --output "$WORK_DIR/dup.json" 2>/dev/null; then
  fail "duplicate seeds across the release set must be rejected"
fi
rm -f "$WORK_DIR/dup.json"
mv "$WORK_DIR/variants/p1.json.bak" "$WORK_DIR/variants/p1.json"

# --- negative: low-diversity seed fails closed --------------------------------
LOW_DIVERSITY_SEED="$(python3 -c 'print(("ab" * 32))')"
if [[ "$(python3 -c 'print(len(set(bytes.fromhex("'"$LOW_DIVERSITY_SEED"'"))))')" -ge 16 ]]; then
  fail "test fixture seed is not actually low-diversity"
fi
python3 - "$WORK_DIR" "$LOW_DIVERSITY_SEED" <<'PYEOF'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1]) / "variants/p1.json"
config = json.loads(path.read_text())
config["target_seed"] = sys.argv[2]
path.write_text(json.dumps(config))
PYEOF
git -C "$WORK_DIR" add variants
git -C "$WORK_DIR" -c user.name=identity-test -c user.email=identity-test@example.invalid commit -qm lowdiv
if python3 "$RELEASE_SET" --repo-root "$WORK_DIR" manifest \
    --source-revision "$REVISION" --output "$WORK_DIR/lowdiv.json" 2>/dev/null; then
  fail "a seed with fewer than 16 distinct bytes must be rejected"
fi
rm -f "$WORK_DIR/lowdiv.json"

# --- negative: identity must change with seed and revision --------------------
SEED_P1_ROTATED="$(seed_for 7)"
python3 - "$WORK_DIR" "$SEED_P1_ROTATED" <<'PYEOF'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1]) / "variants/p1.json"
config = json.loads(path.read_text())
config["target_seed"] = sys.argv[2]
path.write_text(json.dumps(config))
PYEOF
git -C "$WORK_DIR" add variants
git -C "$WORK_DIR" -c user.name=identity-test -c user.email=identity-test@example.invalid commit -qm rotate
python3 "$RELEASE_SET" --repo-root "$WORK_DIR" manifest \
  --source-revision "$REVISION" --output "$WORK_DIR/manifest-rotated.json"
[[ "$ACTUAL_RELEASE_ID" != "$(jq -r '.release_id' "$WORK_DIR/manifest-rotated.json")" ]] ||
  fail "rotating a seed must rotate the release identity"
EXPECTED_P1_ROTATED="$(hand_target_id "$REVISION" "$SEED_P1_ROTATED")"
jq -e --arg expected "$EXPECTED_P1_ROTATED" \
  '.targets | map(.target_id) | index($expected) != null' \
  "$WORK_DIR/manifest-rotated.json" >/dev/null ||
  fail "rotated seed did not produce the hand-computed rotated target identity"

# ...and with a different source revision (identity-only, deviation 1b).
python3 "$RELEASE_SET" --repo-root "$WORK_DIR" manifest \
  --source-revision "$(printf 'a%.0s' {1..40})" --output "$WORK_DIR/manifest-rev2.json"
[[ "$(jq -r '.release_id' "$WORK_DIR/manifest-rev2.json")" != "$EXPECTED_RELEASE_ID" ]] ||
  fail "a different source revision must produce a different release identity"

printf 'release-set identity fixture tests passed\n'
