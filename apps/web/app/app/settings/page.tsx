"use client";

import { useEffect, useState } from "react";
import { useAppSession } from "../session-context";
import toast from "react-hot-toast";
import { CreditCard, ShieldCheck } from "lucide-react";

type SsoConfig = {
  issuer?: string;
  clientId?: string;
  enabled?: boolean;
  hasSecret?: boolean;
  configured?: boolean;
};

export default function SettingsPage() {
  const { user, org, refresh } = useAppSession();
  const isOwner = user.role === "owner";
  const [ssoConfig, setSsoConfig] = useState<SsoConfig | null>(null);
  const [ssoError, setSsoError] = useState("");
  const [ssoSuccess, setSsoSuccess] = useState("");
  const [isSavingSso, setIsSavingSso] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    if (!user.orgId) return;
    fetch(`/api/orgs/${user.orgId}/sso`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setSsoConfig)
      .catch(() => setSsoConfig(null));
  }, [user.orgId]);

  
  async function handleChangePlan(plan: string) {
    if (org?.plan === plan) return;
    
    // Mock Stripe Checkout flow
    const switchPlan = async () => {
      setIsChangingPlan(true);
      try {
        const res = await fetch(`/api/orgs/${user.orgId}/plan`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to change plan");
        await refresh();
        return "Plan upgraded successfully!";
      } finally {
        setIsChangingPlan(false);
      }
    };

    toast.promise(switchPlan(), {
      loading: 'Redirecting to secure checkout...',
      success: 'Subscription updated! Welcome to ' + plan.toUpperCase(),
      error: (err) => `Payment failed: ${err.message}`,
    });
  }


  async function handleSaveSso(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSsoError("");
    setSsoSuccess("");
    setIsSavingSso(true);
    const fd = new FormData(e.currentTarget);
    try {
      const body: Record<string, unknown> = {
        issuer: String(fd.get("issuer") ?? "").trim().replace(/\/$/, ""),
        clientId: fd.get("clientId"),
        enabled: fd.get("enabled") === "on",
      };
      const secret = fd.get("clientSecret") as string;
      if (secret) body.clientSecret = secret;
      const res = await fetch(`/api/orgs/${user.orgId}/sso`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save SSO config");
      toast.success("SSO configuration saved.");
      setSsoSuccess("SSO configuration saved.");
      setSsoConfig(data);
    } catch (err: any) {
      toast.error(err.message);
      setSsoError(err.message);
    } finally {
      setIsSavingSso(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-lead">Plan and SSO for {org?.name}</p>
      </div>

      {isOwner && (
        <div className="card">
          <h2>Plan</h2>
          <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "1.25rem" }}>Current plan: <strong style={{ textTransform: "capitalize" }}>{org?.plan}</strong></p>
          
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {(["free", "team", "enterprise"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className="btn"
                onClick={() => handleChangePlan(p)}
                disabled={isChangingPlan || org?.plan === p}
                style={{
                  width: "auto",
                  background: org?.plan === p ? "rgba(99,102,241,0.2)" : undefined,
                  border: org?.plan === p ? "1px solid var(--primary)" : undefined,
                  textTransform: "capitalize",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>SSO</h2>
        {!org?.entitlements?.sso ? (
          <div style={{ marginTop: "1rem" }}>
            <p style={{ color: "rgb(167,139,250)", fontWeight: 600 }}>SSO requires Enterprise</p>
            <p className="muted" style={{ marginTop: "0.35rem" }}>Upgrade to federate login through Okta.</p>
            {isOwner && (
              <button type="button" className="btn" onClick={() => handleChangePlan("enterprise")} disabled={isChangingPlan} style={{ width: "auto", marginTop: "1rem" }}>
                <span style={{display:"flex", alignItems:"center", gap:"0.5rem"}}><CreditCard size={16}/> Upgrade to Enterprise</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "1.25rem" }}>
              Okta OIDC. Sign-in redirect URIs must include this origin plus <code>/api/auth/okta/callback</code>. Members sign in from the login page using the org slug.
            </p>
            {ssoError && <div className="error-msg" role="alert">{ssoError}</div>}
            
            {isOwner ? (
              <form onSubmit={handleSaveSso}>
                <div className="form-group">
                  <label htmlFor="ssoIssuer">Issuer URL</label>
                  <input id="ssoIssuer" name="issuer" type="url" required placeholder="https://dev-xxxxx.okta.com" defaultValue={ssoConfig?.issuer ?? ""} />
                  <p className="hint">Org authorization server: your Okta domain with no path.</p>
                </div>
                <div className="form-group">
                  <label htmlFor="ssoClientId">Client ID</label>
                  <input id="ssoClientId" name="clientId" type="text" required placeholder="0oaxxxxxx" defaultValue={ssoConfig?.clientId ?? ""} />
                </div>
                <div className="form-group">
                  <label htmlFor="ssoClientSecret">Client secret {ssoConfig?.hasSecret ? "(leave blank to keep existing)" : ""}</label>
                  <input id="ssoClientSecret" name="clientSecret" type="password" placeholder={ssoConfig?.hasSecret ? "••••••••" : "Paste client secret"} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <input id="ssoEnabled" name="enabled" type="checkbox" defaultChecked={ssoConfig?.enabled !== false} style={{ width: "auto" }} />
                  <label htmlFor="ssoEnabled" style={{ margin: 0, fontWeight: 400 }}>Enabled</label>
                </div>
                <button type="submit" className="btn" disabled={isSavingSso} style={{ width: "auto" }}>
                  {isSavingSso ? "Saving..." : "Save SSO"}
                </button>
              </form>
            ) : (
              <p className="muted">Only the owner can change SSO settings.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
