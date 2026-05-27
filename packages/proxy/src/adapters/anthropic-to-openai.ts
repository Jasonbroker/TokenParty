interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string }>;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: any[];
}

export function anthropicToOpenai(body: AnthropicRequest) {
  const messages: any[] = [];

  if (body.system) {
    messages.push({ role: "system", content: body.system });
  }

  for (const msg of body.messages) {
    messages.push({
      role: msg.role,
      content: typeof msg.content === "string"
        ? msg.content
        : msg.content.map((part) => ({ type: "text", text: part.text ?? "" })),
    });
  }

  const result: Record<string, unknown> = {
    model: body.model,
    messages,
    max_tokens: body.max_tokens,
    stream: body.stream,
  };

  if (body.temperature != null) result.temperature = body.temperature;
  if (body.top_p != null) result.top_p = body.top_p;
  if (body.tools) {
    result.tools = body.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));
  }

  return result;
}

export function openaiResponseToAnthropic(body: any, model: string) {
  const choice = body.choices?.[0];
  const content = choice?.message?.content ?? "";

  return {
    id: body.id ?? `msg_${Date.now()}`,
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text: content }],
    stop_reason: mapFinishReason(choice?.finish_reason),
    usage: body.usage
      ? {
          input_tokens: body.usage.prompt_tokens,
          output_tokens: body.usage.completion_tokens,
        }
      : undefined,
  };
}

function mapFinishReason(reason: string | undefined): string {
  switch (reason) {
    case "stop": return "end_turn";
    case "length": return "max_tokens";
    case "tool_calls": return "tool_use";
    default: return "end_turn";
  }
}
