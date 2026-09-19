"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const name = formData.get("name");
    const password = formData.get("password");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
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
        <h1>Create Account</h1>
        <p className="subtitle">Join Keystone to secure your apps.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" required placeholder="Alice" />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="alice@example.com" />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required placeholder="••••••••" minLength={12} autoComplete="new-password" />
            <p className="hint">At least 12 characters</p>
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: "1rem" }}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.875rem" }}>
          Already have an account? <Link href={`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}>Sign In</Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="center-layout"><div style={{ color: "var(--primary)" }}>Loading...</div></main>}>
      <RegisterContent />
    </Suspense>
  );
}
