# SLICE-04 — Product OAuth + API keys

Status: **ready after Slice 03 is on main.**

## Goal

MailGuard (and later BrandWatch) must not use the human cookie. They authenticate as a **product client** via OAuth authorization-code + PKCE, or as a **service** via an API key. Keystone still decides grants.

## Model

`oauth_clients`

```
orgId, name, clientId, clientSecretHash, redirectUris: string[],
createdBy, createdAt
```

One demo client per org can be auto-created: name `MailGuard Dev`, redirect `http://localhost:3000/oauth/callback`.

`oauth_codes`

```
codeHash, clientId, userId, orgId, redirectUri, codeChallenge,
expiresAt (10 min), consumedAt
```

`oauth_tokens` (access tokens Keystone issues to products)

```
tokenHash, clientId, userId, orgId, expiresAt (1 hour), revokedAt
```

`api_keys`

```
orgId, name, prefix, keyHash, product, level,
createdBy, lastUsedAt, revokedAt, createdAt
```

Raw key shown **once**: `ks_` + random. Store sha256. Prefix = first 8 chars for list UI.

## Domain

```
createOauthClient / listOauthClients
startAuthorize({ rawToken, clientId, redirectUri, state, codeChallenge, codeChallengeMethod: "S256" })
  user must be logged in, member of client's org
  redirectUri must match exactly
  returns { redirectTo }

exchangeCode({ clientId, clientSecret, code, redirectUri, codeVerifier })
  verify PKCE S256(verifier) === challenge
  verify secret hash
  consume code
  return { accessToken, tokenType: "Bearer", expiresIn: 3600 }

createApiKey({ rawToken, orgId, name, product, level })
  owner/admin only
  return { rawKey, prefix, ...metadata }

listApiKeys / revokeApiKey

authenticateBearer(header)
  → ctx from oauth_tokens OR api_keys
  api key: org + product + level from the key
  oauth token: user + org; product access still via grants
```

MailGuard export accepts **either** cookie session **or** `Authorization: Bearer <accessToken|apiKey>`.
Same `authorize()` for product action `export` on `mailguard`.

## HTTP

| Method | Path |
| --- | --- |
| GET | `/api/oauth/authorize` query: client_id, redirect_uri, state, code_challenge, code_challenge_method, response_type=code |
| POST | `/api/oauth/token` body: grant_type=authorization_code, client_id, client_secret, code, redirect_uri, code_verifier |
| POST | `/api/orgs/[orgId]/oauth/clients` |
| GET | `/api/orgs/[orgId]/oauth/clients` |
| POST | `/api/orgs/[orgId]/api-keys` `{ name, product, level }` |
| GET | `/api/orgs/[orgId]/api-keys` |
| DELETE | `/api/orgs/[orgId]/api-keys/[keyId]` |

Authorize: if no cookie, redirect to `/login?returnTo=...`. If logged in, 302 to redirect_uri with code.

## UI

`/app`: API keys (prefix only, raw once on create, revoke). OAuth client list.  
`/oauth/demo`: tiny PKCE demo on this origin.

## Tests (`packages/domain/tests/oauth-keys.test.ts`)

- PKCE exchange → token can export if user has operate grant
- Wrong verifier fails
- Reusing code fails
- API key view cannot export; operate can
- Revoked key 401
- Cookie session still works
- Existing identity / invites / grants tests still pass

## Out of scope

Refresh tokens, SAML, Okta, Fastify parity.

## Done when

`npm run test:domain` all green and `next build` lists `/api/oauth/authorize`, `/api/oauth/token`, api-keys routes.
