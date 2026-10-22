# Deviations from the pdfium Reference

Every LO-specific adaptation of the pdfium builder standard, with rationale.
Anything not listed here is a faithful port (ported WHOLE, not trimmed).

## Deviation 1 — `release_set.py` lives in the BUILDER, not the source

pdfium keeps `build/release_set.py` source-side because pdfium's source repo is
private. LO's compilation source is the source repository, fetched by builder
CI via the read deploy key; the builder tree itself stays seed-free and never
commits the release set, so the script (adapted to LO's `lo-release-target-v1` /
`lo-release-set-v1` domain strings, `soffice.wasm` outputs, and the 6-key
build-info shape) lives in the public builder and reads the source
repository's committed tree through `--repo-root` (deviation 1b).
Same four commands (`manifest`, `verify`, `target`/`build`, `inspect`) and the
same public/private split.

## Deviation 1b — variant resolution binds the release-set source's committed tree; `--source-revision` is identity-only

LO runs a two-repository model: the source repository is BOTH the compilation
source and the release-set source (its committed content defines the release
set), and the public seed-free builder is the only other participant in the
builder pipeline. The builder CI fetches the source repository via a read-only
deploy key (`SOURCE_REPOSITORY` / `SOURCE_READ_DEPLOY_KEY`) and points
`release_set.py` at that checkout with `--repo-root`. Variants are ALWAYS read
from the release-set source's committed tree at the resolved ref (in CI the
release-set source checkout is the pinned content), so release-set identity is
re-bound — relative to the pdfium reference — from the builder's commit to the
release-set source's committed SHA. `--source-revision` is the upstream LO core
commit and is used purely for identity derivation: validated as 40-hex, never
resolved against release-set-source Git — a revision absent from its history is
still a valid identity input. The requested-vs-actual HEAD guard applies to the
release-set source checkout (`current_source_revision` via `--repo-root`), and
`inspect` remains the exception that must identify an exact release-set source
commit. Rationale: identity must be a pure function of (upstream revision, the
release-set source's committed content); resolving the upstream revision against
the builder's Git would make builder history an implicit input to target
identities.

## Deviation 2 — one variant dimension, no target matrix

LO's release set has exactly one dimension: the variant (`p0`/`p1`/`p2`, one
wasm output each). pdfium's multi-target / multi-ABI matrix concept is not
imported. The release-set state machine is kept intact: resolve → per-target
build → accept → promote. The `targets` matrix in `release-set.yml` is the
opaque-`target_id` projection of the variant dimension.

## Deviation 3 — heavy build is serial and RAM-limited

pdfium's build matrix is parallel. LO's emscripten build takes ~350 minutes per
variant and is memory-hungry, so `release-set.yml` sets `strategy.max-parallel:
1` (one LO compile at a time, ordered by `target_id`) and pins `BUILD_JOBS: 4`
(LO's own RAM-limited make parallelism from the public repo's build workflow)
with a 350-minute job timeout. The promote job stays lightweight (no
emscripten). Rationale: OOM prevention outranks wall-clock.

## Deviation 4 — single source checkout for compilation + release-set resolution

The heavy build checks out the source repository at the pinned `source_revision`
as the compilation source, and that same checkout is used for BOTH compilation
and release-set resolution (single source): the committed release-set already
lives in the source checkout, so the build reads `variants/` from the same
checkout it compiles (`--repo-root source` / `--source-dir source`) and there is
no longer a separate injection of a distinct release-set checkout. The committed
variants are scrubbed from the working tree by the transport step's exit trap.
Rationale: the source checkout serves both faces of the release set while the
builder tree carries no private per-variant material (deviation 1b), and the
source build script owns the wiring; using the single checkout preserves the
source-owned build path.
`release_set.py build --repo-root <source-checkout> --source-dir <checkout>`
enforces that the variant is resolved internally (caller passes only
`--source-revision` / `--release-id` / `--target-id` / `--source-dir`; never
`BUILD_VARIANT`/`PRODUCT_LOCK`/`BUILD_TYPE`).

## Deviation 5 — the origin-lock generator stays source-side

pdfium's XOR domain encoder is private-source. LO's port
(`ci/generate-origin-lock.py` in the PUBLIC runtime repo) is the public
dev-side XOR encoder: only the seeds are private, while the algorithm is
intentionally public and reviewed. The builder ships NO copy; `release_set.py build` invokes the
checkout's own
`<source-dir>/ci/generate-origin-lock.py` via the source build script's
`GENERATOR_PATH` wiring. Rationale: the encoded-domain mechanism must be
auditable in the public face; secrecy lives in the seed, not the algorithm.

## Deviation 6 — focused gate is the no-pthread runtime contract

pdfium binds a focused native embedder regression filter into accepted
evidence. LO's heavy build has no native embedder suite; the equivalent
CI-native gate is the no-pthread runtime artifact contract
(`scripts/inspect-no-pthread-runtime.mjs` in the public repo), so
`build-info-contract.sh`'s `FOCUSED_EMBEDDER_TESTS` is the single named policy
`LokNoPthreadRuntimeContract.SingleProfileNoWorkerSidecar`. The evidence key
shape (`focused_embedder_test {filter, status}`) is kept identical.

## Deviation 7 — single merged workflow

pdfium splits the pipeline into `build.yml` (dispatch face: resolve → build →
accept) and `release.yml` (workflow_run face: resolve-accepted → promote). The
LO builder merges both faces into one `release-set.yml` (resolve → serial
build → accept → resolve-accepted-release → promote) plus a separate
`self-tests.yml` (atomic tests only, never the heavy job). The promote test's
structural assertions are scoped to the merged file's sections (build face =
pre-`promote:`; release face = `promote:` job). Rationale: one workflow keeps
the LO pipeline legible; the state machine and the security-relevant section
scoping are unchanged.

## Deviation 8 — `soffice.wasm` naming and LO provenance fields

All pdfium-specific names are LO-adapted: outputs `["soffice.wasm",
"build-info.json"]`, artifact prefix `lo-wasm-candidate-…`, evidence key
`lo_source_sha` (the pinned upstream LO core commit), release notes titled
"LO WASM Build", package name `lo-wasm`. Key-set SHAPES (17/20/20) are
unchanged.
