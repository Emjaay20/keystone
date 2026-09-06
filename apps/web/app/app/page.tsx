"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  name: string;
  orgId: string | null;
  role: string | null;
};

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  
  const [isInviting, setIsInviting] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [inviteError, setInviteError] = useState("");

  const [grants, setGrants] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isSettingGrant, setIsSettingGrant] = useState(false);
  const [grantError, setGrantError] = useState("");
  const [grantSuccess, setGrantSuccess] = useState("");

  const [exportResult, setExportResult] = useState<any>(null);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) throw new Error("Failed to load session");
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            orgId: data.org?.id || null,
            role: data.role || null
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (user?.orgId) {
      loadGrants();
      if (user.role === "owner" || user.role === "admin") {
        loadAuditLogs();
      }
    }
  }, [user?.orgId, user?.role]);

  const loadGrants = async () => {
    try {
      const res = await fetch(`/api/orgs/${user?.orgId}/grants`);
      if (res.ok) setGrants(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch(`/api/orgs/${user?.orgId}/audit`);
      if (res.ok) setAuditLogs(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setCreatingOrg(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name");

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
      
      const newOrg = await res.json();
      
      setUser({
        id: newOrg.user.id,
        email: newOrg.user.email,
        name: newOrg.user.name,
        orgId: newOrg.org.id,
        role: newOrg.role
      });
    } catch (err: any) {
      setError(err.message);
      setCreatingOrg(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviteError("");
    setInviteToken("");
    setIsInviting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const role = formData.get("role");

    try {
      const res = await fetch(`/api/orgs/${user?.orgId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to invite user");
      }
      
      const data = await res.json();
      setInviteToken(data.token);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleSetGrant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGrantError("");
    setGrantSuccess("");
    setIsSettingGrant(true);

    const formData = new FormData(e.currentTarget);
    const userId = formData.get("userId");
    const product = formData.get("product");
    const level = formData.get("level");
    const reason = formData.get("reason");

    try {
      const res = await fetch(`/api/orgs/${user?.orgId}/grants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, product, level, reason }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Failed to set grant");
      }
      
      setGrantSuccess("Grant successfully updated!");
      (e.target as HTMLFormElement).reset();
      loadGrants();
      loadAuditLogs();
    } catch (err: any) {
      setGrantError(err.message);
    } finally {
      setIsSettingGrant(false);
    }
  };

  const handleTestExport = async () => {
    setExportError("");
    setExportResult(null);
    try {
      const res = await fetch(`/api/products/mailguard/export`);
      const data = await res.json();
      
      if (!res.ok) {
        setExportError(data.reason ? `${data.reasonCode}: ${data.reason}` : (data.error || "Forbidden"));
      } else {
        setExportResult(data);
      }
      
      if (user?.role === "owner" || user?.role === "admin") {
        loadAuditLogs();
      }
    } catch (err: any) {
      setExportError(err.message);
    }
  };

  if (loading) {
    return (
      <main className="center-layout">
        <div style={{ color: "var(--primary)" }}>Loading...</div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h2>Dashboard</h2>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", width: "auto" }}>
          Sign Out
        </button>
      </header>

      {error && <div className="error-msg">{error}</div>}

      {!user.orgId ? (
        <div className="card" style={{ margin: "0 auto" }}>
          <h2>Setup Organization</h2>
          <p className="subtitle" style={{ marginTop: "0.5rem" }}>You need an organization to get started.</p>
          
          <form onSubmit={handleCreateOrg}>
            <div className="form-group">
              <label htmlFor="name">Organization Name</label>
              <input id="name" name="name" type="text" required placeholder="Acme Corp" />
            </div>
            <button type="submit" className="btn" disabled={creatingOrg} style={{ marginTop: "1rem" }}>
              {creatingOrg ? "Creating..." : "Create Organization"}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          <div className="card">
            <h2>Your Profile</h2>
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid var(--card-border)" }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>User ID</span>
                <strong style={{ userSelect: "all" }}>{user.id}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid var(--card-border)" }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid var(--card-border)" }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>Organization ID</span>
                <strong>{user.orgId}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>Role</span>
                <strong style={{ color: "var(--primary)" }}>{user.role}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>MailGuard Export Test</h2>
            <p className="subtitle" style={{ marginBottom: "1rem" }}>Test your product grant for MailGuard 'operate' access.</p>
            <button onClick={handleTestExport} className="btn" style={{ width: "auto" }}>
              Test Export API
            </button>
            {exportError && <div className="error-msg" style={{ marginTop: "1rem" }}>{exportError}</div>}
            {exportResult && (
              <pre style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "6px", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(exportResult, null, 2)}
              </pre>
            )}
          </div>

          <div className="card">
            <h2>Product Grants</h2>
            {grants.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.6)" }}>No grants found.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <th style={{ padding: "0.5rem" }}>User ID</th>
                      <th style={{ padding: "0.5rem" }}>Product</th>
                      <th style={{ padding: "0.5rem" }}>Level</th>
                      <th style={{ padding: "0.5rem" }}>Expires At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grants.map((g) => (
                      <tr key={g._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "0.5rem", fontSize: "0.9rem" }}>{g.principalId}</td>
                        <td style={{ padding: "0.5rem" }}>{g.product}</td>
                        <td style={{ padding: "0.5rem" }}>{g.level}</td>
                        <td style={{ padding: "0.5rem", fontSize: "0.85rem" }}>{g.expiresAt ? new Date(g.expiresAt).toLocaleDateString() : 'Never'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {(user.role === "owner" || user.role === "admin") && (
            <>
              <div className="card">
                <h2>Set Product Grant</h2>
                <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "1.5rem" }}>
                  Grant a member access to a product.
                </p>

                {grantError && <div className="error-msg">{grantError}</div>}
                {grantSuccess && <div style={{ color: "rgb(74, 222, 128)", marginBottom: "1rem" }}>{grantSuccess}</div>}
                
                <form onSubmit={handleSetGrant}>
                  <div className="form-group">
                    <label htmlFor="userId">User ID</label>
                    <input id="userId" name="userId" type="text" required placeholder="User ObjectId" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="product">Product</label>
                    <select id="product" name="product" required style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--card-border)", borderRadius: "8px", color: "white", outline: "none" }}>
                      <option value="mailguard">MailGuard</option>
                      <option value="brandwatch">BrandWatch</option>
                      <option value="certradar">CertRadar</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="level">Level</label>
                    <select id="level" name="level" required style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--card-border)", borderRadius: "8px", color: "white", outline: "none" }}>
                      <option value="none">None</option>
                      <option value="view">View</option>
                      <option value="operate">Operate</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="reason">Reason (for Audit)</label>
                    <input id="reason" name="reason" type="text" required placeholder="Provisioning new analyst" />
                  </div>
                  <button type="submit" className="btn" disabled={isSettingGrant} style={{ marginTop: "1rem" }}>
                    {isSettingGrant ? "Setting..." : "Set Grant"}
                  </button>
                </form>
              </div>

              <div className="card">
                <h2>Invite Members</h2>
                <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "1.5rem" }}>
                  Add new members to your organization.
                </p>

                {inviteError && <div className="error-msg">{inviteError}</div>}
                
                {inviteToken && (
                  <div style={{ padding: "1rem", backgroundColor: "rgba(34, 197, 94, 0.1)", border: "1px solid rgb(34, 197, 94)", borderRadius: "6px", marginBottom: "1.5rem" }}>
                    <p style={{ color: "rgb(74, 222, 128)", fontWeight: 600, marginBottom: "0.5rem" }}>Invite created successfully!</p>
                    <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.8)", marginBottom: "0.5rem" }}>Share this link with the user (it will only be shown once):</p>
                    <code style={{ display: "block", padding: "0.75rem", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "4px", wordBreak: "break-all" }}>
                      {window.location.origin}/accept?token={inviteToken}
                    </code>
                  </div>
                )}

                <form onSubmit={handleInvite}>
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input id="email" name="email" type="email" required placeholder="colleague@acme.com" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="role">Role</label>
                    <select id="role" name="role" required style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--card-border)", borderRadius: "8px", color: "white", outline: "none" }}>
                      <option value="admin">Admin</option>
                      <option value="analyst">Analyst</option>
                      <option value="billing">Billing</option>
                      <option value="readonly">Read-Only</option>
                    </select>
                  </div>
                  <button type="submit" className="btn" disabled={isInviting} style={{ marginTop: "1rem" }}>
                    {isInviting ? "Inviting..." : "Send Invite"}
                  </button>
                </form>
              </div>

              <div className="card">
                <h2>Audit Logs (Last 20)</h2>
                {auditLogs.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.6)" }}>No audit logs found.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                          <th style={{ padding: "0.5rem" }}>Time</th>
                          <th style={{ padding: "0.5rem" }}>Action</th>
                          <th style={{ padding: "0.5rem" }}>Product</th>
                          <th style={{ padding: "0.5rem" }}>Outcome</th>
                          <th style={{ padding: "0.5rem" }}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "0.5rem", fontSize: "0.85rem" }}>{new Date(log.createdAt).toLocaleString()}</td>
                            <td style={{ padding: "0.5rem", fontSize: "0.9rem" }}>{log.action}</td>
                            <td style={{ padding: "0.5rem" }}>{log.product || "-"}</td>
                            <td style={{ padding: "0.5rem" }}>
                              <span style={{ color: log.outcome === "allow" ? "rgb(74, 222, 128)" : "rgb(248, 113, 113)" }}>
                                {log.outcome}
                              </span>
                            </td>
                            <td style={{ padding: "0.5rem", fontSize: "0.85rem" }}>{log.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
