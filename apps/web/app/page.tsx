import Link from "next/link";
import { Shield } from "lucide-react";

const PRODUCTS = [
  {
    name: "MailGuard",
    blurb: "Email posture. Who can view reports, change config, or operate the product.",
  },
  {
    name: "BrandWatch",
    blurb: "Brand and lookalike monitoring. Access is a grant, not a role on the user.",
  },
  {
    name: "CertRadar",
    blurb: "Certificate inventory. Same door, same audit trail, same deny-by-default.",
  },
];

const PILLARS = [
  {
    k: "01",
    title: "Auth is not authz",
    body: "Passwords, sessions, and Okta only prove who you are. What you may do lives in memberships, plans, and product grants.",
  },
  {
    k: "02",
    title: "One decision log",
    body: "Every mutation is authenticate → authorize → mutate → audit. Missing grant is 403, never an empty 200.",
  },
  {
    k: "03",
    title: "Products stay clients",
    body: "MailGuard, BrandWatch, and CertRadar do not store passwords. They call Keystone over HTTP, OAuth, or API keys.",
  },
  {
    k: "04",
    title: "Policy stays in domain",
    body: "Access rules live in a testable domain module. The console is a client.",
  },
];

const STACK = [
  "TypeScript",
  "Next.js 16 App Router",
  "React 19",
  "MongoDB Atlas",
  "Zod",
  "Jest",
  "Okta OIDC",
  "jose",
  "Vercel",
  "npm workspaces",
];

export default function Home() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <Link href="/" className="lp-nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={24} /> Keystone
        </Link>
        <div className="lp-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 500 }}>
            Sign in
          </Link>
          <Link href="/register" className="btn">
            Get started
          </Link>
        </div>
      </header>

      <section className="lp-hero">
        <p className="lp-kicker">Identity &amp; entitlements</p>
        <h1>The shared door for a security product suite.</h1>
        <p className="lp-hero-lead">
          Keystone is the IAM and entitlements control plane for MailGuard, BrandWatch, and CertRadar.
          Humans and services authenticate here. Authorization — who may do what, on which product, until when — is decided and audited in one place.
        </p>
        <div style={{ marginBottom: "2.5rem", padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--card-border)", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "1rem", fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontSize: "0.85rem", color: "#a5b4fc" }}>
          <span>Session</span> <span style={{ color: "rgba(255,255,255,0.3)" }}>→</span> <span>Membership</span> <span style={{ color: "rgba(255,255,255,0.3)" }}>→</span> <span>Grant</span>
        </div>
        <div className="lp-hero-ctas" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/register" className="btn">
            Create an account
          </Link>
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', fontWeight: 500 }}>
            Sign in to console &rarr;
          </Link>
        </div>
      </section>

      <section className="lp-section">
        <h2>What it gates</h2>
        <p className="lp-section-lead">
          Three products, one identity plane. Org roles say who you are in the tenant. Product grants say what you can do in an app.
        </p>
        <div className="lp-grid">
          {PRODUCTS.map((p) => (
            <article key={p.name} className="lp-tile">
              <h3>{p.name}</h3>
              <p>{p.blurb}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2>How access is decided</h2>
        <p className="lp-section-lead">
          Deny by default. A valid session is not enough. Expired grants are treated as none. AI may propose changes; a human applies them.
        </p>
        <div className="lp-grid lp-grid-2">
          {PILLARS.map((p) => (
            <article key={p.k} className="lp-tile">
              <p className="lp-mono">{p.k}</p>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2>In the console</h2>
        <p className="lp-section-lead">
          Owners run the tenant. Analysts do product work. Credentials are hashed; raw API keys are shown once.
        </p>
        <div className="lp-grid">
          <article className="lp-tile">
            <h3>Members &amp; invites</h3>
            <p>Owner, admin, analyst, billing, readonly. Invites are links with expiry — not a role field on the user.</p>
          </article>
          <article className="lp-tile">
            <h3>Grants &amp; audit</h3>
            <p>Per-product levels: none, view, operate, admin. Every change writes a reason you can read back.</p>
          </article>
          <article className="lp-tile">
            <h3>Keys, OAuth, SSO</h3>
            <p>Hashed API keys, PKCE for product apps, Okta OIDC for enterprise orgs. Keystone still issues ks_session.</p>
          </article>
        </div>
      </section>

      <section className="lp-section lp-cta">
        <div>
          <h2>Stand up a tenant</h2>
          <p>Register, create an org, invite people, grant product access. Okta is a door, not the database.</p>
        </div>
        <Link href="/register" className="btn">
          Get started
        </Link>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span>Keystone · IAM control plane</span>
          <div className="lp-footer-links">
            <a href="https://github.com/Emjaay20/keystone" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
