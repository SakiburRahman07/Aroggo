import { env } from "@/config/env";

const GEMINI_MODEL = "gemini-2.0-flash";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: Record<string, unknown>;
}

export function isAiConfigured() {
  return Boolean(env.GOOGLE_API_KEY);
}

function extractText(response: GeminiResponse) {
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "";
}

function parseJsonFromResponse<T>(value: string): T {
  const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch?.[1] ?? value;
  return JSON.parse(raw.trim()) as T;
}

export async function generateText(prompt: string) {
  if (!env.GOOGLE_API_KEY) {
    throw new Error("Google Gemini is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const json = (await response.json()) as GeminiResponse;
  return {
    text: extractText(json),
    usage: json.usageMetadata ?? null
  };
}

export async function generateStructuredData<T>(prompt: string) {
  const result = await generateText(`${prompt}\n\nReturn strict JSON only.`);
  return {
    data: parseJsonFromResponse<T>(result.text),
    usage: result.usage
  };
}
