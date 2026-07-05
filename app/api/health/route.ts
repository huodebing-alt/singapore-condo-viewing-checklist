export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ cloud: !!process.env.BLOB_READ_WRITE_TOKEN });
}
