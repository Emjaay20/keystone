"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SessionProvider, useAppSession } from "./session-context";
import { Toaster } from "react-hot-toast";

const NAV = [
  { href: "/app", label: "Org", match: "exact" as const },
  { href: "/app/members", label: "Members" },
  { href: "/app/access", label: "Access" },
  { href: "/app/mailguard", label: "MailGuard App" },
  { href: "/app/credentials", label: "Credentials", admin: true },
  { href: "/app/audit", label: "Audit", admin: true },
  { href: "/app/settings", label: "Settings", admin: true },
];

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
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Keystone</div>
        <nav>
          {NAV.filter((item) => !item.admin || isAdmin).map((item) => {
            const active = item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`nav-link${active ? " active" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div>
            <div>{user.name}</div>
            <div>{org?.name}</div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={logout} style={{ width: "auto" }}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="shell-main">{children}</div>
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
