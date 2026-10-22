# Standardization assessment — host-origin consumer lock for the LO WASM runtime

Status: CONVERGED (supersedes chatroom round 1 and round 2 conclusions).
Date: 2026-10-21. Author: supervising session (paseo loop, task
`10-20-standardize-lo-wasm-variant-origin-lock`).
Verification: in-repo ACs (AC1–AC8, AC11) GREEN by Verifier Rounds 1–3; builder ACs
(AC9, AC11) + cross-repo boundary (AC8) GREEN by Verifier Phase 4 (fresh agent bec6bc5b,
independent, zero prior context) with one literal RED ruled to be a briefing/spec tension,
closed by an independent supervisor spot-check (see §6).

## 1. Question

Can the pdfium-builder / pdfium-mod-wasm variant practice and build pipeline be ported as a
standard to the LibreOffice WASM conversion runtime (the private release-set source)?

The variant system's purpose, stated by the owner: **restrict consumers via host origin**
(variant). Each variant build aborts (`__builtin_trap()`) unless it runs on its authorized
domain. p0 = unlocked public/dev; p1 and p2 = locked consumer variants
(authorized-domain restriction is a compile-time property of the locked
builds — this doc is deliberately variant-VALUE-free: no domain, seed, or
description text appears anywhere in it).

## 2. Converged conclusion

**Yes — ported whole, with eight documented deviations, all in this repo's
`docs/deviations.md`.** "Standard" was defined by the owner as the full reference ported
WHOLE; gaps are work to build, never reasons to trim.

### 2.1 The C-layer gate is load-bearing (承重)

LO publicly ships a complete, functional 146 MB `soffice.wasm` (npm + open-CORS Pages).
A JS-wrapper-only lock evaporates if the glue is dropped and the raw wasm is instantiated.
The 9th patch `wasm-origin-lock` weaves the origin lock into the C ABI entries
`lok_convertDocument` / `lok_convertFree` (desktop/source/lib/init.cxx) — the same
branchless token + `check_token()`-at-every-entry pattern as the pdfium reference, with
CHAR-SLICED origin access and XOR-obfuscated domain to dodge static string match. The JS
wrapper layer is defense-in-depth only, never the primary gate.

### 2.2 The target matrix is implemented, not dropped

Owner correction: "LO 无 target 矩阵，只有 variant 维度；保留状态机、去掉矩阵" — LO has one
dimension (variant), no pdfium target matrix; keep the state machine, drop the matrix.
Delivered: per-variant LOCKED wasm builds (only the generated domain + target-seed
injection differ); a single shared wasm is rejected. Three variants: p0 (dev, unlocked),
p1 (prod, locked to its consumer domain), p2 (prod, locked to its consumer domain). Domain values never appear
in docs or public artifacts.

### 2.3 Public faces are structurally p0-only

The load-bearing invariant: **a locked (non-p0) build cannot reach a public face.** npm +
Pages + font-bundles are dev-role destinations only, enforced by fail-closed guards
(`guard-public-face.mjs --require-build-info`, role policy in
`scripts/release-runtime/`); private consumers receive prod-role builds over
age envelope-v1 (age 1.3.1, SHA-pinned) with per-consumer opaque `target_id` identities.
The 6-key build-info and the public manifest v1 carry opaque identities only; the 8
forbidden field names ({build_variant, customer, description, domain, product_lock,
source_repository, target_seed, variant}) and all variant VALUES (names, domains, seeds,
descriptions) are verified absent from public artifacts, logs, and the public repo's
committed tree (AC8, Phase-4 Verifier: zero matches on `git grep` over HEAD for all 8
private values; leak paths closed; no seed ever reaches stdout).

### 2.4 Cost (honest)

One full emscripten LO compile per variant: ~350 min timeout each, 3 variants **serial**
(`strategy.max-parallelism: 1`, `BUILD_JOBS: "4"`) → worst case ~3 × ~350 min per release
cycle, RAM-limited by construction (deviation 3 — the documented OOM-prevention deviation
from the reference's parallel matrix). This is the price of per-consumer locked artifacts
with a single shared toolchain runner; it is inherent to "no shared wasm" and was accepted
as part of the standard.

## 3. Deviation ledger (summary; full text in `docs/deviations.md`)

1. `release_set.py` (+ its test) lives in the PUBLIC seed-free builder, not the
   source repo — LO's source repo is public, so the private identity machinery
   moves to the builder, operating against a `--source-dir` checkout of the
   public repo and a `--repo-root` checkout of the private release-set source.
   `generate-origin-lock.py` stays source-side (public dev-side XOR encoder;
   only the seeds are secret).
1b. Variants are read from the private release-set source's committed tree
   (fetched by builder CI via a read-only deploy key, addressed through
   `--repo-root`); `--source-revision` is
   identity-only (40-hex format check, never resolved against release-set-source
   git). Pinned by
   `test_identity_only_source_revision_never_resolves_against_release_set_repo_git`.
2. One variant dimension; no target matrix (state machine kept).
3. Heavy build serial, `max-parallelism: 1`, `BUILD_JOBS: "4"`, 350-min timeout
   (reference is parallel — documented OOM-prevention deviation).
4. Public source checkout + ephemeral private release-set injection in CI; the
   public source repo never carries variants, and the builder tree carries no
   private per-variant material.
5. age 1.3.1 linux-amd64 pin, SHA-256
   `bdc69c09cbdd6cf8b1f333d372a1f58247b3a33146406333e30c0f26e8f51377`, re-verified against
   the upstream release asset.
6. (Build-info contract LO renames: `lo_source_sha`, `soffice.wasm`,
   `lo-wasm-candidate-*` artifact names.)
7. Single merged `release-set.yml` (pdfium splits build.yml / release.yml); the
   `workflow_run` trigger drives the lightweight promote face off a successful
   `repository_dispatch` parent run; the heavy build is gated off it; no push trigger.
8. (Structural scoping of the promote self-test for the merged workflow.)

## 4. What "standard" buys

- **Consumer restriction that survives leakage of the toolchain:** the lock is compiled
  into each consumer's wasm; public npm/Pages content is provably p0-only (fail-closed).
- **Identity rotation:** per-consumer opaque `target_id`; re-issuing a consumer's
  build under a newly derived identity invalidates a leaked artifact's identity
  without changing the public schema.
- **Two-plane separation with an enforceable boundary:** the public face can publish
  nothing but opaque identities; the private face never publishes; the boundary is tested
  in CI (negative self-tests) on every run.
- **Deterministic, auditable state machine:** candidate → accepted → materialized →
  published, content-addressed, all neutral verbs.

## 5. Residuals (honest)

1. **The deployed public candidate is pre-standard.** The live deployed candidate
   `85a039aba424bedba15c75728d071aeaa678314ae4e161e88394674755009190` is an 8-asset
   build without `wasm/build-info.json`. The new fail-closed guard
   (`--require-build-info`) therefore REJECTS it until a fresh p0 candidate is
   frozen + released through the standardized pipeline — the intended fail-closed
   behavior (no silent downgrade to the old 8-asset shape). The AC7 positive path goes
   live only after that next real p0 release. Until then: any public promote is blocked
   rather than downgraded.
2. **The heavy matrix build has not yet run** (Phase 6, gated on explicit owner go).
   Everything above the emscripten line is verified by construction + self-tests; the
   actual 3 × ~350-min serial compile, the per-variant build-info assertions, and the
   off-domain abort smoke are CI-executed when triggered.
3. **Planning-doc hygiene (owner action):** the public repo's UNTRACKED planning docs
   `.trellis/tasks/10-20-standardize-lo-wasm-variant-origin-lock/{design.md,prd.md}`
   contain the two consumer domains (verified: 0 seeds, 0 tracked, 0 in history).
   Prior `.trellis` docs are committed in that repo, so these two files must be redacted
   or excluded before any commit that touches `.trellis/`.

## 6. Verification evidence (Phase 4, condensed)

- AC9: `bash ci/run-tests.sh` → 8/8 pass, EXIT 0 (fresh run by an independent verifier).
  All 8 tests lightweight (no emscripten/network/compile). Tamper test: valid 6-key
  build-info accepted; +a forbidden `domain` field (value elided here) → rejected
  (exact-key-set predicate, `ci/build-info-contract.sh:133`).
- AC9.4(b) literal RED, ruled non-defect: on the delivered no-`.git` snapshot,
  `manifest` exits 2 (deviation 1b requires the release-set source checkout's
  committed HEAD — CI checks out the release-set source at the pinned SHA).
  Independent supervisor spot-check in a throwaway git sandbox: EXIT 0, 3 opaque
  distinct `target_id`s (dev, prod, prod), zero seed/domain values in the emitted
  manifest. The code is correct; the briefing's literal "run on the delivered
  tree" wording was the thing that presupposed a checkout.
- AC11: `release-set.yml` — `max-parallelism: 1` (line 136), `BUILD_JOBS: "4"` (139),
  `timeout-minutes: 350` (130), heavy build dispatch-only (gate line 127), forbidden-env
  guard before `release_set.py build` (212–215), environment gate `Candidate Promotion` on
  the promote job (511), per-target promote concurrency (517–518), `self-tests.yml`
  lightweight only, no `.git` in the builder tree, no shipped `__pycache__`.
- AC8 (cross-repo): the public repo's working tree carries the canonical
  variant configs only as untracked files (transient pre-migration state);
  builder tree is seed-free (no `variants/`); `git grep` over public HEAD for
  the 3 seeds + 2 domains + 3 descriptions → 0 matches each; builder leak paths
  closed (manifest/build-info/workflow artifact names/docs all clean); all 18
  public published-surface files clean; run-tests stdout carries no seed or domain.
