import { SYSTEM_PROMPT, parseExtraction, type Extraction } from "./extract";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

/** Wysyła zdjęcie wyceny do modelu przez OpenRouter i zwraca sprawdzony odczyt. */
export async function extractFromImage(imageDataUrl: string): Promise<Extraction> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("Brak klucza OPENROUTER_API_KEY");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Title": "Uczciwy Mechanik",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
      temperature: 0,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Odczytaj tę wycenę/fakturę z warsztatu i zwróć JSON w opisanym formacie." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter zwrócił błąd ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Pusta odpowiedź z modelu AI");
  return parseExtraction(content);
}
