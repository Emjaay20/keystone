"use client";

import { useEffect, useState } from "react";
import { useAppSession } from "../session-context";
import toast from "react-hot-toast";

type Member = { id: string; email: string; name: string };
type Grant = { _id: string; principalId: string; product: string; level: string; expiresAt: string | null };

function idOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "$oid" in (v as object)) return String((v as { $oid: string }).$oid);
  return String(v ?? "");
}

export default function AccessPage() {
  const { user, org } = useAppSession();
  const canGrant = user.role === "owner" || user.role === "admin";
  const [members, setMembers] = useState<Member[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [grantError, setGrantError] = useState("");
  
  const [isSettingGrant, setIsSettingGrant] = useState(false);
  const [exportResult, setExportResult] = useState<unknown>(null);
  const [exportError, setExportError] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCommand, setAiCommand] = useState<any>(null);
  const [isProposing, setIsProposing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [aiError, setAiError] = useState("");

  async function load() {
    const [g, m] = await Promise.all([
      fetch(`/api/orgs/${user.orgId}/grants`, { credentials: "include" }),
      fetch(`/api/orgs/${user.orgId}/members`, { credentials: "include" }),
    ]);
    if (g.ok) setGrants(await g.json());
    if (m.ok) setMembers(await m.json());
  }

  useEffect(() => {
    if (user.orgId) load();
  }, [user.orgId]);

  function memberLabel(principalId: unknown) {
    const id = idOf(principalId);
    const m = members.find((x) => x.id === id);
    return m ? `${m.name} (${m.email})` : id;
  }

  async function handleSetGrant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGrantError("");
    toast.success("Grant saved successfully!");
    setIsSettingGrant(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/orgs/${user.orgId}/grants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: fd.get("userId"),
          product: fd.get("product"),
          level: fd.get("level"),
          reason: fd.get("reason"),
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "Failed to set grant");
      toast.success("Grant saved successfully!");
      (e.target as HTMLFormElement).reset();
      await load();
      toast.success("AI command applied successfully");
    } catch (err: any) {
      setGrantError(err.message);
    } finally {
      setIsSettingGrant(false);
    }
  }

  async function handleTestExport() {
    setExportError("");
    setExportResult(null);
    const res = await fetch("/api/products/mailguard/export", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) setExportError(data.reason ? `${data.reasonCode}: ${data.reason}` : (data.error || "Forbidden"));
    else setExportResult(data);
  }

  async function handleAiPropose() {
    setIsProposing(true);
    setAiError("");
    setAiCommand(null);
    try {
      const res = await fetch(`/api/orgs/${user.orgId}/ai/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to propose");
      setAiCommand(data);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsProposing(false);
    }
  }

  async function handleAiApply() {
    setIsApplying(true);
    setAiError("");
    try {
      const res = await fetch(`/api/orgs/${user.orgId}/ai/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: aiCommand }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to apply");
      setAiCommand(null);
      setAiPrompt("");
      await load();
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Access</h1>
        <p className="page-lead">Product grants for this organization</p>
      </div>

      <div className="card">
        <h2>Grants</h2>
        {grants.length === 0 ? (
          <p className="muted" style={{ marginTop: "1rem" }}>No grants yet.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "1rem" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Product</th>
                  <th>Level</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={idOf(g._id)}>
                    <td>{memberLabel(g.principalId)}</td>
                    <td>{g.product}</td>
                    <td>{g.level}</td>
                    <td>{g.expiresAt ? new Date(g.expiresAt).toLocaleDateString() : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canGrant && (
        <div className="card">
          <h2>Set grant</h2>
          <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "1.25rem" }}>Give a member access to a product.</p>
          {grantError && <div className="error-msg" role="alert">{grantError}</div>}
          
          <form onSubmit={handleSetGrant}>
            <div className="form-group">
              <label htmlFor="userId">Member</label>
              <select id="userId" name="userId" required>
                <option value="">Select member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="product">Product</label>
              <select id="product" name="product" required>
                <option value="mailguard">MailGuard</option>
                <option value="brandwatch">BrandWatch</option>
                <option value="certradar">CertRadar</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="level">Level</label>
              <select id="level" name="level" required>
                <option value="none">None</option>
                <option value="view">View</option>
                <option value="operate">Operate</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reason">Reason</label>
              <input id="reason" name="reason" type="text" required placeholder="Provisioning new analyst" />
            </div>
            <button type="submit" className="btn" disabled={isSettingGrant} style={{ width: "auto" }}>
              {isSettingGrant ? "Saving..." : "Set grant"}
            </button>
          </form>
        </div>
      )}

      {canGrant && (
        <div className="card">
          <h2>AI operator</h2>
          {org?.entitlements?.ai_operator ? (
            <>
              <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "1.25rem" }}>Propose an access change in plain language. A human must apply it.</p>
              {aiError && <div className="error-msg" role="alert">{aiError}</div>}
              {!aiCommand ? (
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div className="form-group" style={{ flex: 1, minWidth: "240px", margin: 0 }}>
                    <label htmlFor="aiPrompt">Prompt</label>
                    <input id="aiPrompt" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Grant this user operate on MailGuard" />
                  </div>
                  <button type="button" className="btn" onClick={handleAiPropose} disabled={!aiPrompt || isProposing} style={{ width: "auto" }}>
                    {isProposing ? "Proposing..." : "Propose"}
                  </button>
                </div>
              ) : (
                <div>
                  <pre style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", overflowX: "auto", fontSize: "0.85rem" }}>
                    {JSON.stringify(aiCommand, null, 2)}
                  </pre>
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
                    <button type="button" className="btn" onClick={handleAiApply} disabled={isApplying || aiCommand.action === "reject"} style={{ width: "auto" }}>
                      {isApplying ? "Applying..." : "Apply"}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setAiCommand(null)} disabled={isApplying} style={{ width: "auto" }}>
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="muted" style={{ marginTop: "1rem" }}>AI operator requires the Enterprise plan. Change it in Settings.</p>
          )}
        </div>
      )}

      <div className="card">
        <h2>MailGuard check</h2>
        <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>Verify your operate grant against a sample export.</p>
        <button type="button" className="btn" onClick={handleTestExport} style={{ width: "auto" }}>Run check</button>
        {exportError && <div className="error-msg" role="alert" style={{ marginTop: "1rem" }}>{exportError}</div>}
        {exportResult != null && (
          <pre style={{ marginTop: "1rem", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "6px", overflowX: "auto" }}>
            {JSON.stringify(exportResult, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
