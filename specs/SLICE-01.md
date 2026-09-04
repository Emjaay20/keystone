# SLICE-01 — Identity (current)

Status: **scaffolded in repo. Verify with tests, then freeze.**

## Goal

A person can register, log in, log out, create an organization, list only their orgs, and switch org. Session cookie identifies user + current tenant.

## In scope

Existing endpoints:

- `POST /auth/register` `{ email, name, password }`
- `POST /auth/login` `{ email, password }`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /orgs` `{ name }` → creator is owner, session binds to org
- `GET /orgs` → membership-scoped
- `POST /orgs/:orgId/switch` → revoke old session, new cookie

Collections: `users`, `orgs`, `memberships`, `sessions`.

## Out of scope

Invites, grants, audit, OAuth, API keys, Okta, React console, AI operator.

## Tests that must pass

`apps/api/tests/identity.test.ts`

- register → create org → `/auth/me` has org + owner
- short password rejected; unknown login same message
- stranger `GET /orgs` is `[]`

## Done when

`npm run test:api` is green on your machine and the repo is on GitHub.
