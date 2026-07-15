import { randomBytes } from "node:crypto";
import {
  cloudConfigured,
  hashPassword,
  loadUsers,
  noStore,
  saveUsers,
  sessionCookie,
  signSession,
  type StoredUser,
} from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cloudConfigured()) return noStore();
  const { username, password } = await req.json();
  const name = String(username ?? "").trim();
  if (!/^[a-zA-Z0-9._-]{3,20}$/.test(name)) {
    return new Response(
      JSON.stringify({ error: "Username: 3-20 letters, numbers, . _ -" }),
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
      status: 400,
    });
  }
  const users = await loadUsers();
  if (users.some((u) => u.usernameLower === name.toLowerCase())) {
    return new Response(JSON.stringify({ error: "Username already taken" }), { status: 409 });
  }
  const salt = randomBytes(16).toString("hex");
  const user: StoredUser = {
    id: `u_${name.toLowerCase()}`,
    username: name,
    usernameLower: name.toLowerCase(),
    salt,
    hash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await saveUsers(users);
  return new Response(JSON.stringify({ ok: true, username: user.username }), {
    status: 200,
    headers: { "Set-Cookie": sessionCookie(signSession(user.id)) },
  });
}
