import { checkVin } from "@/lib/vin-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return Response.json(await checkVin(new URL(req.url).searchParams.get("vin") ?? ""));
}
