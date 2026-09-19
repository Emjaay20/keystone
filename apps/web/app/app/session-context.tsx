"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type AppOrg = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  seatLimit: number;
  seatUsed: number;
  entitlements?: {
    api_keys: boolean;
    oauth_clients: boolean;
    sso: boolean;
    ai_operator: boolean;
    access_reviews: boolean;
  };
};

export type AppUser = {
  id: string;
  email: string;
  name: string;
  orgId: string | null;
  role: string | null;
};

type SessionValue = {
  user: AppUser;
  org: AppOrg | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [org, setOrg] = useState<AppOrg | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (!res.ok) throw new Error("Failed to load session");
    const data = await res.json();
    setUser({
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      orgId: data.org?.id ?? null,
      role: data.role ?? null,
    });
    setOrg(data.org ?? null);
  }, [router]);

  useEffect(() => {
    refresh().catch(() => router.push("/login")).finally(() => setLoading(false));
  }, [refresh, router]);

  if (loading || !user) {
    return (
      <main className="center-layout">
        <div style={{ color: "var(--primary)" }}>Loading...</div>
      </main>
    );
  }

  return (
    <SessionContext.Provider value={{ user, org, loading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useAppSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useAppSession must be used within SessionProvider");
  return ctx;
}
