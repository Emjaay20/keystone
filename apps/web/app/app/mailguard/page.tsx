"use client";

import { useEffect, useState } from "react";
import { useAppSession } from "../session-context";

export default function MailGuardPage() {
  const { user } = useAppSession();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/products/mailguard/export", { credentials: "include" });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || result.reason || "Access Denied");
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">✉️ MailGuard Dashboard</h1>
        <p className="page-lead">This product requires the "operate" or "admin" level grant.</p>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Checking permissions...</p>
        ) : error ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2 style={{ color: "rgb(248,113,113)" }}>Access Denied</h2>
            <p className="muted" style={{ marginTop: "1rem" }}>{error}</p>
            <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
              Ask your organization admin to set a product grant for MailGuard via the Access tab.
            </p>
          </div>
        ) : (
          <div>
            <h2 style={{ color: "rgb(74,222,128)" }}>Access Granted</h2>
            <p className="muted" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
              You have successfully authenticated via Keystone IAM with a valid MailGuard grant.
            </p>
            <pre style={{ padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "6px", overflowX: "auto" }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
