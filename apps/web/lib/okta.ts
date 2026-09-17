export function normalizeOktaIssuer(issuer: string): string {
  return issuer.trim().replace(/\/$/, "");
}

export function oktaEndpoints(issuer: string) {
  const base = normalizeOktaIssuer(issuer);
  if (/\/oauth2\/[^/]+$/.test(base)) {
    return {
      issuer: base,
      authorize: `${base}/v1/authorize`,
      token: `${base}/v1/token`,
      jwks: `${base}/v1/keys`,
    };
  }
  return {
    issuer: base,
    authorize: `${base}/oauth2/v1/authorize`,
    token: `${base}/oauth2/v1/token`,
    jwks: `${base}/oauth2/v1/keys`,
  };
}

export function publicOrigin(request: Request): string {
  const proto =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  return `${proto}://${host}`;
}

export function oktaRedirectUri(request: Request): string {
  return `${publicOrigin(request)}/api/auth/okta/callback`;
}
