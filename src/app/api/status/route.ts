import { aiConfigured } from "@/lib/ai/openrouter";
import { PRICE_DB_VERSION } from "@/lib/pricing/data";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ai: aiConfigured(), priceDb: PRICE_DB_VERSION });
}
