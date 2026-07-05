import { cloudConfigured, getUid, loadUsers } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cloudConfigured()) return Response.json({ cloud: false, authed: false });
  const uid = getUid(req);
  if (!uid) return Response.json({ cloud: true, authed: false });
  const users = await loadUsers();
  const user = users.find((u) => u.id === uid);
  if (!user) return Response.json({ cloud: true, authed: false });
  return Response.json({ cloud: true, authed: true, username: user.username });
}
