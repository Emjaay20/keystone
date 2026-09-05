import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

// Node scrypt for Slice 1 (no native addon). Prefer Argon2id in production.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, 32)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    const [scheme, saltHex, keyHex] = hash.split("$");
    if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
    const key = (await scrypt(password, Buffer.from(saltHex, "hex"), 32)) as Buffer;
    const expected = Buffer.from(keyHex, "hex");
    if (key.length !== expected.length) return false;
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base.length > 0 ? base : "org";
}
