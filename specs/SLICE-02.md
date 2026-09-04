# SLICE-02 — Invites (next)

Status: **specified, not implemented. Wait for Slice 1 green.**

## Goal

An owner or admin can invite someone by email into the current org. Invitee accepts and becomes a member with the invited role. This is the first admin procedure.

## In scope

- Collection `invites`: orgId, email, role, tokenHash, expiresAt, invitedBy, acceptedAt
- `POST /orgs/:orgId/invites` `{ email, role }` — owner/admin only; cannot invite `owner`
- `GET /orgs/:orgId/invites` — owner/admin
- `POST /invites/accept` `{ token }` — auth required; email must match session user
- Token shown once at create (like an API key). Stored hashed. TTL 7 days.
- Duplicate active invite for same email+org → 409
- Existing active member → 409
- Audit row optional if audit collection exists; otherwise skip until Slice 3

## Out of scope

Email sending (return token in JSON; README says “in production this goes out by email”).
Product grants. Okta/SCIM. React UI.

## Tests

- Owner invites analyst → accept as that user → membership active
- Analyst cannot invite
- Stranger cannot accept another person’s invite
- Expired token 400
- Switch into the org after accept

## Codex

Implement only this spec. Reuse `requireUser`, `sha256`, `randomToken`, `HttpError`.
