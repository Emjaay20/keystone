# SLICE-01B — Domain extraction & Next.js Scaffold

Status: **pending**

## Goal
Extract identity, session, and organization business logic out of `apps/api` into a framework-agnostic `packages/domain` package.
Create a Next.js `apps/web` application to act as the primary runtime (App Router) where route handlers and Server Actions adapt HTTP and call the domain logic.

## In scope
- Create `packages/domain` providing IAM functions (register, login, logout, me, org creation, switching, list).
- Set up `apps/web` with Next.js App Router (no Tailwind, no NextAuth, no Clerk).
- Route handlers in `apps/web/app/api/...` wrap domain functions.
- Keep `apps/api` working (refactor its Fastify routes to use `packages/domain` or leave it untouched but verify tests pass).
- Add tests in `packages/domain` ensuring the core logic works without HTTP wrappers.

## Out of scope
- AI operator, billing, product permissions.
- Deleting `apps/api`.
- Modifying the underlying data model (no new collections, fields, or ORMs like Prisma/Mongoose).
- Slice 02 features (roles, product grants).

## Tests that must pass
`apps/api/tests/identity.test.ts` (3 tests)
`packages/domain/tests/identity.test.ts` (3 tests)

## Done when
`npm run test:api` passes.
`npm run test:domain` passes.
`npx next build` succeeds in `apps/web`.
