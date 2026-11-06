import type { AnalyzeBody } from "./analyze-request";
import type { VinResponse } from "./vin-check";
import type { AnalysisResult } from "./types";

/**
 * Połączenie ekranów z serwerem. W wersji jednoplikowej (static/) ten moduł
 * jest podmieniany na static/api-local.ts, który liczy wszystko w przeglądarce.
 */
export async function getStatus(): Promise<{ ai: boolean }> {
  const res = await fetch("/api/status");
  return (await res.json()) as { ai: boolean };
}

export async function analyze(body: AnalyzeBody): Promise<AnalysisResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { result?: AnalysisResult; error?: string };
  if (!res.ok || !data.result) throw new Error(data.error || "Coś poszło nie tak.");
  return data.result;
}

export async function lookupVin(vin: string): Promise<VinResponse> {
  const res = await fetch(`/api/vin?vin=${encodeURIComponent(vin)}`);
  return (await res.json()) as VinResponse;
}
