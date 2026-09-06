import Link from 'next/link';

export default function Home() {
  return (
    <main className="center-layout">
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>Keystone Identity</h1>
        <p className="subtitle">Secure authentication and entitlements control plane.</p>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <Link href="/login" className="btn btn-secondary" style={{ flex: 1 }}>
            Sign In
          </Link>
          <Link href="/register" className="btn" style={{ flex: 1 }}>
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
