# API Versioning & Deprecation Policy

Tracks [issue #674](https://github.com/uditt490-pixel/YuvaHub/issues/674). This
document is the single source of truth for how YuvaHub versions its HTTP API,
how long versions are supported, and how consumers are told (and given time)
when a version is going away.

## Why

All endpoints historically lived at the root `/api` namespace with no versioning
or lifecycle policy, which made breaking changes (e.g. the response envelope,
pagination meta) risky for consumers. URI versioning gives every breaking change
a safe release path: ship a new `/api/vN` alongside the old one, let consumers
migrate, then retire the old version on a published schedule.

## Versioning strategy

- API namespaces are URI-versioned: `/api/v1`, `/api/v2`, etc.
- All **new** endpoints MUST be added under the current versioned namespace
  (`/api/v1` today). Unversioned root endpoints are only allowed as explicit
  legacy aliases (see below).
- The API version is advertised on every response via the `X-API-Version`
  header.
- Within a version, changes MUST remain backward compatible. Anything that
  breaks a consumer (response shape, error envelope, pagination meta, removed
  fields/params) requires a new version.

### Legacy alias (`/api`)

The unversioned `/api` namespace is a **deprecated legacy alias** that forwards
to `/api/v1`. It exists purely so existing consumers keep working while they
migrate. It is subject to the deprecation policy below and is scheduled for
sunset on **2027-06-30**.

## Lifecycle

| State        | Meaning                                                            |
| :----------- | :----------------------------------------------------------------- |
| `active`     | Current version. Fully supported. No deprecation headers.          |
| `deprecated` | Superseded. Still served, but `Deprecation` + `Sunset` are emitted |
| `sunset`     | No longer served. Requests return `404`.                           |

The registry in `src/api/versioning/registry.ts` is the source of truth for
these states.

## Support window & sunset cadence

- A version is supported for at least **12 months** after the next major
  version is released.
- Deprecation is announced with the `Deprecation` header when a version becomes
  deprecated, and must be advertised for at least **6 months** before removal.
- The exact removal date is announced in the `Sunset` header and in this
  document.

## Headers

Sent on every matching response:

| Header          | Value                                            | When                                     |
| :-------------- | :----------------------------------------------- | :--------------------------------------- |
| `X-API-Version` | e.g. `v1`                                        | Every versioned request (and aliases)    |
| `Deprecation`   | `true`                                           | Version (or alias) is deprecated         |
| `Sunset`        | HTTP-date (RFC 1123) of removal, e.g. `Wed, 30 Jun 2027 00:00:00 GMT` | Version (or alias) is deprecated |
| `Link`          | `rel="deprecation"` + `rel="sunset"` policy links | Version (or alias) is deprecated         |

## Current versions

| Namespace   | Status       | Introduced | Deprecated | Sunset               | Notes                        |
| :---------- | :----------- | :--------- | :--------- | :------------------- | :--------------------------- |
| `/api/v1`   | `active`     | 2025-01-01 | —          | —                    | Current version              |
| `/api`      | `deprecated` | —          | 2026-08-01 | 2027-06-30           | Legacy alias, forwards to v1 |

## Adding a new version (e.g. v2)

1. Register it in `src/api/versioning/registry.ts`:
   `versions.v2 = { version: "v2", status: "active", introducedAt: "...", docsUrl: "..." }`.
2. Create `v2Router` and mount it in `src/api/routes/index.ts`:
   `rootRouter.use("/v2", apiVersionHeaders(), v2Router)`.
3. Keep `/api/v1` mounted for the support window. The versioning middleware
   serves both concurrently — verify with the transition tests in
   `tests/api-versioning.test.ts`.
4. Document `/api/v2` in `src/config/swagger.ts`.

## Deprecating a version

1. Set the version's `status` to `"deprecated"` and record `deprecatedAt` and a
   `sunsetAt` date that satisfies the ≥ 6 month notice window in
   `src/api/versioning/registry.ts`. The middleware starts emitting
   `Deprecation` + `Sunset` headers automatically.
2. Announce it in the changelog/PR and update this document.
3. On the sunset date, remove the version's mount and (later) its registry entry.

## Verifying

The automated suite in `tests/api-versioning.test.ts` covers:

- a **sniff test** asserting legacy `/api` responses stay byte-for-byte stable
  against `/api/v1` for the deprecation window;
- that deprecated surfaces emit `Sunset` + `Deprecation` + `Link` headers;
- that `/api/v1` does **not** emit deprecation headers;
- concurrent `v1` / `v2` operation during a transition.

Run it with:

```bash
npx vitest run tests/api-versioning.test.ts
```
