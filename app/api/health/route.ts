import { cloudConfigured, getUid } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cloud = cloudConfigured();
  return Response.json({ cloud, authed: cloud ? !!getUid(req) : false });
}
