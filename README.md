# Keystone

IAM and entitlements control plane for a multi-product cybersecurity suite.

Modular monolith on **Next.js App Router**: UI + `/api` on Vercel. IAM rules live in `packages/domain`, not in pages. Okta is optional enterprise SSO, not the product.

## Slices

| Slice | Status |
| --- | --- |
| 01 Identity | Scaffolded — run tests |
| 01B Domain + Web | Done |
| 01C UI Pages | Spec ready |
| 02 Invites | Spec ready |
| 03 Grants + audit + deny reasons | Next |
| 04 Product OAuth + API keys | Later |
| 05 Plans | Later |
| 06 Okta SSO | Later |
| 07 Admin console + AI operator | Later |

## Run tests

```bash
cd keystone
npm install
npm run test:api
```

## Docs

- `docs/AGENTS.md` — Grok / Codex / Copilot / Gemini
- `docs/PATTERNS.md` — style and patterns
- `docs/FREE_STACK.md` — free toolchain
- `docs/PROMPTS.md` — paste into other agents
- `docs/ARCHITECTURE.md`
- `docs/ACCESS_MODEL.md`
- `docs/THREAT_MODEL.md`
- `specs/SLICE-*.md`
