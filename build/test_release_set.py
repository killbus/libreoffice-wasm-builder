#!/usr/bin/env python3
"""Contract tests for the builder-owned release-set manifest (LO adaptation)."""

import copy
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from release_set import (
    ReleaseSetError,
    canonical_json,
    committed_variant_paths,
    create_release_set,
    derive_target_id,
    inspect_release_set,
    invoke_target_build,
    main,
    resolve_public_target,
    validate_public_manifest,
    verify_manifest,
)

REVISION_A = "a" * 40
REVISION_B = "b" * 40


def target_seed(offset: int) -> str:
    return bytes((offset + index) % 256 for index in range(32)).hex()


def write_variant(
    directory: Path,
    variant: str,
    domain: str | None,
    product_lock: int,
    seed: str,
) -> Path:
    path = directory / f"{variant}.json"
    path.write_text(
        json.dumps(
            {
                "variant": variant,
                "domain": domain,
                "product_lock": product_lock,
                "description": f"Private description for {variant}",
                "target_seed": seed,
            }
        ),
        encoding="utf-8",
    )
    return path


def fixture_variants(directory: Path) -> list[Path]:
    directory.mkdir(parents=True, exist_ok=True)
    return [
        write_variant(directory, "p0", None, 0, target_seed(0)),
        write_variant(directory, "p1", "p1.invalid", 1, target_seed(32)),
        write_variant(directory, "p2", "p2.invalid", 1, target_seed(64)),
    ]


def assert_raises(expected: type[BaseException], callback: object) -> None:
    try:
        callback()  # type: ignore[operator]
    except expected:
        return
    raise AssertionError(f"expected {expected.__name__}")


def test_manifest_is_deterministic_and_public_safe() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        paths = fixture_variants(root / "variants")
        first = create_release_set(root, REVISION_A, variant_paths=paths)
        second = create_release_set(root, REVISION_A, variant_paths=list(reversed(paths)))

        assert canonical_json(first.manifest) == canonical_json(second.manifest)
        assert first.manifest["schema_version"] == 1
        assert first.manifest["source_revision"] == REVISION_A
        targets = first.manifest["targets"]
        assert isinstance(targets, list)
        assert [target["target_id"] for target in targets] == sorted(
            target["target_id"] for target in targets
        )
        assert sorted(target["build_role"] for target in targets) == [
            "dev",
            "prod",
            "prod",
        ]

        public_json = canonical_json(first.manifest)
        private_markers = [
            "p0",
            "p1",
            "p2",
            "p1.invalid",
            "p2.invalid",
            "product_lock",
            "target_seed",
            "variant",
            *[target_seed(offset) for offset in (0, 32, 64)],
        ]
        for marker in private_markers:
            assert marker not in public_json


def test_identity_matches_lo_domain_separation() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        paths = fixture_variants(root / "variants")
        release_set = create_release_set(root, REVISION_A, variant_paths=paths)
        seed = target_seed(0)
        assert derive_target_id(REVISION_A, seed) == (
            "target-v1-"
            + __import__("hashlib")
            .sha256(b"lo-release-target-v1" + b"\0" + REVISION_A.encode() + b"\0" + bytes.fromhex(seed))
            .hexdigest()
        )
        projection = {
            "schema_version": 1,
            "source_revision": REVISION_A,
            "targets": release_set.manifest["targets"],
        }
        assert release_set.manifest["release_id"] == (
            "release-v1-"
            + __import__("hashlib")
            .sha256(b"lo-release-set-v1" + b"\0" + canonical_json(projection).encode())
            .hexdigest()
        )


def test_identity_changes_with_revision_and_seed() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        paths = fixture_variants(root / "variants")
        original = create_release_set(root, REVISION_A, variant_paths=paths)
        new_revision = create_release_set(root, REVISION_B, variant_paths=paths)
        assert original.manifest["release_id"] != new_revision.manifest["release_id"]
        assert set(original.private_targets) != set(new_revision.private_targets)

        write_variant(paths[1].parent, "p1", "p1.invalid", 1, target_seed(96))
        rotated = create_release_set(root, REVISION_A, variant_paths=paths)
        assert original.manifest["release_id"] != rotated.manifest["release_id"]
        assert set(original.private_targets) != set(rotated.private_targets)


def test_duplicate_seed_fails_closed() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        variants = root / "variants"
        variants.mkdir()
        paths = [
            write_variant(variants, "p0", None, 0, target_seed(0)),
            write_variant(variants, "p1", "p1.invalid", 1, target_seed(0)),
        ]
        assert_raises(
            ReleaseSetError,
            lambda: create_release_set(root, REVISION_A, variant_paths=paths),
        )


def test_low_diversity_seed_fails_closed() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        variants = root / "variants"
        variants.mkdir()
        low_diversity_seed = ("ab" * 32)
        paths = [
            write_variant(variants, "p0", None, 0, target_seed(0)),
            write_variant(variants, "p1", "p1.invalid", 1, low_diversity_seed),
        ]
        assert_raises(
            ReleaseSetError,
            lambda: create_release_set(root, REVISION_A, variant_paths=paths),
        )


def test_manifest_validation_and_lookup_fail_closed() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        release_set = create_release_set(
            root, REVISION_A, variant_paths=fixture_variants(root / "variants")
        )
        release_id = str(release_set.manifest["release_id"])
        target_id = next(iter(release_set.private_targets))

        verify_manifest(
            copy.deepcopy(release_set.manifest),
            release_set,
            release_id=release_id,
            target_id=target_id,
        )
        resolve_public_target(release_set, release_id, target_id)
        assert_raises(
            ReleaseSetError,
            lambda: resolve_public_target(release_set, "release-v1-" + "0" * 64, target_id),
        )
        assert_raises(
            ReleaseSetError,
            lambda: resolve_public_target(
                release_set, release_id, "target-v1-" + "0" * 64
            ),
        )

        forbidden = copy.deepcopy(release_set.manifest)
        forbidden["targets"][0]["domain"] = "example.com"  # type: ignore[index]
        assert_raises(ReleaseSetError, lambda: validate_public_manifest(forbidden))

        repository_leak = copy.deepcopy(release_set.manifest)
        repository_leak["source_repository"] = "private-owner/private-source"
        assert_raises(
            ReleaseSetError, lambda: validate_public_manifest(repository_leak)
        )

        duplicate = copy.deepcopy(release_set.manifest)
        duplicate["targets"].append(copy.deepcopy(duplicate["targets"][0]))  # type: ignore[union-attr,index]
        assert_raises(ReleaseSetError, lambda: validate_public_manifest(duplicate))

        inconsistent = copy.deepcopy(release_set.manifest)
        inconsistent["source_revision"] = REVISION_B
        assert_raises(ReleaseSetError, lambda: validate_public_manifest(inconsistent))


def test_only_committed_variant_files_are_discovered() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        variants = root / "variants"
        variants.mkdir()
        tracked = write_variant(variants, "p0", None, 0, target_seed(0))
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        subprocess.run(["git", "-C", str(root), "add", "variants/p0.json"], check=True)
        subprocess.run(
            [
                "git",
                "-C",
                str(root),
                "-c",
                "user.name=Release Set Test",
                "-c",
                "user.email=release-set@example.invalid",
                "commit",
                "-qm",
                "fixture",
            ],
            check=True,
        )
        write_variant(variants, "p1", "example.com", 1, target_seed(32))
        assert committed_variant_paths(root) == [tracked]


def test_committed_variant_content_is_revision_pinned() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        variants = root / "variants"
        variants.mkdir()
        committed_seed = target_seed(0)
        write_variant(variants, "p0", None, 0, committed_seed)
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        subprocess.run(["git", "-C", str(root), "add", "variants/p0.json"], check=True)
        subprocess.run(
            [
                "git",
                "-C",
                str(root),
                "-c",
                "user.name=Release Set Test",
                "-c",
                "user.email=release-set@example.invalid",
                "commit",
                "-qm",
                "fixture",
            ],
            check=True,
        )
        revision = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        write_variant(variants, "p0", None, 0, target_seed(64))
        release_set = create_release_set(root, revision)
        assert set(release_set.private_targets) == {
            derive_target_id(revision, committed_seed)
        }


def test_private_inspect_maps_variants_and_publication_identities() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        release_set = create_release_set(
            root, REVISION_A, variant_paths=fixture_variants(root / "variants")
        )
        inspection = inspect_release_set(release_set)
        assert inspection["release_id"] == release_set.manifest["release_id"]
        assert inspection["source_revision"] == REVISION_A
        targets = inspection["targets"]
        assert isinstance(targets, list)
        assert {target["variant"] for target in targets} == {"p0", "p1", "p2"}

        dev = next(target for target in targets if target["variant"] == "p0")
        assert dev["domain"] is None
        assert dev["product_lock"] == 0
        assert dev["build_role"] == "dev"
        assert dev["publication"] == {
            "branch": "release-dev",
            "tag": "v1.0.0-aaaaaaa-dev",
            "version": "1.0.0-aaaaaaa-dev",
        }

        prod = next(target for target in targets if target["variant"] == "p2")
        target_id = str(prod["target_id"])
        target_digest = target_id.removeprefix("target-v1-")
        assert prod["domain"] == "p2.invalid"
        assert prod["product_lock"] == 1
        assert prod["build_role"] == "prod"
        assert prod["publication"] == {
            "branch": f"release/{target_id}",
            "tag": f"v1.0.0-aaaaaaa.{target_digest}",
            "version": f"1.0.0-aaaaaaa.{target_digest}",
        }

        assert inspect_release_set(release_set, variant="p2")["targets"] == [prod]
        assert inspect_release_set(release_set, target_id=target_id)["targets"] == [
            prod
        ]
        assert_raises(
            ReleaseSetError,
            lambda: inspect_release_set(release_set, variant="p999"),
        )
        assert_raises(
            ReleaseSetError,
            lambda: inspect_release_set(
                release_set, target_id="target-v1-" + "0" * 64
            ),
        )

        # inspect is private operator data: it must never carry the seed.
        assert "target_seed" not in canonical_json(inspection)


def test_identity_only_source_revision_never_resolves_against_release_set_repo_git() -> None:
    """Deviation 1b: --source-revision is the upstream LO core commit, used
    purely for identity derivation. A 40-hex value that does not exist anywhere
    in the release-set source's Git history must still succeed for manifest,
    and the requested-vs-actual guard binds the release-set source checkout's
    HEAD, not the upstream revision."""
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        fixture_variants(root / "variants")
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        subprocess.run(["git", "-C", str(root), "add", "variants"], check=True)
        subprocess.run(
            [
                "git",
                "-C",
                str(root),
                "-c",
                "user.name=Release Set Test",
                "-c",
                "user.email=release-set@example.invalid",
                "commit",
                "-qm",
                "fixture",
            ],
            check=True,
        )
        variant_head = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        # A 40-hex revision absent from the release-set source's Git history is
        # accepted for manifest because it is identity-only.
        identity_only = "0123456789abcdef" * 2 + "01234567"
        output = root / "manifest.json"
        assert (
            main(
                [
                    "--repo-root",
                    str(root),
                    "manifest",
                    "--source-revision",
                    identity_only,
                    "--output",
                    str(output),
                ]
            )
            == 0
        )
        manifest = json.loads(output.read_text(encoding="ascii"))
        assert manifest["source_revision"] == identity_only

        # An explicit --source-revision binds identity; the committed variants
        # still come from the release-set source at HEAD (verified via seed
        # mapping).
        first_target = manifest["targets"][0]["target_id"]
        assert first_target == derive_target_id(identity_only, target_seed(0))

        # Malformed (non-40-hex) source revisions fail closed.
        assert_raises(
            ReleaseSetError,
            lambda: create_release_set(root, "not-a-sha"),
        )

        # inspect is the exception: its revision must identify an exact
        # release-set-source commit, so the identity-only value fails there.
        inspect_output = root / "inspection.json"
        assert (
            main(
                [
                    "--repo-root",
                    str(root),
                    "inspect",
                    "--source-revision",
                    identity_only,
                    "--output",
                    str(inspect_output),
                ]
            )
            == 2
        )
        assert not inspect_output.exists()

        # ...but inspect succeeds against the real release-set-source HEAD.
        assert (
            main(
                [
                    "--repo-root",
                    str(root),
                    "inspect",
                    "--source-revision",
                    variant_head,
                    "--output",
                    str(inspect_output),
                ]
            )
            == 0
        )
        inspection = json.loads(inspect_output.read_text(encoding="ascii"))
        assert inspection["source_revision"] == variant_head


def test_private_inspect_reads_historical_revision_without_checkout() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        variants = root / "variants"
        variants.mkdir()
        historical_seed = target_seed(0)
        write_variant(variants, "p0", None, 0, historical_seed)
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        subprocess.run(["git", "-C", str(root), "add", "variants"], check=True)
        commit = [
            "git",
            "-C",
            str(root),
            "-c",
            "user.name=Release Set Test",
            "-c",
            "user.email=release-set@example.invalid",
            "commit",
            "-qm",
        ]
        subprocess.run([*commit, "historical fixture"], check=True)
        historical_revision = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        write_variant(variants, "p1", "p1.invalid", 1, target_seed(32))
        subprocess.run(["git", "-C", str(root), "add", "variants"], check=True)
        subprocess.run([*commit, "current fixture"], check=True)
        assert subprocess.run(
            ["git", "-C", str(root), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip() != historical_revision

        output = root / "inspection.json"
        assert (
            main(
                [
                    "--repo-root",
                    str(root),
                    "inspect",
                    "--source-revision",
                    historical_revision,
                    "--variant",
                    "p0",
                    "--output",
                    str(output),
                ]
            )
            == 0
        )
        inspection = json.loads(output.read_text(encoding="ascii"))
        assert inspection["source_revision"] == historical_revision
        assert [target["variant"] for target in inspection["targets"]] == ["p0"]
        assert inspection["targets"][0]["target_id"] == derive_target_id(
            historical_revision, historical_seed
        )


def test_opaque_build_command_resolves_private_selector_internally() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        release_set = create_release_set(
            root, REVISION_A, variant_paths=fixture_variants(root / "variants")
        )
        release_id = str(release_set.manifest["release_id"])
        target_id = next(iter(release_set.private_targets))
        source_dir = root / "source"
        (source_dir / "ci").mkdir(parents=True)
        (source_dir / "build").mkdir(parents=True)
        (source_dir / "ci" / "generate-origin-lock.py").write_text("# generator\n")
        (source_dir / "build" / "build-wasm.sh").write_text("# build\n")
        captured: dict[str, object] = {}

        def runner(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[object]:
            captured["command"] = command
            captured["environment"] = kwargs["env"]
            return subprocess.CompletedProcess(command, 0)

        with patch.dict(os.environ, {}, clear=True):
            result = invoke_target_build(
                root, release_set, release_id, target_id,
                source_dir=source_dir, runner=runner,
            )
        assert result == 0
        assert captured["command"] == ["bash", str(source_dir / "build" / "build-wasm.sh")]
        environment = captured["environment"]
        assert isinstance(environment, dict)
        assert environment["SOURCE_RELEASE_ID"] == release_id
        assert environment["SOURCE_TARGET_ID"] == target_id
        assert environment["SOURCE_REVISION"] == REVISION_A
        assert environment["SOURCE_RELEASE_TARGET"] == "1"
        assert environment["BUILD_TYPE"] in ("dev", "prod")
        assert environment["BUILD_VARIANT"].startswith("p")
        assert "PRODUCT_LOCK" not in environment

        for forbidden_input in ("BUILD_VARIANT", "PRODUCT_LOCK", "BUILD_TYPE"):
            with patch.dict(os.environ, {forbidden_input: ""}, clear=True):
                assert_raises(
                    ReleaseSetError,
                    lambda: invoke_target_build(
                        root, release_set, release_id, target_id, source_dir=source_dir
                    ),
                )


def test_build_requires_a_source_checkout() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        release_set = create_release_set(
            root, REVISION_A, variant_paths=fixture_variants(root / "variants")
        )
        release_id = str(release_set.manifest["release_id"])
        target_id = next(iter(release_set.private_targets))
        assert_raises(
            ReleaseSetError,
            lambda: invoke_target_build(root, release_set, release_id, target_id),
        )


if __name__ == "__main__":
    test_manifest_is_deterministic_and_public_safe()
    test_identity_matches_lo_domain_separation()
    test_identity_only_source_revision_never_resolves_against_release_set_repo_git()
    test_identity_changes_with_revision_and_seed()
    test_duplicate_seed_fails_closed()
    test_low_diversity_seed_fails_closed()
    test_manifest_validation_and_lookup_fail_closed()
    test_only_committed_variant_files_are_discovered()
    test_committed_variant_content_is_revision_pinned()
    test_private_inspect_maps_variants_and_publication_identities()
    test_private_inspect_reads_historical_revision_without_checkout()
    test_opaque_build_command_resolves_private_selector_internally()
    test_build_requires_a_source_checkout()
    print("All release-set contract tests passed.")
