"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "error" | "success" | "idle">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if the user is authenticated.
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          setNeedsLogin(true);
        }
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  const handleAccept = async () => {
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to accept invite");
      }

      setStatus("success");
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/app");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  if (!token) {
    return (
      <main className="center-layout">
        <div className="card">
          <h2>Invalid Link</h2>
          <p className="subtitle" style={{ marginTop: "0.5rem" }}>No invite token provided.</p>
        </div>
      </main>
    );
  }

  if (checkingAuth) {
    return (
      <main className="center-layout">
        <div style={{ color: "var(--primary)" }}>Loading...</div>
      </main>
    );
  }

  return (
    <main className="center-layout">
      <div className="card" style={{ maxWidth: "450px" }}>
        <h2>Accept Invitation</h2>
        <p className="subtitle" style={{ marginTop: "0.5rem", marginBottom: "2rem" }}>
          You have been invited to join an organization. Click below to accept the invitation.
        </p>

        {status === "error" && <div className="error-msg">{errorMsg}</div>}
        {status === "success" && (
          <div style={{ padding: "1rem", backgroundColor: "rgba(34, 197, 94, 0.1)", border: "1px solid rgb(34, 197, 94)", borderRadius: "6px", marginBottom: "1.5rem" }}>
            <p style={{ color: "rgb(74, 222, 128)", fontWeight: 600 }}>Invite accepted!</p>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.8)" }}>Redirecting to your dashboard...</p>
          </div>
        )}

        {status !== "success" && (
          needsLogin ? (
            <button 
              className="btn" 
              onClick={() => router.push(`/login?returnTo=${encodeURIComponent(`/accept?token=${token}`)}`)} 
              style={{ width: "100%" }}
            >
              Log in or Register to Accept
            </button>
          ) : (
            <button 
              className="btn" 
              onClick={handleAccept} 
              disabled={status === "loading"}
              style={{ width: "100%" }}
            >
              {status === "loading" ? "Accepting..." : "Accept Invitation"}
            </button>
          )
        )}
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<main className="center-layout"><div style={{ color: "var(--primary)" }}>Loading...</div></main>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
