import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Requests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"request" | "response">("request");
  const limit = 20;

  useEffect(() => {
    api.getRequests({ limit, offset }).then((res) => {
      setRequests(res.data);
      setTotal(res.total);
    }).catch(console.error);
  }, [offset]);

  const loadDetail = async (id: string) => {
    const detail = await api.getRequestDetail(id);
    setSelected(detail);
    setActiveTab("request");
  };

  const reqLog = selected?.logs?.find((l: any) => l.type === "request");
  const resLog = selected?.logs?.find((l: any) => l.type === "response");

  return (
    <div className="flex gap-4 h-full">
      {/* List */}
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold mb-4">Requests</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-right">Tokens</th>
                <th className="px-3 py-2 text-right">Latency</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => loadDetail(req.id)}
                  className={`border-t cursor-pointer hover:bg-gray-50 ${selected?.id === req.id ? "bg-indigo-50" : ""}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(req.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs">{req.token_id?.slice(0, 12)}</td>
                  <td className="px-3 py-2">{req.model}</td>
                  <td className="px-3 py-2 text-right">{(req.input_tokens ?? 0) + (req.output_tokens ?? 0)}</td>
                  <td className="px-3 py-2 text-right">{req.latency_ms}ms</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${req.status === 200 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between mt-4 text-sm">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
          <span className="text-gray-500">{offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
          <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="w-[600px] bg-white rounded-lg shadow flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <h3 className="font-bold text-sm">Request Detail</h3>
              <div className="text-xs text-gray-400 font-mono mt-0.5">{selected.id}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>

          {/* Meta + Token Usage Bar */}
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div><span className="text-gray-500">Model:</span> {selected.model}</div>
              <div><span className="text-gray-500">Provider:</span> {selected.provider_id}</div>
              <div><span className="text-gray-500">Latency:</span> {selected.latency_ms}ms</div>
              <div><span className="text-gray-500">Status:</span> <span className={selected.status === 200 ? "text-green-600" : "text-red-600"}>{selected.status}</span></div>
              <div><span className="text-gray-500">Entry:</span> {reqLog?.headers?.["x-entry-protocol"] ?? "-"}</div>
              <div><span className="text-gray-500">Target:</span> {reqLog?.headers?.["x-provider-type"] ?? "-"}</div>
            </div>
            {(selected.input_tokens > 0 || selected.output_tokens > 0) && (
              <TokenUsageBar input={selected.input_tokens} output={selected.output_tokens} />
            )}
            {resLog?.streaming && (
              <div className="mt-2">
                <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">Streaming (SSE)</span>
              </div>
            )}
          </div>

          {/* Error banner */}
          {resLog?.error && (
            <div className="px-4 py-2 bg-red-50 text-red-700 text-xs border-b">
              Error: {resLog.error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b">
            <button onClick={() => setActiveTab("request")} className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === "request" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"}`}>Request</button>
            <button onClick={() => setActiveTab("response")} className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === "response" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"}`}>Response</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 space-y-3 text-xs">
            {activeTab === "request" && reqLog && (
              <>
                <Section title="Headers">
                  <HeadersTable headers={reqLog.headers} />
                </Section>
                <Section title="Messages" defaultOpen>
                  <MessageList messages={reqLog.body?.messages} />
                </Section>
                {reqLog.body?.system && (
                  <Section title="System Prompt" defaultOpen>
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 whitespace-pre-wrap">{reqLog.body.system}</div>
                  </Section>
                )}
                {reqLog.body?.tools && (
                  <Section title={`Tools (${reqLog.body.tools.length})`}>
                    <pre className="bg-gray-50 p-3 rounded overflow-auto max-h-48 whitespace-pre-wrap">{JSON.stringify(reqLog.body.tools, null, 2)}</pre>
                  </Section>
                )}
                <Section title="Raw JSON">
                  <CopyableJSON data={reqLog.body} />
                </Section>
              </>
            )}

            {activeTab === "response" && resLog && (
              <>
                <Section title="Headers">
                  <HeadersTable headers={resLog.headers} />
                </Section>

                {resLog.streaming ? (
                  <>
                    <Section title="Response Content" defaultOpen>
                      <div className="bg-green-50 border border-green-200 rounded p-3 whitespace-pre-wrap">
                        {resLog.streamContent || <span className="text-gray-400 italic">No content captured</span>}
                      </div>
                    </Section>
                    {resLog.body && Array.isArray(resLog.body) && resLog.body.length > 0 && (
                      <Section title={`SSE Events (${resLog.body.length})`}>
                        <div className="bg-gray-50 rounded max-h-96 overflow-auto divide-y divide-gray-200">
                          {resLog.body.map((event: any, i: number) => (
                            <SSEEventRow key={i} index={i} event={event} />
                          ))}
                        </div>
                      </Section>
                    )}
                  </>
                ) : (
                  <>
                    {resLog.body?.content && (
                      <Section title="Response Content" defaultOpen>
                        <ResponseContent content={resLog.body.content} />
                      </Section>
                    )}
                    {resLog.body?.choices?.[0]?.message?.content && (
                      <Section title="Response Content" defaultOpen>
                        <div className="bg-green-50 border border-green-200 rounded p-3 whitespace-pre-wrap">
                          {resLog.body.choices[0].message.content}
                        </div>
                      </Section>
                    )}
                    <Section title="Raw JSON">
                      <CopyableJSON data={resLog.body} />
                    </Section>
                  </>
                )}
              </>
            )}

            {activeTab === "response" && !resLog && (
              <div className="text-gray-400 italic">No response recorded</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Token Usage Bar ---

function TokenUsageBar({ input, output }: { input: number; output: number }) {
  const total = input + output;
  if (total === 0) return null;
  const inputPct = (input / total) * 100;
  const outputPct = (output / total) * 100;

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Input: {input.toLocaleString()}</span>
        <span>Output: {output.toLocaleString()}</span>
        <span>Total: {total.toLocaleString()}</span>
      </div>
      <div className="flex h-2 rounded overflow-hidden bg-gray-200">
        <div className="bg-blue-500" style={{ width: `${inputPct}%` }} title={`Input: ${input}`} />
        <div className="bg-green-500" style={{ width: `${outputPct}%` }} title={`Output: ${output}`} />
      </div>
    </div>
  );
}

// --- Message List (colored by role) ---

function MessageList({ messages }: { messages?: any[] }) {
  if (!messages || messages.length === 0) return <div className="text-gray-400 italic">No messages</div>;

  const roleColors: Record<string, string> = {
    user: "bg-blue-50 border-blue-200",
    assistant: "bg-green-50 border-green-200",
    system: "bg-amber-50 border-amber-200",
    tool: "bg-purple-50 border-purple-200",
  };

  return (
    <div className="space-y-2">
      {messages.map((msg, i) => (
        <div key={i} className={`rounded border p-3 ${roleColors[msg.role] ?? "bg-gray-50 border-gray-200"}`}>
          <div className="font-medium text-gray-600 mb-1 text-xs uppercase">{msg.role}</div>
          <div className="whitespace-pre-wrap">
            {typeof msg.content === "string"
              ? msg.content
              : Array.isArray(msg.content)
                ? msg.content.map((part: any, j: number) => (
                    <div key={j}>{part.text ?? JSON.stringify(part)}</div>
                  ))
                : JSON.stringify(msg.content)}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Anthropic Response Content ---

function ResponseContent({ content }: { content: any[] }) {
  if (!content) return null;
  return (
    <div className="space-y-2">
      {content.map((block: any, i: number) => {
        if (block.type === "text") {
          return <div key={i} className="bg-green-50 border border-green-200 rounded p-3 whitespace-pre-wrap">{block.text}</div>;
        }
        if (block.type === "tool_use") {
          return (
            <div key={i} className="bg-purple-50 border border-purple-200 rounded p-3">
              <div className="font-medium text-purple-700 mb-1">Tool: {block.name}</div>
              <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(block.input, null, 2)}</pre>
            </div>
          );
        }
        return <pre key={i} className="bg-gray-50 p-3 rounded whitespace-pre-wrap">{JSON.stringify(block, null, 2)}</pre>;
      })}
    </div>
  );
}

// --- SSE Event Row ---

function SSEEventRow({ index, event }: { index: number; event: any }) {
  const [expanded, setExpanded] = useState(false);
  const eventType = event.type ?? event.object ?? "unknown";

  const typeColors: Record<string, string> = {
    message_start: "bg-blue-100 text-blue-700",
    content_block_start: "bg-cyan-100 text-cyan-700",
    content_block_delta: "bg-green-100 text-green-700",
    content_block_stop: "bg-gray-100 text-gray-600",
    message_delta: "bg-amber-100 text-amber-700",
    message_stop: "bg-gray-100 text-gray-600",
    "chat.completion.chunk": "bg-indigo-100 text-indigo-700",
  };

  const preview = getEventPreview(event);

  return (
    <div className="px-2 py-1.5">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-gray-300 w-5 text-right shrink-0">#{index + 1}</span>
        <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${typeColors[eventType] ?? "bg-gray-100 text-gray-600"}`}>
          {eventType}
        </span>
        <span className="text-gray-500 truncate">{preview}</span>
        <span className="text-gray-300 text-xs ml-auto shrink-0">{expanded ? "▼" : "▶"}</span>
      </div>
      {expanded && (
        <pre className="mt-1 ml-7 bg-white p-2 rounded border text-xs overflow-auto max-h-40 whitespace-pre-wrap">
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  );
}

function getEventPreview(event: any): string {
  if (event.delta?.text) return event.delta.text.slice(0, 100);
  if (event.delta?.content) return event.delta.content.slice(0, 100);
  if (event.choices?.[0]?.delta?.content) return event.choices[0].delta.content.slice(0, 100);
  if (event.delta?.stop_reason) return `stop: ${event.delta.stop_reason}`;
  if (event.message?.model) return event.message.model;
  if (event.usage) return `tokens: ${JSON.stringify(event.usage)}`;
  return "";
}

// --- Copyable JSON block ---

function CopyableJSON({ data }: { data: any }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative">
      <button onClick={copy} className="absolute top-2 right-2 px-2 py-0.5 bg-white border rounded text-xs text-gray-500 hover:text-gray-700">
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="bg-gray-50 p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap">{json}</pre>
    </div>
  );
}

// --- Collapsible Section ---

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 mb-1 w-full text-left">
        <span className="text-xs text-gray-400">{open ? "▼" : "▶"}</span>
        {title}
      </button>
      {open && <div className="ml-4">{children}</div>}
    </div>
  );
}

// --- Headers Table ---

function HeadersTable({ headers }: { headers?: Record<string, string> }) {
  if (!headers || Object.keys(headers).length === 0) {
    return <div className="text-gray-400 italic">No headers recorded</div>;
  }
  return (
    <table className="w-full text-xs">
      <tbody>
        {Object.entries(headers).map(([key, value]) => (
          <tr key={key} className="border-b border-gray-100">
            <td className="py-1 pr-3 font-mono text-gray-500 whitespace-nowrap align-top">{key}</td>
            <td className="py-1 font-mono break-all">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
