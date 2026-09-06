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
        <div className="card" style={{ margin: "0 auto", maxWidth: "600px" }}>
          <h2>Your Profile</h2>
          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
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
      )}

      {user?.orgId && (user.role === "owner" || user.role === "admin") && (
        <div className="card" style={{ margin: "2rem auto 0", maxWidth: "600px" }}>
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
      )}
    </main>
  );
}
