# Keystone

IAM and entitlements control plane for MailGuard, BrandWatch, and CertRadar.

Humans and services authenticate here. Authorization — who may do what, on which product, until when — is decided and audited in one place.

Demo: https://keystone-web-lovat.vercel.app  
Repo: https://github.com/Emjaay20/keystone

## Architecture

Modular monolith on Next.js App Router. UI and HTTP adapters in `apps/web`. IAM rules live in `packages/domain` and are tested without Next. Okta is optional SSO, not the product.

## Slices

| Slice | What shipped |
| --- | --- |
| 01 Auth & orgs | Sessions, tenant isolation, organization setup |
| 02 Members & invites | Org roles and invite links |
| 03 Grants & audit | Per-product levels, deny-by-default, audit log |
| 04 Credentials | Hashed API keys, OAuth PKCE clients |
| 05 Plans | Free / Team / Enterprise feature gates |
| 06 SSO | Okta OIDC; Keystone still issues `ks_session` |
| 07 AI operator | LLM proposes a grant command; a human applies it |

## Local

```bash
npm install
npm run test:domain
cd apps/web && npm run dev
```

Put `MONGO_URI` in `apps/web/.env.local`. Optional: Okta vars, `LLM_PROVIDER=groq`, `GROQ_API_KEY`.
