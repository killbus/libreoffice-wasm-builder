#!/usr/bin/env bash
# build-info 6-key shape test (AC8/AC9).
# The source build-info contract is EXACTLY six keys with transport_profile
# envelope-v1; none of the forbidden field names may appear. Negative shapes
# (extra key, missing key, wrong type, forbidden name) must fail the checker.

set -euo pipefail

readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

readonly RELEASE_ID="release-v1-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
readonly TARGET_ID_DEV="target-v1-1111111111111111111111111111111111111111111111111111111111111111"
readonly TARGET_ID_PROD="target-v1-2222222222222222222222222222222222222222222222222222222222222222"
readonly SOURCE_REVISION="2222222222222222222222222222222222222222"

fail() {
  printf 'build-info shape test: %s\n' "$*" >&2
  exit 1
}

# The checker under test: the same 6-key contract the build-info emitter and
# the public guard enforce. Implemented with jq exactly as both consumers do.
check_build_info() {
  local file="$1"
  jq -e '
    type == "object" and
    (keys == ["build_role", "release_id", "schema_version", "source_revision", "target_id", "transport_profile"]) and
    .schema_version == 1 and
    (.release_id | type == "string" and test("^release-v1-[0-9a-f]{64}$")) and
    (.source_revision | type == "string" and test("^[0-9a-f]{40}$")) and
    (.target_id | type == "string" and test("^target-v1-[0-9a-f]{64}$")) and
    (.build_role == "dev" or .build_role == "prod") and
    .transport_profile == "envelope-v1" and
    (([keys[] | select(. == "build_variant" or . == "customer" or . == "description" or
        . == "domain" or . == "product_lock" or . == "source_repository" or
        . == "target_seed" or . == "variant")] | length) == 0)
  ' "$file" >/dev/null
}

write_build_info() {
  local output="$1" build_role="$2"
  jq -n \
    --arg build_role "$build_role" \
    --arg release_id "$RELEASE_ID" \
    --arg source_revision "$SOURCE_REVISION" \
    --arg target_id "$3" \
    '{schema_version: 1, release_id: $release_id, source_revision: $source_revision,
      target_id: $target_id, build_role: $build_role, transport_profile: "envelope-v1"}' \
    >"$output"
}

assert_fails() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    fail "expected failure: $label"
  fi
}

# Positive: exact 6-key dev and prod shapes pass.
write_build_info "$WORK_DIR/dev.json" dev "$TARGET_ID_DEV"
check_build_info "$WORK_DIR/dev.json" || fail "valid 6-key dev build-info rejected"
jq -e '.build_role == "dev"' "$WORK_DIR/dev.json" >/dev/null

write_build_info "$WORK_DIR/prod.json" prod "$TARGET_ID_PROD"
check_build_info "$WORK_DIR/prod.json" || fail "valid 6-key prod build-info rejected"

# The exact key set, byte-level, as jq sees it.
[[ "$(jq -c 'keys' "$WORK_DIR/dev.json")" == \
   '["build_role","release_id","schema_version","source_revision","target_id","transport_profile"]' ]] ||
  fail "build-info key set drifted from the 6-key contract"

# Negative: extra key.
jq '. + {domain: "example.com"}' "$WORK_DIR/prod.json" >"$WORK_DIR/extra.json"
assert_fails "extra forbidden key domain" check_build_info "$WORK_DIR/extra.json"

# Negative: each forbidden field name individually.
for forbidden in build_variant customer description domain product_lock source_repository target_seed variant; do
  jq --arg key "$forbidden" '. + {($key): "leak"}' "$WORK_DIR/prod.json" >"$WORK_DIR/f.json"
  assert_fails "forbidden key $forbidden" check_build_info "$WORK_DIR/f.json"
done

# Negative: missing key.
jq 'del(.transport_profile)' "$WORK_DIR/dev.json" >"$WORK_DIR/missing.json"
assert_fails "missing transport_profile" check_build_info "$WORK_DIR/missing.json"

# Negative: wrong transport profile.
jq '.transport_profile = "plain-v0"' "$WORK_DIR/dev.json" >"$WORK_DIR/wrong-profile.json"
assert_fails "wrong transport profile" check_build_info "$WORK_DIR/wrong-profile.json"

# Negative: wrong build role.
jq '.build_role = "staging"' "$WORK_DIR/dev.json" >"$WORK_DIR/wrong-role.json"
assert_fails "wrong build role" check_build_info "$WORK_DIR/wrong-role.json"

# Negative: malformed identity strings.
jq '.target_id = "target-v1-zz"' "$WORK_DIR/dev.json" >"$WORK_DIR/bad-target.json"
assert_fails "malformed target_id" check_build_info "$WORK_DIR/bad-target.json"
jq '.source_revision = "XYZ"' "$WORK_DIR/dev.json" >"$WORK_DIR/bad-revision.json"
assert_fails "malformed source_revision" check_build_info "$WORK_DIR/bad-revision.json"

# The release-set manifest target key set is separately 4 keys (public target record).
cat >"$WORK_DIR/manifest.json" <<EOF
{"schema_version": 1, "release_id": "$RELEASE_ID", "source_revision": "$SOURCE_REVISION",
 "targets": [{"target_id": "$TARGET_ID_DEV", "build_role": "dev",
              "outputs": ["soffice.wasm", "build-info.json"], "transport_profile": "envelope-v1"}]}
EOF
jq -e '
  (.[0] | keys == ["build_role", "outputs", "target_id", "transport_profile"])
' < <(jq '.targets' "$WORK_DIR/manifest.json") >/dev/null ||
  fail "public target record key set drifted"

printf 'build-info 6-key shape tests passed\n'
