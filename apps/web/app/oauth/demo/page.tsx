"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OauthDemoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientId, setClientId] = useState("");
  const [tokenResponse, setTokenResponse] = useState<any>(null);
  const [exportData, setExportData] = useState<any>(null);
  const [error, setError] = useState("");

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  useEffect(() => {
    if (code) {
      // Exchange code
      const verifier = sessionStorage.getItem("pkce_verifier");
      const savedClientId = sessionStorage.getItem("client_id");
      const redirectUri = window.location.origin + window.location.pathname;

      if (!verifier || !savedClientId) {
        setError("Missing verifier or clientId in session storage");
        return;
      }

      fetch("/api/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: savedClientId,
          code: code,
          redirect_uri: redirectUri,
          code_verifier: verifier,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) setError(data.error);
          else setTokenResponse(data);
          
          // clear from url
          router.replace("/oauth/demo");
        })
        .catch((err) => setError(err.message));
    }
  }, [code, router]);

  const generateCodeVerifier = () => {
    const array = new Uint32Array(56 / 2);
    crypto.getRandomValues(array);
    return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join("");
  };

  const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const startAuth = async () => {
    if (!clientId) return setError("Enter client ID");
    
    const verifier = generateCodeVerifier();
    sessionStorage.setItem("pkce_verifier", verifier);
    sessionStorage.setItem("client_id", clientId);
    
    const challenge = await generateCodeChallenge(verifier);
    const redirectUri = window.location.origin + window.location.pathname;

    const url = new URL("/api/oauth/authorize", window.location.origin);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", "demo_state");
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("response_type", "code");

    window.location.href = url.toString();
  };

  const testExport = async () => {
    if (!tokenResponse?.access_token) return;
    try {
      const res = await fetch("/api/products/mailguard/export", {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`
        }
      });
      const data = await res.json();
      setExportData(data);
    } catch (e: any) {
      setExportData({ error: e.message });
    }
  };

  return (
    <div className="container" style={{ maxWidth: "600px", margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>OAuth PKCE Demo</h1>
      
      {!tokenResponse ? (
        <div className="card" style={{ padding: "20px", background: "#1a1a1a", borderRadius: "8px", color: "white" }}>
          <h3>Initiate Login</h3>
          <p style={{ fontSize: "0.9rem", color: "#aaa" }}>Enter a Client ID from your Dashboard to begin the PKCE flow.</p>
          <input 
            type="text" 
            placeholder="Client ID" 
            value={clientId} 
            onChange={e => setClientId(e.target.value)}
            style={{ padding: "10px", width: "100%", marginBottom: "10px", borderRadius: "4px", border: "1px solid #333", background: "#000", color: "#fff" }}
          />
          <button 
            onClick={startAuth}
            style={{ padding: "10px 20px", background: "#6366f1", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Start Authorization
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: "20px", background: "#1a1a1a", borderRadius: "8px", color: "white" }}>
          <h3>Authenticated!</h3>
          <pre style={{ background: "#000", padding: "10px", borderRadius: "4px", overflowX: "auto" }}>
            {JSON.stringify(tokenResponse, null, 2)}
          </pre>
          
          <div style={{ marginTop: "20px" }}>
            <button 
              onClick={testExport}
              style={{ padding: "10px 20px", background: "#22c55e", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              Test MailGuard Export API
            </button>
          </div>
          
          {exportData && (
             <pre style={{ background: "#000", padding: "10px", borderRadius: "4px", marginTop: "10px", overflowX: "auto" }}>
               {JSON.stringify(exportData, null, 2)}
             </pre>
          )}
        </div>
      )}

      {error && <div style={{ color: "#ef4444", marginTop: "20px", padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px" }}>{error}</div>}
    </div>
  );
}

export default function OauthDemoPage() {
  return (
    <Suspense fallback={<div style={{ color: "white", padding: "40px", textAlign: "center" }}>Loading...</div>}>
      <OauthDemoInner />
    </Suspense>
  );
}
