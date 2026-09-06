import { ObjectId, type Db } from "mongodb";
import { oauthClients, oauthCodes, oauthTokens } from "../db/collections.js";
import { requireUser } from "../auth/session.js";
import { errors } from "../http/errors.js";
import { randomToken, sha256 } from "../security/crypto.js";

type CreateOauthClientInput = {
  rawToken: string | undefined;
  orgId: string;
  name: string;
  redirectUris: string[];
};

export async function createOauthClient(db: Db, input: CreateOauthClientInput) {
  const ctx = await requireUser(db, input.rawToken);
  
  if (!ctx.org || ctx.org._id.toString() !== input.orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  const role = ctx.membership?.role;
  if (role !== "owner" && role !== "admin") {
    throw errors.forbidden("Only owners and admins can create OAuth clients");
  }

  const clientId = randomToken(16);
  const rawSecret = randomToken(32);
  const clientSecretHash = sha256(rawSecret);

  const clientDoc = {
    _id: new ObjectId(),
    orgId: new ObjectId(input.orgId),
    name: input.name,
    clientId,
    clientSecretHash,
    redirectUris: input.redirectUris,
    createdBy: ctx.user._id,
    createdAt: new Date(),
  };

  await oauthClients(db).insertOne(clientDoc);

  return {
    id: clientDoc._id.toString(),
    clientId,
    clientSecret: rawSecret, // only returned once
    name: clientDoc.name,
    redirectUris: clientDoc.redirectUris,
    createdAt: clientDoc.createdAt,
  };
}

export async function listOauthClients(db: Db, rawToken: string | undefined, orgId: string) {
  const ctx = await requireUser(db, rawToken);

  if (!ctx.org || ctx.org._id.toString() !== orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  const clients = await oauthClients(db)
    .find({ orgId: new ObjectId(orgId) })
    .sort({ createdAt: -1 })
    .project({ clientSecretHash: 0 })
    .toArray();

  return clients;
}

type StartAuthorizeInput = {
  rawToken: string | undefined;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
};

export async function startAuthorize(db: Db, input: StartAuthorizeInput) {
  // If not logged in, auth will throw 401. Handled by the route.
  const ctx = await requireUser(db, input.rawToken);

  if (input.codeChallengeMethod !== "S256") {
    throw errors.badRequest("Only S256 code challenge method is supported");
  }

  const client = await oauthClients(db).findOne({ clientId: input.clientId });
  if (!client) {
    throw errors.notFound("Client not found");
  }

  if (!client.redirectUris.includes(input.redirectUri)) {
    throw errors.badRequest("Invalid redirect URI");
  }

  // The user must be a member of the client's org
  if (!ctx.org || ctx.org._id.toString() !== client.orgId.toString()) {
    throw errors.forbidden("You are not a member of the organization that owns this client");
  }

  const rawCode = randomToken(32);
  const codeHash = sha256(rawCode);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

  await oauthCodes(db).insertOne({
    _id: new ObjectId(),
    codeHash,
    clientId: input.clientId,
    userId: ctx.user._id,
    orgId: client.orgId,
    redirectUri: input.redirectUri,
    codeChallenge: input.codeChallenge,
    expiresAt,
    consumedAt: null,
    createdAt: new Date(),
  });

  const redirectTo = new URL(input.redirectUri);
  redirectTo.searchParams.set("code", rawCode);
  redirectTo.searchParams.set("state", input.state);

  return { redirectTo: redirectTo.toString() };
}

type ExchangeCodeInput = {
  clientId: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
};

export async function exchangeCode(db: Db, input: ExchangeCodeInput) {
  const client = await oauthClients(db).findOne({ clientId: input.clientId });
  if (!client) {
    throw errors.unauthorized("Invalid client");
  }

  if (input.clientSecret) {
    const secretHash = sha256(input.clientSecret);
    if (secretHash !== client.clientSecretHash) {
      throw errors.unauthorized("Invalid client secret");
    }
  }

  const codeHash = sha256(input.code);
  const codeDoc = await oauthCodes(db).findOne({ codeHash, clientId: input.clientId });

  if (!codeDoc) {
    throw errors.unauthorized("Invalid code");
  }

  if (codeDoc.consumedAt) {
    throw errors.unauthorized("Code already consumed");
  }

  if (codeDoc.expiresAt < new Date()) {
    throw errors.unauthorized("Code expired");
  }

  if (codeDoc.redirectUri !== input.redirectUri) {
    throw errors.unauthorized("Redirect URI mismatch");
  }

  // Verify PKCE
  // Base64Url encode of SHA256(verifier)
  // The crypto module uses node:crypto under the hood for sha256. 
  // Let's import createHash if we need base64url, but let's assume `sha256` from crypto.js returns hex.
  // Wait, the spec says S256(verifier) === challenge. The standard PKCE challenge is base64url(sha256(verifier)).
  // We need to properly base64url encode it. Let's do it using Node's crypto directly to be safe, or just check what `crypto.js` provides.
  const { createHash } = await import("crypto");
  const computedChallenge = createHash("sha256")
    .update(input.codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  if (computedChallenge !== codeDoc.codeChallenge) {
    throw errors.unauthorized("Invalid code verifier");
  }

  // Consume code
  await oauthCodes(db).updateOne(
    { _id: codeDoc._id },
    { $set: { consumedAt: new Date() } }
  );

  const rawToken = randomToken(32);
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  await oauthTokens(db).insertOne({
    _id: new ObjectId(),
    tokenHash,
    clientId: input.clientId,
    userId: codeDoc.userId,
    orgId: codeDoc.orgId,
    expiresAt,
    revokedAt: null,
    createdAt: new Date(),
  });

  return {
    access_token: rawToken,
    token_type: "Bearer",
    expires_in: 3600,
  };
}
