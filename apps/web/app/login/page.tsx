"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      router.push("/app");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="center-layout">
      <div className="card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to access your dashboard.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="alice@example.com" />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required placeholder="••••••••" />
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: "1rem" }}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.875rem" }}>
          Don't have an account? <Link href="/register">Create Account</Link>
        </p>
      </div>
    </main>
  );
}
