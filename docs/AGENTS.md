# Agent operating model

Four agents. One architecture. Nobody gets to redesign the house mid-build.

## Source of truth (in this order)

1. `docs/ARCHITECTURE.md`
2. `docs/ACCESS_MODEL.md`
3. `docs/THREAT_MODEL.md`
4. `docs/PATTERNS.md`
5. `docs/FREE_STACK.md`
6. `specs/SLICE-*.md` for the slice you are on
7. Tests under `packages/domain` / `apps/web` as the current spec says

If an agent wants to change 1–5, that is an architecture change. Bring it to Grok first. Do not let Codex or Copilot “simplify” tenancy or replace sessions with JWT-in-localStorage.

## Roles

| Agent | Job | Allowed to | Not allowed to |
| --- | --- | --- | --- |
| **Grok** | Architect, security, slice spec, review | Change docs 1–5, write specs, reject PRs | Dump a whole app in one shot without a spec |
| **Codex** | Implement the current `specs/SLICE-*.md` | Write code + tests that match the spec | Invent new collections, swap the stack, add Okta early |
| **GitHub Copilot** | In-editor autocomplete | Fill in boilerplate inside an open file | Set architecture via chat; accept auth code unreviewed |
| **Gemini** | Docs, UX copy, second-pass review, test-case brainstorm | README, error strings, extra test ideas | Change access model or session design |

You are the merge gate. Agents propose. You apply.

## How a slice runs

1. Grok writes or updates `specs/SLICE-0N.md` (goal, files, API, tests, out of scope).
2. You paste that spec into **Codex** with the system prompt in `docs/PROMPTS.md`.
3. Codex implements. You run `npm run test:api`.
4. You paste the diff + spec into **Gemini**: “review against the spec and THREAT_MODEL. Do not redesign.”
5. You paste Gemini’s findings into **Grok** if anything touches auth, tenancy, or tokens.
6. Copilot only while you type in the files Codex already created.

Never start a slice in four chats at once. That is how you get two user models.

## Hard stops (any agent)

- No Auth0 / Clerk / SuperTokens as the core IdP.
- No `role` field on `users`.
- No product grants until Slice 2 spec exists.
- No Okta until the SSO spec exists.
- No Kubernetes in MVP.
- No WordPress / PHP in this repo.
- Next.js is the runtime. Do not introduce a second Fastify service unless Grok re-opens that decision.
- No NextAuth as the grant engine. No Clerk. Domain functions own register/login/authorize.
- Passwords hashed. Session tokens hashed. Cookies httpOnly.
- Every mutating route: authenticate → authorize → mutate → (audit from Slice 2).
