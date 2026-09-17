import { type AiCommand, aiCommandSchema } from "./schema.js";

const DEFAULT_TIMEOUT = 12000; // 12s

export interface LLMAdapter {
  propose(prompt: string, memberEmails: string[]): Promise<AiCommand>;
}

export class MockAdapter implements LLMAdapter {
  async propose(prompt: string, memberEmails: string[]): Promise<AiCommand> {
    const p = prompt.toLowerCase();
    
    // Test fixture
    if (p.includes("give jane operate on mailguard") || p.includes("grant my user operate on mailguard")) {
      return {
        action: "set_grant",
        email: "jane@example.com", // we might want to infer this from memberEmails if needed, but for mock this is fine
        product: "mailguard",
        level: "operate",
        reason: "User requested operate access on mailguard",
        confidence: 0.99,
      };
    }
    
    // Garbage / reject
    if (p.includes("garbage") || p.includes("invalid")) {
      return {
        action: "reject",
        reason: "Unintelligible prompt",
        confidence: 1.0,
      };
    }

    // Default mock response
    return {
      action: "explain",
      reason: "Mock did not understand the request.",
      confidence: 0.5,
    };
  }
}

export class OpenAIAdapter implements LLMAdapter {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
    if (process.env.GROQ_API_KEY) {
      this.baseUrl = "https://api.groq.com/openai/v1/chat/completions";
      this.model = "llama3-8b-8192";
    } else {
      this.baseUrl = "https://api.openai.com/v1/chat/completions";
      this.model = "gpt-4o-mini";
    }
  }

  async propose(prompt: string, memberEmails: string[]): Promise<AiCommand> {
    if (!this.apiKey) {
      throw new Error("No LLM API key provided.");
    }

    const systemPrompt = `You are an AI operator for an enterprise access control system.
You MUST output strictly valid JSON matching this schema:
{
  "action": "set_grant" | "revoke_grant" | "explain" | "reject",
  "email": string (optional, must be from the allowed member list),
  "product": "mailguard" | "brandwatch" | "certradar" (optional),
  "level": "none" | "view" | "operate" | "admin" (optional),
  "expiresAt": string (optional, ISO8601),
  "reason": string (explanation of why you chose this action),
  "confidence": number (0.0 to 1.0)
}

Allowed member emails: ${memberEmails.join(", ")}

Never invent emails not in the member list.
If you cannot fulfill the request, set action to "reject".`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ]
        }),
        signal: controller.signal,
      });

      clearTimeout(id);

      if (!res.ok) {
        throw new Error(`LLM API error: ${res.status} ${await res.text()}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      
      try {
        const parsed = JSON.parse(content);
        return aiCommandSchema.parse(parsed);
      } catch (err) {
        return {
          action: "reject",
          reason: "Invalid JSON response from LLM",
          confidence: 1.0,
        };
      }
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }
}

export function getAdapter(): LLMAdapter {
  const provider = process.env.LLM_PROVIDER || "mock";
  if (provider === "mock") {
    return new MockAdapter();
  }
  return new OpenAIAdapter();
}
