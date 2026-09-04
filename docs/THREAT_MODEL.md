# Threat model — Slice 1 (identity)

We only defend what this slice implements. Everything else is listed as deferred.

## Assets

- User passwords
- Session tokens
- Email addresses (account enumeration)
- Org membership (who is an owner)

## Threats we handle now

| Threat | Control |
| --- | --- |
| Stolen password database | Argon2id hashes, unique salt per user |
| Session theft from JS | httpOnly + Secure + SameSite cookies |
| Session fixation | New session id on login |
| User enumeration via login | Same error text and similar timing for bad email vs bad password |
| Weak passwords | Minimum 12 characters |
| Cross-org data leak | Every org query is scoped by membership |

## Deferred (do not pretend we have these yet)

- MFA / step-up
- Device binding / session risk
- Rate limiting and lockout (add before public internet)
- Email verification
- SSO / SAML / OIDC provider
- Refresh-token rotation
- CSRF for cookie-authenticated browser POSTs (SameSite=Lax is a start, not the end)
