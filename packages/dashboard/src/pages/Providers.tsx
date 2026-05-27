import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Provider {
  id: string;
  type: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  models: string[];
  enabled: boolean;
  _modelsText?: string;
}

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<Partial<Provider> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = () => api.getProviders().then(setProviders).catch(console.error);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const { _modelsText, ...data } = editing;
    if (isNew) {
      await api.createProvider(data);
    } else {
      await api.updateProvider(data.id!, data);
    }
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this provider?")) return;
    await api.deleteProvider(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Providers</h2>
        <button
          onClick={() => { setEditing({ type: "openai", models: [], enabled: true }); setIsNew(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
        >
          Add Provider
        </button>
      </div>

      <div className="grid gap-4">
        {providers.map((p) => (
          <div key={p.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-gray-500">{p.type} &middot; {p.baseUrl}</div>
              <div className="text-xs text-gray-400 font-mono mt-1">API Key: {p.apiKey}</div>
              <div className="text-xs text-gray-500 mt-1">Models: {p.models?.join(", ") || "none"}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs ${p.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {p.enabled ? "Active" : "Disabled"}
              </span>
              <button onClick={() => { setEditing(p); setIsNew(false); }} className="text-sm text-indigo-600 hover:underline">Edit</button>
              <button onClick={() => remove(p.id)} className="text-sm text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[480px]">
            <h3 className="text-lg font-bold mb-4">{isNew ? "Add" : "Edit"} Provider</h3>
            <div className="space-y-3">
              <Field label="Name" value={editing.name ?? ""} onChange={(v) => setEditing({ ...editing, name: v })} />
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select
                  value={editing.type ?? "openai"}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <Field label="Base URL" value={editing.baseUrl ?? ""} onChange={(v) => setEditing({ ...editing, baseUrl: v })} />
              <Field label="API Key" value={editing.apiKey ?? ""} onChange={(v) => setEditing({ ...editing, apiKey: v })} />
              <div>
                <label className="block text-sm text-gray-600 mb-1">Models (one per line)</label>
                <textarea
                  value={editing._modelsText ?? (editing.models ?? []).join("\n")}
                  onChange={(e) => setEditing({ ...editing, _modelsText: e.target.value, models: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                  onKeyDown={(e) => e.stopPropagation()}
                  rows={4}
                  placeholder={"claude-sonnet-4-20250514\nclaude-opus-4-20250514"}
                  className="w-full border rounded px-3 py-2 text-sm font-mono"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.enabled ?? true}
                  onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                />
                Enabled
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
      />
    </div>
  );
}
