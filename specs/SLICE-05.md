# SLICE-05 — Plans and entitlements
Status: **ready. Slice 04 is on main.**

## Goal
`org.plan` is enforced. Free / Team / Enterprise unlock different platform features and seat counts. `authorize` reason `plan_feature_locked` becomes real.
No Stripe. Owner (and only owner) can change plan via API — portfolio stand-in for billing.

## Plans
| Plan | seatLimit | api_keys | oauth_clients | sso | ai_operator | access_reviews |
| --- | ---: | --- | --- | --- | --- | --- |
| free | 5 | no | no | no | no | no |
| team | 25 | yes | yes | no | no | no |
| enterprise | 200 | yes | yes | yes | yes | yes |

`sso` and `ai_operator` are flags only in this slice. New orgs stay `free` / seatLimit 5.

## Domain
getEntitlements(plan) → { seatLimit, features: { api_keys, oauth_clients, sso, ai_operator, access_reviews } }

setPlan({ rawToken, orgId, plan })
owner only
writes org.plan + org.seatLimit from table
audit: setPlan allow

assertFeature(org, feature)
if !features[feature] → HttpError 403 code plan_feature_locked

createInvite / acceptInvite
before adding a member: count active memberships
if count >= seatLimit → 403 plan_feature_locked reason "Seat limit reached"

createApiKey / createOauthClient
assertFeature api_keys / oauth_clients

`GET /auth/me` and `GET /orgs` include:
plan, seatLimit, entitlements: { api_keys, oauth_clients, sso, ai_operator, access_reviews },
seatUsed

## HTTP
| Method | Path |
| --- | --- |
| PUT | `/api/orgs/[orgId]/plan` `{ plan: "free" \| "team" \| "enterprise" }` owner only |
| GET | `/api/orgs/[orgId]/entitlements` |

Create key / create client / invite on Free → 403 `plan_feature_locked`.

## UI
`/app` owner: plan, seats used/limit, feature checklist.
Switch to Team / Enterprise / Free.
Disable Create API Key and Create OAuth Client on Free; show “Upgrade to Team”.

## Tests (`packages/domain/tests/plans.test.ts`)
- New org is free; createApiKey 403 `plan_feature_locked`
- setPlan team → createApiKey 200
- setPlan free again → createApiKey 403
- Invite when 5 active members on free → 403
- Analyst cannot setPlan
- Existing suites still pass

## Out of scope
Stripe, Okta, AI agent.

## Done when
`npm run test:domain` all green and `next build` lists `/api/orgs/[orgId]/plan`.

After it finishes, from keystone/:
npm run build -w @keystone/domain
npm run test:domain
cd apps/web && npx next build
git status

Manual: on Free, Create API Key must 403. Switch to Team, create key works.
Paste those outputs here. Cookie helper stays ks_session. No Atlas scripts.
