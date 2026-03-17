import Groq from "groq-sdk";
import { env } from "@/config/env";

const DEFAULT_GROQ_MODEL = env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const DEFAULT_GROQ_STRUCTURED_MODEL = env.GROQ_STRUCTURED_MODEL || DEFAULT_GROQ_MODEL;
const DEFAULT_MAX_COMPLETION_TOKENS = 1024;

let groqClient: Groq | null = null;

export class GroqRequestError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "GroqRequestError";
    this.status = status;
    this.details = details;
  }
}

function getGroqClient() {
  if (!env.GROQ_API_KEY) {
    throw new Error("Groq is not configured");
  }

  groqClient ??= new Groq({
    apiKey: env.GROQ_API_KEY,
    maxRetries: 2,
    timeout: 20_000
  });

  return groqClient;
}

export function isAiConfigured() {
  return Boolean(env.GROQ_API_KEY);
}

function extractText(content: unknown) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function parseJsonFromResponse<T>(value: string): T {
  const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch?.[1] ?? value;
  return JSON.parse(raw.trim()) as T;
}

function throwGroqError(error: unknown): never {
  if (error instanceof Groq.APIError) {
    throw new GroqRequestError(`Groq request failed with ${error.status ?? "unknown"}`, error.status, error.error);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error("Unknown Groq request error");
}

export async function generateText(prompt: string) {
  if (!env.GROQ_API_KEY) {
    throw new Error("Groq is not configured");
  }

  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are OpsPilot Health's AI copilot for clinic operations, documentation review, and internal workflow support. Never frame outputs as medical diagnosis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: DEFAULT_GROQ_MODEL,
      temperature: 0.2,
      max_completion_tokens: DEFAULT_MAX_COMPLETION_TOKENS,
      top_p: 1,
      stream: false
    });

    return {
      text: extractText(completion.choices[0]?.message?.content),
      usage: completion.usage ?? null
    };
  } catch (error) {
    throwGroqError(error);
  }
}

export async function generateStructuredData<T>(prompt: string) {
  if (!env.GROQ_API_KEY) {
    throw new Error("Groq is not configured");
  }

  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Return valid JSON only. Do not include markdown fences, commentary, or explanatory text outside the JSON object."
        },
        {
          role: "user",
          content: `${prompt}\n\nReturn strict JSON only.`
        }
      ],
      model: DEFAULT_GROQ_STRUCTURED_MODEL,
      temperature: 0,
      max_completion_tokens: DEFAULT_MAX_COMPLETION_TOKENS,
      top_p: 1,
      response_format: {
        type: "json_object"
      },
      stream: false
    });

    const text = extractText(completion.choices[0]?.message?.content);

    return {
      data: parseJsonFromResponse<T>(text),
      usage: completion.usage ?? null
    };
  } catch (error) {
    throwGroqError(error);
  }
}