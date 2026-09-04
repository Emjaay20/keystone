# Keystone architecture

## What this system is

Keystone is the shared door for three security products:

- MailGuard (email posture)
- BrandWatch (brand / lookalike)
- CertRadar (certificate inventory)

Humans and services authenticate here. Product apps do not store passwords.
Authorization decisions (who may do what, on which product, until when)
live here so they can be audited in one place.

## Shape

```
apps/web            Next.js App Router (console UI + HTTP adapters)
apps/mailguard      later — small Next or Vite stub that uses Keystone OAuth
packages/domain     framework-agnostic IAM (auth, orgs, grants, keys)
packages/shared     types + constants + zod contracts
apps/api            Fastify scaffold from Slice 1 — port into domain + retire
```

**Decision (2026-09-04): Next.js is the application runtime.**
Vercel is on the Red Sift stack; you already ship Next in production. We still
do not put policy inside `page.tsx`.

- `packages/domain` is the source of truth (sessions, memberships, grants).
- `app/api/*` route handlers only parse HTTP, call domain, set cookies, map errors.
- Server Components may *read* session context. They must not hash passwords
  or write grants inline.
- Product apps remain clients of the same HTTP API. They do not embed domain.

## Hard rules

1. Authentication is not authorization.
2. Every mutating request: authenticate → authorize → mutate → audit.
3. Tokens and API keys are stored hashed. Raw values are shown once.
4. Deny by default. Missing grant means 403, never 200 with empty magic.
5. AI may propose changes. A human confirms them in MVP.

## Slice map

| Slice | Ships |
| --- | --- |
| 1 (now) | Register, login, session, create org, membership |
| 2 | Roles, product grants, expiry, deny reasons |
| 3 | Admin console UX |
| 4 | OAuth for product apps + API keys |
| 5 | Plans / entitlements |
| 6 | AI operator + evals |
