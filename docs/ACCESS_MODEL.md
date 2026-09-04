# Access model

## Principals

- Human user (one person, many orgs)
- Service account (later)
- API key (later) — a credential, not a principal of its own; it acts as a service or user

## Org roles (who they are in the tenant)

| Role | Intent |
| --- | --- |
| owner | Full control, including delete org and transfer ownership |
| admin | People, grants, keys. Cannot delete org |
| analyst | Day-to-day product work |
| readonly | View only |
| billing | Plans and invoices, no product data |

Roles are not product permissions. An analyst still needs a product grant.

## Product grants (what they can do in an app)

| Level | Intent |
| --- | --- |
| none | No access (explicit or missing) |
| view | Read dashboards and reports |
| operate | Change product config, run actions |
| admin | Product-level settings and member product-admin tasks |

## Extra constraint

A grant may have `expiresAt`. Used for contractors. Expired = treated as none.

## Decision order

1. Is there a valid session?
2. Is the user an active member of this org?
3. Does the plan allow this feature?
4. Does the role allow this *platform* action? (invite, billing, …)
5. Does a non-expired product grant allow this *product* action?
6. Audit the decision when it is a mutation or an explicit deny on a sensitive read.
