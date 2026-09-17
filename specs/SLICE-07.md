# SLICE-07 — AI operator (propose, do not apply)

Status: **ready. Slices 01–06 work. `entitlements.ai_operator` is true only on enterprise.**

## Goal

An owner/admin on an **enterprise** org can type a request in English. Keystone calls one LLM behind an adapter. The model returns a **structured command**. The UI shows the command. A human clicks Apply. Only then does `setGrant` run. The model never writes Mongo.

## Command schema (strict)

```
{
  action: "set_grant" | "revoke_grant" | "explain" | "reject"
  userId?: string
  email?: string
  product?: "mailguard" | "brandwatch" | "certradar"
  level?: "none" | "view" | "operate" | "admin"
  expiresAt?: string | null
  reason: string
  confidence: number
}
```

## Domain

proposeGrant — enterprise + owner/admin, call adapter, Zod-parse, **do not setGrant**, audit `ai.propose`.  
applyProposal — same authz as setGrant, then setGrant, audit `ai.apply`.  
llmAdapter: `mock` (tests + default) and openai-compatible if `GROQ_API_KEY` / `OPENAI_API_KEY`. Timeout 12s.

Invalid JSON → `action: "reject"`. Never invent userIds not in the member list.

## HTTP

POST `/api/orgs/[orgId]/ai/propose` `{ prompt }`  
POST `/api/orgs/[orgId]/ai/apply` `{ command }`  
Free/Team → 403 `plan_feature_locked`.

## UI

Enterprise: prompt + Propose + command preview + Apply / Discard.  
Free/Team: “AI operator is an Enterprise feature”.

## Tests (`packages/domain/tests/ai-operator.test.ts`)

Mock adapter only. Team 403. Propose does not mutate grants. Apply mutates. Garbage JSON → reject. Fixture “give jane operate on mailguard” → set_grant. Other suites still pass.

## Out of scope

LangGraph, Okta changes, Stripe, spending dashboards.

## Done when

`npm run test:domain` green and `next build` lists the two `/ai/` routes.
