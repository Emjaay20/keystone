# SLICE-06 — Okta SSO federation

Status: **ready. Slice 05 is on main.**

## Goal

Enterprise orgs can federate login through Okta (OIDC Authorization Code flow).
After the Okta callback, Keystone issues its own `ks_session` cookie — the rest of the
app is unchanged. Okta is a door, not a database.

## Rules

- SSO only if `org.plan === "enterprise"` (already gated by `assertFeature(org, "sso")`).
- No SCIM, no SAML, no Atlas scripts.
- Mock JWKS/token in Jest — no live Okta in tests.
- `.env.local` is gitignored. Never commit secrets.

## Domain (`packages/domain/src/sso/service.ts`)

```
ssoConnections collection:
  orgId, issuer, clientId, clientSecretCipher (encrypted), enabled, createdBy, createdAt

configureSso({ rawToken, orgId, issuer, clientId, clientSecret, enabled })
  owner only
  assertFeature(org, "sso")
  upserts ssoConnections for the org (one record per org)
  audit: configureSso allow

getSsoConfig(db, orgId) → { issuer, clientId, enabled } | null
  no auth (called by the callback route)

findOrCreateSsoUser(db, { email, name, sub, issuer, orgId })
  find or create user by email
  ensure active membership in the org
  create ks_session → return token
```

## HTTP

| Method | Path | Purpose |
|---|---|---|
| GET/PUT | `/api/orgs/[orgId]/sso` | owner: read / configure SSO |
| GET | `/api/auth/okta/authorize` | redirect to Okta `/authorize` |
| GET | `/api/auth/okta/callback` | exchange code, verify JWT, set ks_session |

### `/api/auth/okta/authorize`

1. Validate `org_id` query param, load `ssoConnections` for that org.
2. If no config or not enabled → 400.
3. Assert plan is enterprise (org lookup).
4. Build Okta authorize URL with `response_type=code`, `scope=openid email profile`,
   `state=<orgId>`, `nonce=<random>`, store nonce in a short-lived cookie.
5. 302 redirect.

### `/api/auth/okta/callback`

1. Read `code` and `state` (= orgId) from query.
2. Load SSO config for the org.
3. POST to Okta token endpoint — exchange code for `id_token`.
4. Fetch Okta JWKS, verify `id_token` signature + nonce.
5. Extract `email`, `name`, `sub` from claims.
6. Call `findOrCreateSsoUser` → get ks_session token.
7. Set `ks_session` cookie, redirect to `/app`.

## UI (`/app`)

Owner on Enterprise plan sees a **SSO Configuration** card:

- Toggle enabled / disabled
- Fields: Issuer URL, Client ID, Client Secret (write-only)
- Save button
- "Continue with Okta" button on the login page when SSO is configured for any enterprise org

## Tests (`packages/domain/tests/sso.test.ts`)

- `configureSso` on non-enterprise org → 403 plan_feature_locked
- `configureSso` by non-owner → 403
- `configureSso` on enterprise org → saved + audit log
- `getSsoConfig` returns the config
- `findOrCreateSsoUser` creates user + membership on first call
- `findOrCreateSsoUser` is idempotent (second call same user)
- Analyst cannot configureSso

## Done when

`npm run build -w @keystone/domain && npm run test:domain && cd apps/web && npx next build`
lists `/api/auth/okta/callback` and `/api/orgs/[orgId]/sso`.
