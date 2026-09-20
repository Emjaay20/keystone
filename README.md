# Keystone

Keystone is the IAM and entitlements control plane for a suite of three security products: MailGuard, BrandWatch, and CertRadar. Humans and services authenticate here. Authorization — who may do what, on which product, until when — is decided and audited in one place.

Demo: https://keystone-web-lovat.vercel.app

## Architecture & Slices

This project is structured as a modular monolith built over 7 slices:

*   **Slice 01 (Auth & Orgs):** Core tenant isolation, user sessions, and organization management.
*   **Slice 02 (Members & Invites):** Role-based access control (RBAC) at the tenant level, with secure invitation workflows.
*   **Slice 03 (Product Grants & Audit):** Granular access levels (`view`, `operate`, `admin`) per product, backed by an immutable audit log.
*   **Slice 04 (Service Credentials):** API keys and OAuth clients with PKCE for service-to-service and third-party app authentication.
*   **Slice 05 (Billing & Entitlements):** Subscription plans (Free, Team, Enterprise) and feature gating based on plan tiers.
*   **Slice 06 (Enterprise SSO):** Okta OIDC federation, allowing enterprise customers to sign in using their organization slug.
*   **Slice 07 (AI Operator):** An LLM-powered assistant (Groq/OpenAI) that translates natural language into strictly validated JSON access control commands for human review and application.

## Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Ensure you have an `.env.local` inside `apps/web/` with your MongoDB URI, Okta credentials, and Groq API Key (`LLM_PROVIDER=groq`).

3. **Run the Tests:**
   The backend domain logic is thoroughly tested using an in-memory MongoDB cluster.
   ```bash
   npm run test:domain
   ```

4. **Start the App:**
   ```bash
   cd apps/web && npx next dev
   ```
   Visit `http://localhost:3000` to view the application.
