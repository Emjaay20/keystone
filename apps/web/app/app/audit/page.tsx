"use client";

import { useEffect, useState } from "react";
import { useAppSession } from "../session-context";

type Log = {
  _id: string;
  createdAt: string;
  action: string;
  product: string | null;
  outcome: string;
  reason: string;
};

function idOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "$oid" in (v as object)) return String((v as { $oid: string }).$oid);
  return String(v ?? "");
}

export default function AuditPage() {
  const { user } = useAppSession();
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (!user.orgId) return;
    fetch(`/api/orgs/${user.orgId}/audit`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setLogs)
      .catch(() => setLogs([]));
  }, [user.orgId]);

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Audit</h1>
        <p className="page-lead">Last 20 mutating decisions in this org</p>
      </div>
      <div className="card">
        {logs.length === 0 ? (
          <p className="muted">No audit events yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Product</th>
                  <th>Outcome</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={idOf(log._id)}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.action}</td>
                    <td>{log.product || "—"}</td>
                    <td style={{ color: log.outcome === "allow" ? "rgb(74,222,128)" : "rgb(248,113,113)" }}>{log.outcome}</td>
                    <td>{log.reason}</td>
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
