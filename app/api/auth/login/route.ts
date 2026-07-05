import {
  cloudConfigured,
  loadUsers,
  noStore,
  sessionCookie,
  signSession,
  verifyPassword,
} from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cloudConfigured()) return noStore();
  const { username, password } = await req.json();
  if (typeof username !== "string" || typeof password !== "string") {
    return new Response(JSON.stringify({ error: "Missing credentials" }), { status: 400 });
  }
  const users = await loadUsers();
  const user = users.find((u) => u.usernameLower === username.trim().toLowerCase());
  if (!user || !verifyPassword(user, password)) {
    return new Response(JSON.stringify({ error: "Wrong username or password" }), { status: 401 });
  }
  return new Response(JSON.stringify({ ok: true, username: user.username }), {
    status: 200,
    headers: { "Set-Cookie": sessionCookie(signSession(user.id)) },
  });
}
