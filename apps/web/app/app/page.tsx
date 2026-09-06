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
        if (data) setUser(data);
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
    </main>
  );
}
