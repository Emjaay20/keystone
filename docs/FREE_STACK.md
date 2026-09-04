# Free toolchain

Everything below has a usable free tier. Paid tools are optional.

## Must have

| Piece | Free choice | Notes |
| --- | --- | --- |
| Language | Node 20+ / TypeScript | Already on your machine |
| App | Next.js App Router (App + Route Handlers) | One Vercel project |
| IAM logic | `packages/domain` | Tested without Next |
| Database | [MongoDB Atlas M0](https://www.mongodb.com/atlas) | Free cluster |
| Tests | Jest + mongodb-memory-server | Domain tests need no Atlas |
| Git | GitHub free private repo | |
| CI | GitHub Actions | domain tests + `next build` |
| Host | Vercel Hobby | UI + `/api` together |
| Secrets | GitHub Actions secrets + host env vars | Never commit `.env` |
| SSO later | [Okta Integrator Free Plan](https://developer.okta.com) | One org, one OIDC app |
| LLM for AI operator later | Groq / Gemini API free tier / OpenAI trial | Behind one adapter |

## Local without Atlas

Tests use in-memory Mongo. For `npm run dev` (Next):

1. Atlas M0 + `MONGO_URI` in `.env.local`, or
2. Docker `mongo:7` if you already have Docker (not required).

## Agents (your existing ones)

| Agent | Cost assumption | Use |
| --- | --- | --- |
| Grok | SuperGrok | Architecture, specs, review |
| Codex | whatever plan you have | Implement slice specs |
| Copilot | existing | Autocomplete only |
| Gemini | existing | Docs + review |

Do not pay for extra SaaS (Auth0 paid, Clerk, Planetscale, k8s) for this portfolio.

## What you install tonight

```bash
# Node 20+
node -v

# clone / copy this repo, then
cd keystone
npm install
npm run test:api
```

Create a GitHub repo and push. That is Slice 0 complete.
