"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [error, setError] = useState(searchParams.get("error") ?? "");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [slug, setSlug] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }

      if (returnTo) {
        router.push(returnTo);
      } else {
        router.push("/app");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="center-layout">
      <div className="card">
        <Link href="/" className="back-link">← Home</Link>
        <h1>Sign in</h1>
        <p className="subtitle">Sign in to access your dashboard.</p>

        {error && <div className="error-msg" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="alice@example.com" />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: "1rem" }}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="divider">or</div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setSsoLoading(true);
            try {
              const res = await fetch(`/api/auth/okta/discover?slug=${encodeURIComponent(slug.trim())}`);
              const data = await res.json();
              if (!res.ok) throw new Error(data.message || "SSO is not available for this organization");
              window.location.href = `/api/auth/okta/authorize?org_id=${data.orgId}`;
            } catch (err: any) {
              setError(err.message);
              setSsoLoading(false);
            }
          }}
        >
          <button type="submit" className="btn btn-secondary" style={{ width: "100%", padding: "0.75rem 1.5rem" }} disabled={ssoLoading || !slug.trim()}>
            {ssoLoading ? "Continuing..." : "Continue with Okta"}
          </button>
          <div className="form-group" style={{ marginTop: "1rem", marginBottom: 0 }}>
            <label htmlFor="orgSlug">Enterprise org slug</label>
            <input id="orgSlug" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="acme-corp-…" />
            <p className="hint">Required only for company Okta login.</p>
          </div>
        </form>

        <p style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.875rem" }}>
          Don't have an account? <Link href={`/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}>Create Account</Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="center-layout"><div style={{ color: "var(--primary)" }}>Loading...</div></main>}>
      <LoginContent />
    </Suspense>
  );
}
