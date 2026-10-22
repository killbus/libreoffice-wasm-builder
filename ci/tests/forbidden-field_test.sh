#!/usr/bin/env bash
# Forbidden-VALUE boundary test (R6/AC8; the relocated F3 private-value scan).
# The builder tree is seed-free (Option 2), so this test creates deterministic
# synthetic variants in a temp directory and proves the boundary holds for
# them: no
# private value — variant name, domain, target_seed, or description, for any
# variant — may appear in:
#   1. the public release-set manifest emitted by release_set.py,
#   2. the p0 (dev-role) 6-key public build-info sample,
#   3. artifact-name expressions in .github/workflows/*.yml (whole files are
#      scanned for names too),
#   4. docs: any fenced public-sample block (whole files are scanned for
#      domain/seed/description secrets).
# Failure output names the category and variant only — a target_seed is NEVER
# echoed to stdout by this test.

set -euo pipefail

readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BUILDER_ROOT="$(cd "$TEST_DIR/../.." && pwd)"

python3 - "$BUILDER_ROOT" <<'PYEOF'
import json
import pathlib
import re
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(sys.argv[1]) / "build"))
import release_set

builder_root = pathlib.Path(sys.argv[1])
failures: list[str] = []


def synthetic_seed(offset: int) -> str:
    # Deterministic, ≥16 distinct bytes, per the seed contract.
    return bytes((offset + index) % 256 for index in range(32)).hex()


# --- the private variants (synthetic fixtures; the tree is seed-free) ----------
fixture_root = pathlib.Path(tempfile.mkdtemp(prefix="forbidden-field-variants-"))
variants_dir = fixture_root / "variants"
variants_dir.mkdir()
variant_paths = [
    variants_dir / name
    for name in (
        "p0.json",
        "p1.json",
        "p2.json",
    )
]
fixtures = [
    {
        "variant": "p0",
        "domain": None,
        "product_lock": 0,
        "description": "Synthetic description for p0",
        "target_seed": synthetic_seed(0),
    },
    {
        "variant": "p1",
        "domain": "p1.invalid",
        "product_lock": 1,
        "description": "Synthetic description for p1",
        "target_seed": synthetic_seed(32),
    },
    {
        "variant": "p2",
        "domain": "p2.invalid",
        "product_lock": 1,
        "description": "Synthetic description for p2",
        "target_seed": synthetic_seed(64),
    },
]
for path, fixture in zip(variant_paths, fixtures):
    path.write_text(json.dumps(fixture), encoding="utf-8")
configs = [release_set.load_config(str(path), path.stem) for path in variant_paths]

# Private values per category. Seeds are handled only inside this process and
# are never printed; on failure the category + variant name is enough.
private_values: dict[str, dict[str, list[str]]] = {}
for config in configs:
    values: list[str] = [config.variant]
    if isinstance(config.domain, str):
        values.append(config.domain)
    values.append(config.description)
    values.append(config.target_seed)
    private_values[config.variant] = {
        "variant_name": [config.variant],
        "domain": [config.domain] if isinstance(config.domain, str) else [],
        "description": [config.description],
        "target_seed": [config.target_seed],
    }
all_values = [value for config in private_values.values() for vals in config.values() for value in vals]


def scan(label: str, text: str, values_by_category: dict[str, list[str]]) -> None:
    for category, values in values_by_category.items():
        for value in values:
            if value and value in text:
                failures.append(f"{label}: forbidden {category} value leaked")


# --- 1. the public release-set manifest -----------------------------------------
revision = "d1c9e0e4e1ddeb24fe8f93e56860b3765043f8b1"
resolved = release_set.create_release_set(
    builder_root, revision, variant_paths=variant_paths
)
release_set.validate_public_manifest(resolved.manifest, configs)
manifest_text = release_set.canonical_json(resolved.manifest)
for config in configs:
    scan(f"public manifest ({config.variant})", manifest_text, private_values[config.variant])

# --- 2. the p0 (dev-role) 6-key public build-info sample -------------------------
dev_targets = [
    target
    for target in resolved.manifest["targets"]
    if target["build_role"] == "dev"
]
if len(dev_targets) != 1:
    print("forbidden-field test: expected exactly one dev target", file=sys.stderr)
    sys.exit(1)
build_info = {
    "schema_version": 1,
    "release_id": resolved.manifest["release_id"],
    "source_revision": revision,
    "target_id": dev_targets[0]["target_id"],
    "build_role": "dev",
    "transport_profile": "envelope-v1",
}
if sorted(build_info) != sorted(
    ["build_role", "release_id", "schema_version", "source_revision", "target_id", "transport_profile"]
):
    failures.append("p0 build-info sample: 6-key shape drifted")
build_info_text = release_set.canonical_json(build_info)
for config in configs:
    scan(f"p0 build-info sample ({config.variant})", build_info_text, private_values[config.variant])

# --- 3. workflow ymls (artifact-name expressions and everything else) -----------
workflow_dir = builder_root / ".github" / "workflows"
workflow_texts = {
    path.name: path.read_text(encoding="utf-8")
    for path in sorted(workflow_dir.glob("*.yml"))
}
if "release-set.yml" not in workflow_texts or "self-tests.yml" not in workflow_texts:
    failures.append("workflows: release-set.yml and self-tests.yml must both exist")
for name, text in workflow_texts.items():
    # The artifact name must be built from opaque run/target identities only.
    for match in re.finditer(r"^\s*-?\s*name:\s*(lo-wasm-candidate[^\n]*)$", text, re.MULTILINE):
        expression = match.group(1)
        for config in configs:
            scan(f"artifact-name expression in {name} ({config.variant})", expression, private_values[config.variant])
    # No private value anywhere in the workflows either.
    for config in configs:
        scan(f"workflow {name} ({config.variant})", text, private_values[config.variant])

# --- 4. docs: fenced public-sample blocks + whole-file secret scan ---------------
docs_dir = builder_root / "docs"
secret_categories = ["domain", "description", "target_seed"]
for path in sorted(docs_dir.glob("*.md")):
    text = path.read_text(encoding="utf-8")
    # Domain/seed/description must never appear anywhere in the docs.
    for config in configs:
        scan(
            f"docs {path.name} ({config.variant})",
            text,
            {category: private_values[config.variant][category] for category in secret_categories},
        )
    # Variant names must not appear inside fenced public-sample blocks.
    for match in re.finditer(r"```[^\n]*\n(.*?)```", text, re.DOTALL):
        sample = match.group(1)
        for config in configs:
            scan(
                f"docs sample in {path.name} ({config.variant})",
                sample,
                {category: private_values[config.variant][category] for category in secret_categories},
            )
        for config in configs:
            scan(
                f"docs sample in {path.name} ({config.variant})",
                sample,
                {"variant_name": [config.variant]},
            )

# --- verdict (never prints a private value) --------------------------------------
if failures:
    for failure in failures:
        print(f"forbidden-field test: {failure}", file=sys.stderr)
    sys.exit(1)
print("forbidden-field boundary tests passed")
PYEOF
