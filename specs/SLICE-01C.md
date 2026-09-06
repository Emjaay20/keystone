# SLICE-01C — Identity UI Pages

Status: **pending**

## Goal
Build the frontend React pages in `apps/web` to consume the Next.js API routes built in SLICE-01B. This wires up the user identity and organization creation flows.

## In scope
- Create Next.js pages: `/`, `/register`, `/login`, and `/app`.
- Forms for registration, login, and organization creation.
- Fetch API routes from client components using `credentials: "include"`.
- Display the authenticated user's email, organization, and role in `/app`.
- Implement basic modern and dynamic UI (e.g. using standard CSS).

## Out of scope
- Modifying `packages/domain` or `apps/api`.
- Any new API routes.
- NextAuth, Clerk, or other external auth UI libraries.
- Slice 02 features (invites, roles, product grants).

## Done when
- `npx next build` lists `/register`, `/login`, and `/app` in the route table.
- A user can register, create an org, and view their details in `/app`.
