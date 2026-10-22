# The Four-Face Model — LO WASM Conversion Runtime

A face is an owner + content + visibility triple. The load-bearing invariant is
stated once and enforced everywhere: **a public face can only ever publish
unlocked (dev-role) bytes.** A locked build reaching a public face is a hard,
fail-closed reject.

This runtime's source repository is public and the builder repository is public
too; the only private material is the per-variant release-set content of the
private release-set source, which builder CI fetches through a secret read-only deploy key. Restricting consumers
is a compile-time property of the locked build — the C layer aborts off the
authorized origin — not a function of which repository faces are public.
`docs/deviations.md` records the adaptations from the reference pipeline this
project was standardized on.

## The faces

| Face | Owner | Content | Visibility |
|------|-------|---------|------------|
| Release-source face | private release-set source + this builder repo | private per-variant release-set content — opaque here; origin-lock input contract + release-identity derivation in the builder | release-set source private; builder repo public |
| Public delivery face | public runtime repo (`publish.yml` / `pages.yml` / `font-bundles.yml`) | unlocked `soffice.{wasm,js,cjs,data}` + 6-key `wasm/build-info.json` | open, structurally dev-role-only |
| Per-consumer private delivery | this builder repo | locked per-target `soffice.wasm` via age `envelope-v1` transport | ciphertext in transit; delivered to per-recipient keys |
| Heavy compile face | this builder repo CI (release-set.yml build face / release.yml release face) | per-target serial emscripten builds (~350 min each) | CI-owned, RAM-limited |

## Roles and destinations

`build_role` is derived from the lock state (`dev` ⇔ unlocked, `prod` ⇔
domain-locked). It is an operational role, not a visibility decision by itself;
publication policy applies it:

- `dev` promotes to the fixed `release-dev` branch of the public runtime
  repository over a read/write deploy key.
- `prod` promotes to `release/<target_id>` plus a GitHub Release in this
  builder repository, with opaque identities only.

## Boundary invariants

1. Public artifacts carry opaque identities only: `target-v1-*`, `release-v1-*`,
   timestamps, and digests. Variant names, domains, descriptions, lock values,
   seeds, and the source repository owner/name are forbidden fields.
2. The dispatch payload into this builder carries only public contract fields.
   `SOURCE_REPOSITORY` is trusted control-plane configuration (a repository
   secret), never provenance in evidence.
3. Private per-variant values never appear in logs, manifests, artifact names, or public docs.
4. Candidate transport is encrypted (`envelope-v1`, age X25519); plaintext
   payloads exist only inside the unprivileged build job and are scrubbed on exit.

See `variant-contract.md` for the identity derivation, `candidate-transport.md`
for the transport/provisioning model, and `deviations.md` for the adaptations
relative to the reference pipeline.
