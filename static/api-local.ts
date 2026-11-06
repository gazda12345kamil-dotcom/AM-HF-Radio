import { handleAnalyze, type AnalyzeBody } from "@/lib/analyze-request";
import { checkVin, type VinResponse } from "@/lib/vin-check";
import type { AnalysisResult } from "@/lib/types";

/** Wersja testowa: wszystko liczone w przeglądarce, odczyt zdjęć w trybie demo. */
export async function getStatus(): Promise<{ ai: boolean }> {
  return { ai: false };
}

export async function analyze(body: AnalyzeBody): Promise<AnalysisResult> {
  const out = await handleAnalyze(body, null);
  if (!out.result) throw new Error(out.error || "Coś poszło nie tak.");
  return out.result;
}

export function lookupVin(vin: string): Promise<VinResponse> {
  return checkVin(vin);
}
