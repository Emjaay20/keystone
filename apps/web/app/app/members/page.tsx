"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "../../components/copy-button";
import { useAppSession } from "../session-context";
import toast from "react-hot-toast";

type Member = { id: string; email: string; name: string; role: string; status: string };

export default function MembersPage() {
  const { user } = useAppSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteToken, setInviteToken] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const canInvite = user.role === "owner" || user.role === "admin";

  async function load() {
    const res = await fetch(`/api/orgs/${user.orgId}/members`, { credentials: "include" });
    if (res.ok) setMembers(await res.json());
  }

  useEffect(() => {
    if (user.orgId) load();
  }, [user.orgId]);

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteError("");
    setInviteToken("");
    setIsInviting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/orgs/${user.orgId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email"), role: fd.get("role") }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create invite");
      setInviteToken(data.token);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err.message);
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  }

  
  async function handleRemoveMember(targetUserId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;
    
    try {
      const res = await fetch(`/api/orgs/${user.orgId}/members/${targetUserId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove member");
      }
      toast.success("Member removed successfully");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const inviteUrl = inviteToken ? `${window.location.origin}/accept?token=${inviteToken}` : "";

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Members</h1>
        <p className="page-lead">People in this organization</p>
      </div>

      <div className="card">
        {members.length === 0 ? (
          <p className="muted">No members found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  {canInvite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name || "—"}</td>
                    <td>{m.email}</td>
                    <td className="badge">{m.role}</td>
                    <td>{m.status}</td>
                    {canInvite && (
                      <td>
                        <button 
                          onClick={() => handleRemoveMember(m.id)} 
                          className="btn btn-secondary" 
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", width: "auto" }}
                          disabled={m.id === user.id}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canInvite && (
        <div className="card">
          <h2>Invite member</h2>
          <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "1.25rem" }}>
            Creates a link. Copy it and send it yourself — email is not sent.
          </p>
          {inviteError && <div className="error-msg" role="alert">{inviteError}</div>}
          {inviteUrl && (
            <div className="secret-box" style={{ marginBottom: "1.25rem" }}>
              <p style={{ color: "rgb(74,222,128)", fontWeight: 600 }}>Invite link (shown once)</p>
              <code>{inviteUrl}</code>
              <div style={{ marginTop: "0.75rem" }}>
                <CopyButton text={inviteUrl} />
              </div>
            </div>
          )}
          <form onSubmit={handleInvite}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required placeholder="colleague@acme.com" />
            </div>
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" required>
                <option value="analyst">Analyst</option>
                <option value="admin">Admin</option>
                <option value="billing">Billing</option>
                <option value="readonly">Read-only</option>
              </select>
            </div>
            <button type="submit" className="btn" disabled={isInviting} style={{ width: "auto" }}>
              {isInviting ? "Creating..." : "Create invite link"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
