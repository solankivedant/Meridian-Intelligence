/**
 * Minimal Gemini client for the summarisation path.
 *
 * Deliberately a hand-rolled `fetch` against the REST endpoint rather than the
 * `@google/genai` SDK: the app needs exactly one call shape (one-shot JSON
 * generation, no streaming, no tools, no files), and the SDK is a large
 * dependency to carry into a serverless function for that.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Flash is the right tier here — the work is compression, not reasoning. */
const DEFAULT_MODEL = "gemini-3.5-flash";

const DEFAULT_TIMEOUT_MS = 25_000;

/** Retried once per attempt on these; anything else fails immediately. */
const RETRIABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export class GeminiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GeminiError";
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

/**
 * A JSON Schema subset, as accepted by `responseJsonSchema`. Typed loosely on
 * purpose: the API validates it, and mirroring the whole draft-2020 grammar in
 * TypeScript would buy nothing here.
 */
export type ResponseSchema = Record<string, unknown>;

export type GenerateOptions = {
  prompt: string;
  system?: string;
  /** When set, the model is constrained to emit JSON matching this schema. */
  schema?: ResponseSchema;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Attempts including the first. Backs off 1s, 2s, 4s between tries. */
  attempts?: number;
};

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
};

/** Raw text generation. Throws GeminiError; callers decide how to degrade. */
export async function generateText({
  prompt,
  system,
  schema,
  model = geminiModel(),
  maxOutputTokens = 2048,
  temperature = 0.3,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  attempts = 3,
}: GenerateOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set");

  const body = {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      // Summarising a list of headlines needs no deliberation, and Gemini 3's
      // default budget is large enough to spend the whole output allowance on
      // thoughts and return an empty candidate.
      thinkingConfig: { thinkingLevel: "minimal" },
      ...(schema
        ? { responseMimeType: "application/json", responseJsonSchema: schema }
        : {}),
    },
  };

  let lastError: GeminiError | undefined;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      // Timeout or transport failure — worth another try.
      lastError = new GeminiError(
        `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`
      );
      continue;
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 500);
      const error = new GeminiError(`Gemini returned ${res.status}: ${detail}`, res.status);
      if (!RETRIABLE_STATUSES.has(res.status)) throw error;
      lastError = error;
      continue;
    }

    const data = (await res.json()) as GeminiResponse;

    if (data.promptFeedback?.blockReason) {
      throw new GeminiError(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
    }

    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      // MAX_TOKENS here means the answer was cut off before any text landed;
      // repeating the same request would only reproduce it.
      throw new GeminiError(
        `Gemini returned no text (finishReason: ${candidate?.finishReason ?? "unknown"})`
      );
    }

    return text;
  }

  throw lastError ?? new GeminiError("Gemini request failed");
}

/**
 * Schema-constrained generation. The API guarantees well-formed JSON matching
 * `schema`, so the only parse failure worth guarding is a truncated response.
 */
export async function generateJson<T>(
  options: GenerateOptions & { schema: ResponseSchema }
): Promise<T> {
  const text = await generateText(options);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError(`Gemini returned unparseable JSON: ${text.slice(0, 300)}`);
  }
}
