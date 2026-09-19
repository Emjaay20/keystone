"use client";

import { useState, useEffect } from "react";
import { CopyButton } from "../components/copy-button";
import { useAppSession } from "./session-context";
import { User, Shield, CheckCircle2, XCircle, LayoutDashboard, History, Key, Settings, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

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
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (org?.id) {
      fetch(`/api/orgs/${org.id}/audit`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAuditLogs(data.slice(0, 5));
        })
        .catch(console.error);
    }
  }, [org?.id]);

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
      toast.success("Organization created successfully");
      await refresh();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (!user.orgId) {
    return (
      <div className="center-layout">
        <div className="card" style={{ maxWidth: "400px" }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ background: "var(--primary)", padding: "0.75rem", borderRadius: "12px", color: "white" }}>
          <LayoutDashboard size={28} />
        </div>
        <div>
          <h1 className="page-title">{org?.name}</h1>
          <p className="page-lead">Organization Overview</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        
        {/* Profile Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><User size={20} /> My Profile</h2>
          <div className="stack" style={{ marginTop: "1.25rem", gap: "0", flex: 1 }}>
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
              <span className="badge" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <Shield size={14} /> {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Plan Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Sparkles size={20} /> Current Plan</h2>
          <div className="stack" style={{ marginTop: "1.25rem", gap: "0", flex: 1 }}>
            <div className="row">
              <span className="muted">Subscription</span>
              <span className="badge" style={{ textTransform: "uppercase" }}>{org?.plan}</span>
            </div>
            <div className="row" style={{ flexDirection: "column", alignItems: "stretch", paddingBottom: "1.25rem" }}>
              <div className="row" style={{ border: "none", padding: 0 }}>
                <span className="muted">Seats</span>
                <span><strong>{org?.seatUsed}</strong> / {org?.seatLimit}</span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${seatPct}%`, background: seatPct >= 100 ? "var(--danger)" : "var(--primary)" }} />
              </div>
            </div>
            <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
              <p className="muted" style={{ marginBottom: "0.75rem", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Entitlements</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                  const on = Boolean((features as Record<string, boolean>)[key]);
                  return (
                    <div key={key} style={{ display: "flex", gap: "0.5rem", fontSize: "0.9rem", alignItems: "center" }}>
                      {on ? <CheckCircle2 size={16} color="rgb(74,222,128)" /> : <XCircle size={16} color="rgb(248,113,113)" />}
                      <span style={{ color: on ? "white" : "rgba(255,255,255,0.4)" }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        
        {/* Recent Activity */}
        <div className="card">
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><History size={20} /> Recent Activity</h2>
          {auditLogs.length === 0 ? (
            <p className="muted" style={{ marginTop: "1rem" }}>No recent activity found.</p>
          ) : (
            <div className="stack" style={{ marginTop: "1.25rem", gap: "0" }}>
              {auditLogs.map((log: any) => (
                <div key={log._id} className="row" style={{ padding: "0.75rem 0", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ color: "white", fontSize: "0.9rem", fontWeight: 500 }}>{log.actor.name || log.actor.id}</span>
                      <span className="muted" style={{ fontSize: "0.85rem" }}>did</span>
                      <span className="badge" style={{ fontSize: "0.75rem" }}>{log.action}</span>
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      Target: {log.target.id} {log.target.product ? `(${log.target.product})` : ""}
                    </div>
                  </div>
                  <span className="muted" style={{ fontSize: "0.75rem" }}>
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links / Settings */}
        <div className="card">
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Key size={20} /> SSO Configuration</h2>
          {org?.slug ? (
            <>
              <p className="muted" style={{ marginTop: "1rem", marginBottom: "1rem", fontSize: "0.9rem" }}>
                Your Enterprise SSO is configured. Members can sign in using this organization slug.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", background: "rgba(0,0,0,0.3)", padding: "0.75rem", borderRadius: "8px" }}>
                <code style={{ flex: 1, wordBreak: "break-all", fontSize: "1.1rem", color: "var(--primary)" }}>{org.slug}</code>
                <CopyButton text={org.slug} />
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginTop: "1rem" }}>SSO is not enabled on this plan.</p>
          )}
        </div>
      </div>
    </div>
  );
}
