import { randomBytes } from "node:crypto";
import {
  cloudConfigured,
  getUid,
  hashPassword,
  loadUsers,
  noStore,
  saveUsers,
  unauthorized,
  verifyPassword,
} from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cloudConfigured()) return noStore();
  const uid = getUid(req);
  if (!uid) return unauthorized();
  const { current, next } = await req.json();
  if (typeof next !== "string" || next.length < 8) {
    return new Response(JSON.stringify({ error: "New password must be at least 8 characters" }), {
      status: 400,
    });
  }
  const users = await loadUsers();
  const user = users.find((u) => u.id === uid);
  if (!user) return unauthorized();
  if (user.hash && !verifyPassword(user, String(current ?? ""))) {
    return new Response(JSON.stringify({ error: "Current password is wrong" }), { status: 403 });
  }
  user.salt = randomBytes(16).toString("hex");
  user.hash = hashPassword(next, user.salt);
  await saveUsers(users);
  return Response.json({ ok: true });
}
