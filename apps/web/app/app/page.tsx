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

      </div>

      {/* Audit Log Table */}
      <div className="card">
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><History size={20} /> Audit Log</h2>
        {auditLogs.length === 0 ? (
          <p className="muted" style={{ marginTop: "1rem" }}>No recent activity found.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "1.25rem" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Product</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log._id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td><span className="badge">{log.action}</span></td>
                    <td>{log.target?.product || "—"}</td>
                    <td>
                      <div>
                        Target: {log.target?.name || log.target?.id || "—"}
                      </div>
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        By: {log.actor?.name || log.actor?.id || "System"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


