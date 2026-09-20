"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SessionProvider, useAppSession } from "./session-context";
import { Toaster } from "react-hot-toast";

const NAV = [
  { href: "/app", label: "Overview", match: "exact" as const },
  { href: "/app/members", label: "Members" },
  { href: "/app/access", label: "Access" },
  { href: "/app/credentials", label: "Tokens", admin: true },
  { href: "/app/settings", label: "Settings", admin: true },
];

import { KeystoneMark } from "../components/keystone-mark";

function Chrome({ children }: { children: React.ReactNode }) {
  const { user, org } = useAppSession();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "owner" || user.role === "admin";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
  }

  if (!user.orgId) {
    return <main className="container">{children}</main>;
  }

  return (
    <div className="shell" style={{ display: 'block' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(13, 15, 18, 0.85)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="brand" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: 0 }}>
            <KeystoneMark size={28} />
            Keystone
          </div>
          <span style={{ color: 'var(--card-border)' }}>/</span>
          <strong style={{ fontSize: '1rem' }}>{org?.name}</strong>
          {org?.plan && (
            <span className="badge" style={{ padding: '0.2rem 0.5rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '4px', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              {org.plan} plan
            </span>
          )}
        </div>
        <div>
          <button type="button" className="btn btn-secondary" onClick={logout} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}>
            Sign out
          </button>
        </div>
      </header>
      
      <div className="container" style={{ paddingTop: '2rem', maxWidth: '1000px' }}>
        <nav style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--card-border)' }}>
          {NAV.filter((item) => !item.admin || isAdmin).map((item) => {
            const active = item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{ paddingBottom: '0.75rem', color: active ? 'white' : 'rgba(255,255,255,0.6)', borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: 500, fontSize: '0.95rem' }}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Toaster position="top-right" />
      <Chrome>{children}</Chrome>
    </SessionProvider>
  );
}
