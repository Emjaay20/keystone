# SLICE-03 — Product grants, deny reasons, audit

Status: **specified. Implement only when Grok says go.**

## Goal

Membership role is not enough. Access to MailGuard / BrandWatch / CertRadar is a **grant**. Every mutation writes an audit row. A 403 explains *why*.

## Model

`grants`

```
orgId, principalType: "user", principalId (userId),
product: mailguard | brandwatch | certradar,
level: none | view | operate | admin,
expiresAt: Date | null,
createdBy, reason, createdAt
```

Missing grant = `none`. Expired grant = `none`.

`audit`

```
orgId, actorUserId, action, product | null,
target: { type, id },
outcome: allow | deny,
reasonCode, reason, createdAt
```

## Decision order (do not reorder)

1. Valid session?
2. Active membership in this org?
3. Role allows this *platform* action? (invite, grant-admin, billing)
4. Non-expired product grant allows this *product* action?
5. Mutations and sensitive denies write audit.

## Domain

```
authorize(ctx, { orgId, platformAction? , product?, productAction? })
  → { allow, reasonCode, reason }

setGrant({ rawToken, orgId, userId, product, level, expiresAt, reason })
  owner/admin only. Cannot grant above your own product level except owner.
  Writes audit.

listGrants({ rawToken, orgId })
  owner/admin, or self.

explainDeny({ rawToken, orgId, product, productAction })
  returns reasonCode + reason from authorize (no side effect required)

listAudit({ rawToken, orgId, limit? })
  owner/admin only
```

Reason codes (fixed strings):

- `unauthenticated`
- `not_member`
- `role_cannot_invite`
- `role_cannot_grant`
- `no_product_grant`
- `grant_expired`
- `level_too_low`
- `plan_feature_locked` (stub: always allow until Slice 05)

## HTTP

| Method | Path |
| --- | --- |
| PUT | `/api/orgs/[orgId]/grants` |
| GET | `/api/orgs/[orgId]/grants` |
| GET | `/api/orgs/[orgId]/audit` |
| POST | `/api/orgs/[orgId]/authorize/explain` `{ product, productAction }` |

Product stub (proves grant, not a real DMARC app):

`GET /api/products/mailguard/export` — requires membership + MailGuard `operate` or `admin`. 403 body `{ error, reasonCode, reason }`.

## UI

On `/app` for owner/admin: pick member, product, level, optional expiry, reason. List grants. Last 20 audit rows.

403 on the stub export must show `reason` on the page.

## Tests

- Analyst with no MailGuard grant → export 403 `no_product_grant`
- Grant view → export still 403 `level_too_low`
- Grant operate → export allow + audit allow
- Expired grant → 403 `grant_expired`
- Analyst cannot setGrant
- Invite still works (regression)

## Out of scope

Okta, plans enforcement, AI operator, Fastify parity, email.

## Done when

`npm run test:domain` all green (identity + invites + grants) and `next build` lists the new routes.
