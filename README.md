# Keystone: Enterprise IAM & Entitlements Platform

Keystone is a production-grade Identity and Access Management (IAM) control plane built for B2B SaaS. It provides multi-tenant authentication, granular Role-Based Access Control (RBAC), Okta SSO federations, and an innovative AI-native "Operator" for managing product grants.

Built specifically to demonstrate expertise in scalable, secure cybersecurity platform engineering.

## 🚀 Key Features

* **Multi-Tenant Architecture:** Secure isolation of users, API keys, and audit logs across dynamic tenant environments.
* **Granular Product Grants (RBAC):** Assign \`view\`, \`operate\`, or \`admin\` rights not just to an organization, but explicitly to individual products (e.g., MailGuard, BrandWatch).
* **AI-Native IAM Operator:** Uses Groq/OpenAI to translate natural language (e.g., *"Grant Jane operate access to MailGuard"*) into strictly validated JSON access control commands.
* **Federated SSO (Okta OIDC):** Custom SAML/OIDC integration allowing enterprise customers to bypass local auth and sign in via their Okta directories.
* **Entitlements & Billing Engine:** Feature gating based on \`Free\`, \`Team\`, and \`Enterprise\` subscription tiers (e.g., blocking SSO/AI features until upgraded).
* **Immutable Audit Logging:** Tracks who changed what and when, ensuring full SOC2/Enterprise compliance.

## 🛠 Tech Stack

* **Frontend:** Next.js (App Router), React, TypeScript, Lucide Icons, React Hot Toast
* **Backend:** Node.js (Modular Domain Driven Design)
* **Database:** MongoDB (via native driver) & MongoMemoryServer for isolated integration testing
* **Testing:** Jest
* **CI/CD & Infra:** CircleCI, Docker, Kubernetes (Manifests included), Vercel

## 📂 Project Structure

This project uses a modern monorepo architecture for strict separation of concerns:

\`\`\`text
keystone/
├── apps/web/           # Next.js App Router (UI & API Endpoints)
│   ├── app/            # Frontend Pages (Dashboard, Settings, Auth)
│   └── lib/            # Next.js specific HTTP/Cookie utilities
├── packages/domain/    # The core Identity & Access Management engine
│   ├── src/ai/         # AI Operator LLM Adapters (Groq/OpenAI)
│   ├── src/auth/       # Passwords, Sessions, RBAC AuthZ
│   ├── src/orgs/       # Multi-tenant management & Invites
│   ├── src/sso/        # Okta PKCE OIDC implementations
│   └── tests/          # Robust Jest Integration Tests
├── k8s/                # Kubernetes deployment manifests
└── Dockerfile          # Multi-stage containerization build
\`\`\`

## 🧠 AI Operator Implementation

The platform includes an AI Operator that dramatically simplifies complex IAM administration. 

1. Admin types: *"Give j.doe@acme.com read access to MailGuard."*
2. The Next.js API passes this to the \`@keystone/domain\` AI service.
3. The LLM Adapter (Groq \`llama3-8b-8192\`) is strictly prompted to return a Zod-validated JSON payload.
4. The system validates the payload against existing active members.
5. A UI preview is generated. Only upon explicit human click (Apply) is the database mutated via \`setGrant\`, logging \`ai.apply\` to the audit trail.

## 🚀 Getting Started

### Local Development

1. **Install Dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment Variables:**
   Ensure you have an \`.env.local\` inside \`apps/web/\` with your MongoDB URI, Okta credentials, and Groq API Key (\`LLM_PROVIDER=groq\`).

3. **Run the Tests:**
   The backend domain is heavily tested using an in-memory MongoDB cluster.
   \`\`\`bash
   npm run test:domain
   \`\`\`

4. **Start the App:**
   \`\`\`bash
   npm run dev:api
   \`\`\`
   Visit \`http://localhost:3000/app\` to view the dashboard.
