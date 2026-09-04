Keystone is a modular-monolith IAM API. Follow docs/AGENTS.md and docs/PATTERNS.md.

Do not put role on users. Do not use localStorage JWTs. Hash passwords and session tokens. Scope every tenant query by membership/session orgId. Do not add Okta, Auth0, or Clerk unless the current specs/SLICE-*.md says so.
