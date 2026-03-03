/**
 * Shared AI utility for Mapleins
 * Primary: Groq (free, cloud, ~2 sec)
 * Fallback: Ollama (local)
 */

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIResponse = {
  content: string;
  provider: "groq" | "ollama";
};

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

/**
 * Call Groq cloud AI (fast, free tier)
 */
async function callGroq(messages: AIMessage[]): Promise<string> {
  if (!GROQ_API_KEY || GROQ_API_KEY === "your_groq_api_key_here") {
    throw new Error("GROQ_API_KEY not configured");
  }

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: Number(process.env.AI_MAX_TOKENS) || 4096,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from Groq");
  return content;
}

/**
 * Call local Ollama AI (fallback)
 */
async function callOllama(messages: AIMessage[]): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.message?.content;
  if (!content) throw new Error("No content from Ollama");
  return content;
}

/**
 * Main AI call — tries Groq first, falls back to Ollama
 */
export async function callAI(messages: AIMessage[]): Promise<AIResponse> {
  // Try Groq first
  if (GROQ_API_KEY && GROQ_API_KEY !== "your_groq_api_key_here") {
    try {
      const content = await callGroq(messages);
      return { content, provider: "groq" };
    } catch (err) {
      console.warn("Groq failed, falling back to Ollama:", err);
    }
  }

  // Fallback to Ollama
  const content = await callOllama(messages);
  return { content, provider: "ollama" };
}

/**
 * Convenience: single system + user message
 */
export async function callAISimple(
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  return callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

/**
 * Parse JSON from AI response (strips markdown fences and extra text before/after JSON)
 */
export function parseAIJson<T>(content: string): T {
  let text = content.trim();
  // Strip markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
  }
  // Extract JSON object when AI adds preamble e.g. "Here is the JSON:" or inline ```json
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(text) as T;
}
