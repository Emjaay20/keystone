"use client";

import { useState } from "react";
import { CopyButton } from "../components/copy-button";
import { useAppSession } from "./session-context";

const FEATURE_LABELS: Record<string, string> = {
  api_keys: "API keys",
  oauth_clients: "OAuth clients",
  sso: "SSO",
  ai_operator: "AI operator",
  access_reviews: "Access reviews",
};

export default function OrgPage() {
  const { user, org, refresh } = useAppSession();
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreateOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setCreating(true);
    const name = new FormData(e.currentTarget).get("name");
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create org");
      }
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (!user.orgId) {
    return (
      <div className="center-layout">
        <div className="card">
          <h2>Set up your organization</h2>
          <p className="subtitle" style={{ marginTop: "0.5rem" }}>Create a tenant to manage members and access.</p>
          {error && <div className="error-msg" role="alert">{error}</div>}
          <form onSubmit={handleCreateOrg}>
            <div className="form-group">
              <label htmlFor="name">Organization name</label>
              <input id="name" name="name" type="text" required placeholder="Acme Corp" />
            </div>
            <button type="submit" className="btn" disabled={creating}>
              {creating ? "Creating..." : "Create organization"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const features = org?.entitlements ?? {};
  const seatPct = org ? Math.min(100, (org.seatUsed / org.seatLimit) * 100) : 0;

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">{org?.name}</h1>
        <p className="page-lead">Organization overview</p>
      </div>

      <div className="card">
        <h2>Profile</h2>
        <div className="stack" style={{ marginTop: "1.25rem", gap: "0" }}>
          <div className="row">
            <span className="muted">Name</span>
            <strong>{user.name}</strong>
          </div>
          <div className="row">
            <span className="muted">Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="row">
            <span className="muted">Role</span>
            <span className="badge">{user.role}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Plan</h2>
        <div className="stack" style={{ marginTop: "1.25rem", gap: "0" }}>
          <div className="row">
            <span className="muted">Current plan</span>
            <span className="badge">{org?.plan}</span>
          </div>
          <div className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div className="row" style={{ border: "none", padding: 0 }}>
              <span className="muted">Seats</span>
              <span><strong>{org?.seatUsed}</strong> / {org?.seatLimit}</span>
            </div>
            <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${seatPct}%`, background: seatPct >= 100 ? "var(--danger)" : "var(--primary)" }} />
            </div>
          </div>
          <div style={{ paddingTop: "1rem" }}>
            <p className="muted" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>Features</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                const on = Boolean((features as Record<string, boolean>)[key]);
                return (
                  <div key={key} style={{ display: "flex", gap: "0.5rem", fontSize: "0.9rem" }}>
                    <span style={{ color: on ? "rgb(74,222,128)" : "rgb(248,113,113)" }} aria-hidden>{on ? "✓" : "–"}</span>
                    <span style={{ color: on ? "white" : "rgba(255,255,255,0.4)" }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {org?.slug && (
        <div className="card">
          <h2>SSO slug</h2>
          <p className="page-lead" style={{ marginBottom: "1rem" }}>Members sign in with Okta using this organization slug.</p>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <code style={{ flex: 1, padding: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: "6px", wordBreak: "break-all" }}>{org.slug}</code>
            <CopyButton text={org.slug} />
          </div>
        </div>
      )}
    </div>
  );
}
