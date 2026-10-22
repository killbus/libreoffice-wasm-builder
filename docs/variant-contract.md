# Builder-Owned Release-Set Contract

## Boundary

The private release-set source defines the release set: a private repository
whose committed content builder CI fetches through a secret read-only deploy
key and reads only through `release_set.py --repo-root` (see "Variant
resolution" below).

The builder-facing contract exposes only release-scoped opaque identities and
operational build roles. It never exposes variant names, domains, descriptions,
`PRODUCT_LOCK`, `BUILD_VARIANT`, `target_seed` values, or the private source
repository owner/name. The builder receives the public runtime repository only
through its secret control-plane configuration; the private release-set source
is fetched by builder CI through its own secret read-only deploy key.

## Variant resolution

This builder owns the release-set script; the private release-set source owns
the release-set content. The compilation source is the separate, public runtime
repository, so the three "repository" concepts are split deliberately:
identity must stay a pure function of the upstream LO revision plus the release-set's committed content,
and must never depend on the builder's own Git history.

- **Variants** are always read from the private release-set source's committed
  tree at the resolved ref, via `--repo-root` (the CI checkout); that committed
  tree is the pinned content.
- **`--source-revision`** is the upstream LO core commit and is used PURELY for
  identity derivation: it is validated as 40-hex and never resolved against
  release-set-source Git. A revision that exists nowhere in the release-set
  source's history is still a valid identity input.
- **`inspect`** is the private operator command: it resolves a historical
  revision to publication identities for operator use and reads the private
  release-set source's committed history. Its output is private operator data,
  never public.

## Release-set source (opaque)

The private release-set source — fetched by builder CI through its secret
read-only deploy key (secret `SOURCE_READ_DEPLOY_KEY`, repository
`SOURCE_REPOSITORY`) — is the only private input to the release set.
The builder treats it as an opaque secret-backed dependency: it reads that
checkout's committed tree only through `release_set.py --repo-root` and does
not document or expose anything about its contents. That content's contract is
owned by the private release-set source, not this public builder.

## Public manifest schema v1

```json
{
  "schema_version": 1,
  "release_id": "release-v1-<64 lowercase hex characters>",
  "source_revision": "<40-character lowercase Git SHA>",
  "targets": [
    {
      "target_id": "target-v1-<64 lowercase hex characters>",
      "build_role": "dev",
      "outputs": ["soffice.wasm", "build-info.json"],
      "transport_profile": "envelope-v1"
    }
  ]
}
```

`build_role` is either `dev` or `prod`. It is an operational builder role, not a
visibility decision. Builder publication policy remains separate:

- `dev` promotes only to the fixed `release-dev` branch of the public runtime
  repository;
- `prod` may promote to the public builder release destination.

Both roles use the same `envelope-v1` candidate-transport interface. Its builder
implementation must provide authenticated confidentiality and integrity. Public
workflow labels use neutral verbs only (`prepare`, `materialize`, `promote`,
`finalize`); a plaintext development payload is never uploaded to the public
builder repository.

## Canonical encoding and identities

Schema v1 canonical JSON uses UTF-8-compatible ASCII output with:

- object keys sorted lexicographically;
- no insignificant whitespace;
- JSON arrays preserved in contract order;
- public targets sorted lexicographically by `target_id`;
- no trailing newline in the bytes used for hashing.

A target ID is `target-v1-<64 lowercase hex>`; it is derived from the upstream
source revision and the private release-set source's committed content, and
consumed opaquely here. Opaque target IDs do not disclose their private
variant, domain, or customer mapping.

The release identity projection contains `schema_version`, `source_revision`,
and `targets`, but not `release_id`. The release ID is:

```text
"release-v1-" + hex(
  SHA-256(
    "lo-release-set-v1" || NUL ||
    canonical_json(identity_projection)
  )
)
```

The `lo-release-*` domain-separation strings are LO's own; they must stay
byte-identical with the public repo's build-info emitter. Consequently, a
source revision, target membership, role, output contract, transport profile,
or release-set content change creates a different immutable release ID.

## Builder commands

`--repo-root` points `release_set.py` at the checkout of the private
release-set source (in CI: the `release-set-repo` directory). Omitted only for
local development against a manual release-set checkout.

Emit the canonical manifest for an identity revision:

```bash
python3 build/release_set.py manifest \
  --repo-root /path/to/release-set-checkout \
  --source-revision "$LO_CORE_REVISION" \
  --output release-set.json
```

Verify a received manifest and optional release/target selection:

```bash
python3 build/release_set.py verify \
  --repo-root /path/to/release-set-checkout \
  --source-revision "$LO_CORE_REVISION" \
  --manifest release-set.json \
  --release-id "$RELEASE_ID" \
  --target-id "$TARGET_ID"
```

Build one opaque target against a public runtime checkout:

```bash
python3 build/release_set.py build \
  --repo-root /path/to/release-set-checkout \
  --source-revision "$LO_CORE_REVISION" \
  --release-id "$RELEASE_ID" \
  --target-id "$TARGET_ID" \
  --source-dir /path/to/public-runtime-checkout
```

Privately resolve a historical revision to its publication identities for
operator use:

```bash
python3 build/release_set.py inspect \
  --repo-root /path/to/release-set-checkout \
  --source-revision "$RELEASE_SET_SOURCE_COMMIT" \
  [--variant pN | --target-id "$TARGET_ID"] \
  --output private-release-map.json
```

Its output is private operator data and must never be attached to dispatches,
candidate evidence, artifacts, or public releases.

The `build` command resolves the private variant internally and invokes the
SOURCE checkout's own `build/build-wasm.sh` (which in turn uses the source's
`ci/generate-origin-lock.py` — the generator stays source-side). Callers must
not provide `BUILD_VARIANT`, `PRODUCT_LOCK`, or `BUILD_TYPE`.

Opaque builds emit a public-safe `wasm/build-info.json` containing only the
schema version, release ID, source revision, target ID, build role, and
transport profile before CI provenance is appended.

## Dispatch and independent builder verification

The public source face dispatches `source-release-set-v1` (or an operator uses
`workflow_dispatch`) after the source build targets succeed. The dispatch
contains only contract version 1, the exact upstream source revision, immutable
release ID, and canonical public manifest. It does not carry the private source
repository owner/name.

The builder must independently:

1. validate the dispatched manifest shape with `build-info-contract.sh`;
2. regenerate the canonical manifest from the private release-set source's
   committed tree with `release_set.py verify` (always read from that checkout
   via `--repo-root`);
3. reject a source revision, release ID, target ID, role, output, or transport
   mismatch;
4. invoke only `release_set.py build`, never private selector inputs;
5. record the release and target identities in candidate evidence;
6. apply destination policy separately from `build_role`.

## Versioning

Schema, domain-separation strings, prefixes, canonicalization, target ordering,
required outputs, and transport profile are identity-bearing contract elements.
Changing any existing interpretation requires a new schema and identity version;
it must not silently reinterpret version 1 evidence.
