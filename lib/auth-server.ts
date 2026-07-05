// Server-side auth: users stored in Blob at auth/users.json, sessions are
// HMAC-signed cookies. Password hashing via scrypt (node:crypto, no deps).
// When no Blob store is configured the app runs in device-only mode and
// auth is bypassed entirely.

import { list, put } from "@vercel/blob";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type StoredUser = {
  id: string;
  username: string;
  usernameLower: string;
  salt?: string;
  hash?: string;
  google?: { sub: string; email: string };
  createdAt: string;
};

const USERS_PATH = "auth/users.json";
const COOKIE = "cs_session";
const SESSION_DAYS = 90;

function secret(): string {
  const s = process.env.AUTH_SECRET || process.env.BLOB_READ_WRITE_TOKEN;
  if (!s) throw new Error("no auth secret available");
  return createHash("sha256").update(`condoscout:${s}`).digest("hex");
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

async function fetchUsersBlob(): Promise<StoredUser[] | null> {
  const { blobs } = await list({ prefix: USERS_PATH });
  const blob = blobs.find((b) => b.pathname === USERS_PATH);
  if (!blob) return null;
  const res = await fetch(`${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveUsers(users: StoredUser[]): Promise<void> {
  await put(USERS_PATH, JSON.stringify(users), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

/** Load users; on first run seed the default account from env vars. */
export async function loadUsers(): Promise<StoredUser[]> {
  const existing = await fetchUsersBlob();
  if (existing) return existing;
  const users: StoredUser[] = [];
  const defUser = process.env.DEFAULT_USER;
  const defPass = process.env.DEFAULT_PASSWORD;
  if (defUser && defPass) {
    const salt = randomBytes(16).toString("hex");
    users.push({
      id: `u_${defUser.toLowerCase()}`,
      username: defUser,
      usernameLower: defUser.toLowerCase(),
      salt,
      hash: hashPassword(defPass, salt),
      createdAt: new Date().toISOString(),
    });
  }
  await saveUsers(users);
  return users;
}

export function verifyPassword(user: StoredUser, password: string): boolean {
  if (!user.salt || !user.hash) return false;
  const candidate = Buffer.from(hashPassword(password, user.salt), "hex");
  const actual = Buffer.from(user.hash, "hex");
  return candidate.length === actual.length && timingSafeEqual(candidate, actual);
}

// ---------- Sessions ----------

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

export function signSession(uid: string): string {
  const payload = b64url(
    JSON.stringify({ uid, exp: Date.now() + SESSION_DAYS * 86400_000 })
  );
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.uid !== "string" || Date.now() > data.exp) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export function getUid(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return verifySession(match?.[1]);
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export const cloudConfigured = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export const unauthorized = () =>
  new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

export const noStore = () =>
  new Response(JSON.stringify({ error: "Blob storage not configured" }), { status: 503 });
