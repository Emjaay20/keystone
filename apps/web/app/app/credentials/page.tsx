"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "../../components/copy-button";
import { useAppSession } from "../session-context";

type ApiKey = { _id: string; name: string; prefix: string; product: string; level: string; revokedAt: string | null };
type OauthClient = { _id: string; name: string; clientId: string; redirectUris: string[] };

function idOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "$oid" in (v as object)) return String((v as { $oid: string }).$oid);
  return String(v ?? "");
}

export default function CredentialsPage() {
  const { user, org, refresh } = useAppSession();
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [oauthClients, setOauthClients] = useState<OauthClient[]>([]);
  const [newApiKeyRaw, setNewApiKeyRaw] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [oauthError, setOauthError] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const canKeys = Boolean(org?.entitlements?.api_keys);
  const canOauth = Boolean(org?.entitlements?.oauth_clients);

  async function load() {
    const [k, c] = await Promise.all([
      fetch(`/api/orgs/${user.orgId}/api-keys`, { credentials: "include" }),
      fetch(`/api/orgs/${user.orgId}/oauth/clients`, { credentials: "include" }),
    ]);
    if (k.ok) setApiKeys(await k.json());
    if (c.ok) setOauthClients(await c.json());
  }

  useEffect(() => {
    if (user.orgId) load();
  }, [user.orgId]);

  async function handleCreateApiKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApiKeyError("");
    setNewApiKeyRaw("");
    setIsCreatingKey(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/orgs/${user.orgId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), product: fd.get("product"), level: fd.get("level") }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to create API key");
      setNewApiKeyRaw(data.rawKey);
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err: any) {
      setApiKeyError(err.message);
    } finally {
      setIsCreatingKey(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    const res = await fetch(`/api/orgs/${user.orgId}/api-keys/${keyId}`, { method: "DELETE", credentials: "include" });
    if (res.ok) await load();
  }

  async function handleCreateOauthClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOauthError("");
    setNewClientId("");
    setIsCreatingClient(true);
    const fd = new FormData(e.currentTarget);
    const redirectUris = String(fd.get("redirectUris") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fetch(`/api/orgs/${user.orgId}/oauth/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), redirectUris }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to create OAuth client");
      if (data.clientId) setNewClientId(data.clientId);
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err: any) {
      setOauthError(err.message);
    } finally {
      setIsCreatingClient(false);
    }
  }

  async function upgrade(plan: string) {
    if (!confirm(`Switch plan to ${plan}?`)) return;
    const res = await fetch(`/api/orgs/${user.orgId}/plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
      credentials: "include",
    });
    if (res.ok) await refresh();
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Credentials</h1>
        <p className="page-lead">API keys and OAuth clients</p>
      </div>

      <div className="card">
        <h2>API keys</h2>
        <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "1.25rem" }}>Service credentials for product access. The raw key is shown once.</p>
        {apiKeyError && <div className="error-msg" role="alert">{apiKeyError}</div>}
        {newApiKeyRaw && (
          <div className="secret-box" style={{ marginBottom: "1.25rem" }}>
            <p style={{ color: "rgb(74,222,128)", fontWeight: 600 }}>Copy this key now. You will not see it again.</p>
            <code>{newApiKeyRaw}</code>
            <div style={{ marginTop: "0.75rem" }}><CopyButton text={newApiKeyRaw} /></div>
          </div>
        )}
        {!canKeys && (
          <div style={{ padding: "1rem", border: "1px solid rgba(234,179,8,0.4)", borderRadius: "8px", marginBottom: "1.25rem" }}>
            <p style={{ color: "rgb(234,179,8)", fontWeight: 600 }}>API keys require Team or higher</p>
            {user.role === "owner" && (
              <button type="button" className="btn" onClick={() => upgrade("team")} style={{ width: "auto", marginTop: "0.75rem" }}>Upgrade to Team</button>
            )}
          </div>
        )}
        <form onSubmit={handleCreateApiKey} style={{ marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label htmlFor="keyName">Name</label>
            <input id="keyName" name="name" type="text" required placeholder="Production sync" disabled={!canKeys} />
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="keyProduct">Product</label>
              <select id="keyProduct" name="product" required disabled={!canKeys}>
                <option value="mailguard">MailGuard</option>
                <option value="brandwatch">BrandWatch</option>
                <option value="certradar">CertRadar</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="keyLevel">Level</label>
              <select id="keyLevel" name="level" required disabled={!canKeys}>
                <option value="view">View</option>
                <option value="operate">Operate</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn" disabled={isCreatingKey || !canKeys} style={{ width: "auto" }}>
            {isCreatingKey ? "Creating..." : "Create API key"}
          </button>
        </form>
        {apiKeys.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Product</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((k) => (
                  <tr key={idOf(k._id)} style={{ opacity: k.revokedAt ? 0.5 : 1 }}>
                    <td>{k.name}</td>
                    <td><code>{k.prefix}…</code></td>
                    <td>{k.product}</td>
                    <td>{k.level}</td>
                    <td>{k.revokedAt ? "Revoked" : "Active"}</td>
                    <td>
                      {!k.revokedAt && (
                        <button type="button" onClick={() => handleRevoke(idOf(k._id))} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>OAuth clients</h2>
        <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "1.25rem" }}>Product apps that sign users in with PKCE.</p>
        {oauthError && <div className="error-msg" role="alert">{oauthError}</div>}
        {newClientId && (
          <div className="secret-box" style={{ marginBottom: "1.25rem" }}>
            <p style={{ color: "rgb(74,222,128)", fontWeight: 600 }}>Client ID</p>
            <code>{newClientId}</code>
            <div style={{ marginTop: "0.75rem" }}><CopyButton text={newClientId} /></div>
          </div>
        )}
        {!canOauth && (
          <div style={{ padding: "1rem", border: "1px solid rgba(234,179,8,0.4)", borderRadius: "8px", marginBottom: "1.25rem" }}>
            <p style={{ color: "rgb(234,179,8)", fontWeight: 600 }}>OAuth clients require Team or higher</p>
            {user.role === "owner" && (
              <button type="button" className="btn" onClick={() => upgrade("team")} style={{ width: "auto", marginTop: "0.75rem" }}>Upgrade to Team</button>
            )}
          </div>
        )}
        <form onSubmit={handleCreateOauthClient} style={{ marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label htmlFor="clientName">App name</label>
            <input id="clientName" name="name" type="text" required placeholder="MailGuard Dev" disabled={!canOauth} />
          </div>
          <div className="form-group">
            <label htmlFor="redirectUris">Redirect URIs (comma separated)</label>
            <input id="redirectUris" name="redirectUris" type="text" required placeholder="http://localhost:3000/oauth/demo" disabled={!canOauth} />
          </div>
          <button type="submit" className="btn" disabled={isCreatingClient || !canOauth} style={{ width: "auto" }}>
            {isCreatingClient ? "Creating..." : "Create client"}
          </button>
        </form>
        {oauthClients.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Client ID</th>
                  <th>Redirect URIs</th>
                </tr>
              </thead>
              <tbody>
                {oauthClients.map((c) => (
                  <tr key={idOf(c._id)}>
                    <td>{c.name}</td>
                    <td><code>{c.clientId}</code></td>
                    <td>{c.redirectUris.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => router.push("/oauth/demo")} style={{ width: "auto", marginTop: "1rem" }}>
          Open PKCE demo
        </button>
      </div>
    </div>
  );
}
