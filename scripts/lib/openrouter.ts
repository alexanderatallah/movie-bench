export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function callOpenRouter(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
  } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const {
    model = "anthropic/claude-opus-4-6",
    temperature = 0.3,
  } = options;

  const resp = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/movie-bench",
      "X-Title": "Movie Bench",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (resp.status === 429) {
    throw new Error("RATE_LIMITED");
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenRouter API error ${resp.status}: ${text}`);
  }

  const data = (await resp.json()) as OpenRouterResponse;
  return data.choices[0].message.content;
}
