import { clearCookie } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Set-Cookie": clearCookie() },
  });
}
