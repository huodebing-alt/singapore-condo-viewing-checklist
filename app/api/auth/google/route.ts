// "Sign in with Google" — verifies a Google Identity Services ID token
// (RS256, against Google's published JWKS) and creates/logs into the
// matching account. Active only when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.

import {
  cloudConfigured,
  loadUsers,
  noStore,
  saveUsers,
  sessionCookie,
  signSession,
  type StoredUser,
} from "@/lib/auth-server";

export const dynamic = "force-dynamic";

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

async function verifyGoogleIdToken(credential: string, clientId: string) {
  const [h, p, sig] = credential.split(".");
  if (!h || !p || !sig) return null;
  const header = JSON.parse(b64urlToBuf(h).toString());
  const payload = JSON.parse(b64urlToBuf(p).toString());

  const certs = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    next: { revalidate: 3600 },
  }).then((r) => r.json());
  const jwk = certs.keys.find((k: { kid: string }) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    new Uint8Array(b64urlToBuf(sig)),
    new Uint8Array(Buffer.from(`${h}.${p}`))
  );
  if (!valid) return null;
  if (payload.aud !== clientId) return null;
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com")
    return null;
  if (payload.exp * 1000 < Date.now()) return null;
  return payload as { sub: string; email: string; name?: string };
}

export async function POST(req: Request) {
  if (!cloudConfigured()) return noStore();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response(JSON.stringify({ error: "Google sign-in not configured" }), {
      status: 501,
    });
  }
  const { credential } = await req.json();
  const payload = await verifyGoogleIdToken(String(credential ?? ""), clientId);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Invalid Google credential" }), { status: 401 });
  }

  const users = await loadUsers();
  let user = users.find((u) => u.google?.sub === payload.sub);
  if (!user) {
    const base = (payload.email.split("@")[0] || "user").replace(/[^a-zA-Z0-9._-]/g, "");
    let username = base;
    let n = 1;
    while (users.some((u) => u.usernameLower === username.toLowerCase())) {
      username = `${base}${++n}`;
    }
    user = {
      id: `g_${payload.sub}`,
      username,
      usernameLower: username.toLowerCase(),
      google: { sub: payload.sub, email: payload.email },
      createdAt: new Date().toISOString(),
    } satisfies StoredUser;
    users.push(user);
    await saveUsers(users);
  }
  return new Response(JSON.stringify({ ok: true, username: user.username }), {
    status: 200,
    headers: { "Set-Cookie": sessionCookie(signSession(user.id)) },
  });
}
