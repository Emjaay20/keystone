# Next.js decision

Next.js is the runtime. It is not the access-control system.

## Layout

```
apps/web/
  app/
    (auth)/login/page.tsx
    (console)/orgs/...
    api/auth/register/route.ts
    api/auth/login/route.ts
    api/orgs/route.ts
  lib/http.ts          // cookie + error mapping only
packages/domain/
  auth/
  orgs/
  db/
  security/
```

## Allowed in Next

- Route Handler: parse body with Zod → `domain.auth.register()` → `cookies().set(ks_session)`
- Server Component: `domain.auth.me(cookie)` to render the header
- Server Action: thin wrapper that calls the same domain function as the route

## Forbidden in Next

- `mongoose.connect` inside a component
- `role` checks only in JSX (`if (user.role === 'admin')`)
- NextAuth/Auth.js as the grant store
- JWT in `localStorage`
- Trusting `x-org-id` from the client

## Why this still matches the JD

Red Sift lists React, Node, TypeScript, Vercel. Next.js is those three plus the host.
In interview you say: “Next is the adapter. The session and grant engine is a plain
TypeScript package with Jest. I can drop the same domain behind Fastify later.”

The current `apps/api` Fastify files are a working Slice 1 reference. Port them
into `packages/domain` + `apps/web` rather than rewriting behaviour.
