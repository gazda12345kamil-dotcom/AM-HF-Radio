import { handleAnalyze, type AnalyzeBody } from "@/lib/analyze-request";
import { aiConfigured, extractFromImage } from "@/lib/ai/openrouter";
import { takeDailySlot } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientId(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "lokalny";
}

export async function POST(req: Request) {
  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return Response.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const useAi = body.mode === "photo" && aiConfigured();
  if (useAi) {
    const limit = Number(process.env.DAILY_LIMIT_PER_IP) || 20;
    if (!takeDailySlot(clientId(req), limit)) {
      return Response.json({ error: "Dzienny limit sprawdzeń z tego adresu został wykorzystany. Spróbuj jutro." }, { status: 429 });
    }
  }

  const out = await handleAnalyze(body, useAi ? extractFromImage : null);
  return Response.json(out.result ? { result: out.result } : { error: out.error }, { status: out.status });
}
