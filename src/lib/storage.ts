"use client";

import type { AnalysisResult } from "./types";
import { getPlan, type Plan } from "./plans";

/**
 * Dane zapisywane w przeglądarce (tylko na tym urządzeniu).
 * Po dodaniu kont użytkowników te funkcje zostaną podmienione na zapis na serwerze.
 */
const HISTORY_KEY = "um-history";
const USAGE_KEY = "um-usage";
const PLAN_KEY = "um-plan";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* brak miejsca albo tryb prywatny – aplikacja działa dalej bez zapisu */
  }
}

export function loadHistory(): AnalysisResult[] {
  return read<AnalysisResult[]>(HISTORY_KEY, []);
}

export function saveToHistory(result: AnalysisResult) {
  const list = loadHistory().filter((r) => r.id !== result.id);
  write(HISTORY_KEY, [result, ...list].slice(0, 100));
}

export function removeFromHistory(id: string) {
  write(HISTORY_KEY, loadHistory().filter((r) => r.id !== id));
}

const monthKey = () => new Date().toISOString().slice(0, 7);

export function currentPlan(): Plan {
  return getPlan(read<string | null>(PLAN_KEY, null));
}

export function usageThisMonth(): number {
  const u = read<{ month: string; count: number }>(USAGE_KEY, { month: monthKey(), count: 0 });
  return u.month === monthKey() ? u.count : 0;
}

export function remainingPhotoChecks(): number {
  return Math.max(0, currentPlan().photoChecks - usageThisMonth());
}

export function countPhotoCheck() {
  write(USAGE_KEY, { month: monthKey(), count: usageThisMonth() + 1 });
}
