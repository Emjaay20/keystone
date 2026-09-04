# Architectural style and patterns

## Style

**Modular monolith on Next.js App Router**, not microservices.

One deploy on Vercel: UI + route handlers. IAM rules live in `packages/domain`,
not in React trees. Modules: `auth`, `orgs`, later `grants`, `keys`, `oauth`, `billing`, `ai`.

Why Next: free Vercel Hobby, React/TS you already know, listed on the JD.
Why domain package: so Codex cannot hide authz inside a Server Action.

## Patterns we are using

| Pattern | Where | Why |
| --- | --- | --- |
| **Modular monolith** | `packages/domain` + `app/api/*` | Change auth without touching UI |
| **Hexagonal-lite** | Next is an adapter | Jest tests domain with no Next runtime |
| **Shared kernel** | `packages/shared` | Console and API share role/product names |
| **Repository-lite** | `db/collections.ts` | Typed collections, no magic ORM |
| **Session-based authn** | httpOnly cookie + hashed token | Browser console. Not a SPA JWT in localStorage |
| **Assertion vs authorization** | Okta later / password now | IdP asserts who. Keystone decides what |
| **RBAC + resource grants** | membership role + product grant | Role = who they are in the tenant. Grant = what they can do in an app |
| **Deny by default** | authz helper (Slice 2) | Missing grant is 403 |
| **Policy-as-data** | grants collection | Expiry, reason, actor — queryable |
| **Strangler for SSO** | password first, Okta later | Same `createSession()` both paths |
| **Table-driven tests** | `tests/*.test.ts` | Role × product × action matrix |
| **CQRS-lite for AI** | AI proposes, human applies | Agent output is a command, not a side effect |

## Patterns we are not using

- Microservices / one repo per product
- Event sourcing
- Blockchain
- Hexagonal theater (ports everywhere, no behavior)
- Backend-for-frontend per app in MVP
- NextAuth/Auth.js as the access model (cookie helper later is fine; grants stay ours)
- Server Actions that write to Mongo without going through domain
- `getServerSession` as a substitute for authorize()

## Request pipeline

```
HTTP → Zod parse → load session → authorize(org, action, product?)
     → mutate → audit (from Slice 2) → public DTO
```

Errors: `401` unauthenticated, `403` authenticated but not allowed,
`404` only when the resource is allowed to be known missing,
`409` conflict (duplicate email / membership).

## Multi-tenant rule

Every query that touches tenant data includes `orgId` from the **session**, not from a client-supplied header the user can edit. Path params like `:orgId` are checked against membership before use.
