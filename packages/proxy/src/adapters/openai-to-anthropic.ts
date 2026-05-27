interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
}

export function openaiToAnthropic(body: OpenAIRequest) {
  const systemMessages = body.messages.filter((m) => m.role === "system");
  const nonSystemMessages = body.messages.filter((m) => m.role !== "system");

  const system = systemMessages.length > 0
    ? systemMessages.map((m) => typeof m.content === "string" ? m.content : "").join("\n")
    : undefined;

  const messages = nonSystemMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: typeof m.content === "string"
      ? m.content
      : m.content.map((part) => {
          if (part.type === "text") return { type: "text" as const, text: part.text! };
          if (part.type === "image_url") {
            return {
              type: "image" as const,
              source: { type: "url" as const, url: part.image_url!.url },
            };
          }
          return { type: "text" as const, text: "" };
        }),
  }));

  const result: Record<string, unknown> = {
    model: body.model,
    messages,
    max_tokens: body.max_tokens ?? 4096,
    stream: body.stream,
  };

  if (system) result.system = system;
  if (body.temperature != null) result.temperature = body.temperature;
  if (body.top_p != null) result.top_p = body.top_p;
  if (body.tools) {
    result.tools = body.tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  return result;
}

export function anthropicResponseToOpenai(body: any, model: string) {
  const content = body.content?.[0]?.text ?? "";
  return {
    id: body.id ?? `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: mapStopReason(body.stop_reason),
      },
    ],
    usage: body.usage
      ? {
          prompt_tokens: body.usage.input_tokens,
          completion_tokens: body.usage.output_tokens,
          total_tokens: body.usage.input_tokens + body.usage.output_tokens,
        }
      : undefined,
  };
}

function mapStopReason(reason: string | undefined): string {
  switch (reason) {
    case "end_turn": return "stop";
    case "max_tokens": return "length";
    case "tool_use": return "tool_calls";
    default: return "stop";
  }
}
