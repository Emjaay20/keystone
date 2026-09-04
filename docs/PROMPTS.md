# Copy-paste prompts

Replace the slice number. Always attach the spec file contents.

## Codex — implement

```
You are implementing Keystone, a modular-monolith IAM system on Next.js App Router (Node 20, TypeScript, Mongo driver, Jest). IAM logic belongs in packages/domain. Route handlers in apps/web/app/api only adapt HTTP ↔ domain. Do not hash passwords or authorize inside page.tsx.

Read and obey, in order:
- docs/ARCHITECTURE.md
- docs/ACCESS_MODEL.md
- docs/THREAT_MODEL.md
- docs/PATTERNS.md
- docs/AGENTS.md
- the attached specs/SLICE-0N.md

Rules:
- Do not add libraries not in package.json unless the spec says so.
- Do not put role on users.
- Do not introduce Okta, Clerk, Auth0, or JWTs in localStorage.
- Session tokens stored hashed. Cookies httpOnly.
- Match existing domain style. Do not add Fastify back.
- Add or extend Jest tests named in the spec.
- If the spec is silent, ask. Do not invent collections.

Implement ONLY what the spec lists as in scope. Output files and a short summary of commands to run.
```

## Gemini — review

```
You are reviewing a diff for Keystone IAM.

Check it ONLY against:
- the attached specs/SLICE-0N.md
- docs/THREAT_MODEL.md
- docs/ACCESS_MODEL.md

Do not propose a new architecture.
Flag: tenant leaks, unhashed secrets, missing authz, role on user, client-supplied orgId trusted blindly, tests that assert the wrong thing.
Return: severity list + exact file suggestions. No rewrite of the whole module unless a finding requires it.
```

## Copilot — standing instruction (put in repo root as .github/copilot-instructions.md)

Already mirrored in `AGENTS.md`. Keep chats in Copilot short: “complete this handler to match session.ts patterns.”

## Grok — when you come back here

```
Slice N of Keystone. Here is the diff / test output / Gemini review.
Do not expand scope. Tell me what to merge, what to fix, and the next spec.
```
