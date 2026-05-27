import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface TokenKey {
  key: string;
  name: string;
  allowedProviders: string[];
  rateLimit: number | null;
  enabled: boolean;
}

export default function Keys() {
  const [keys, setKeys] = useState<TokenKey[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [editing, setEditing] = useState<Partial<TokenKey> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = () => {
    api.getKeys().then(setKeys).catch(console.error);
    api.getProviders().then(setProviders).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (isNew) {
      await api.createKey(editing);
    } else {
      await api.updateKey(editing.key!, editing);
    }
    setEditing(null);
    load();
  };

  const remove = async (key: string) => {
    if (!confirm("Delete this key?")) return;
    await api.deleteKey(key);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Keys</h2>
        <button
          onClick={() => { setEditing({ allowedProviders: [], enabled: true }); setIsNew(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
        >
          Create Key
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Key</th>
              <th className="px-4 py-2 text-left">Providers</th>
              <th className="px-4 py-2 text-right">Rate Limit</th>
              <th className="px-4 py-2 text-center">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.key} className="border-t">
                <td className="px-4 py-2 font-medium">{k.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{k.key}</td>
                <td className="px-4 py-2 text-xs">{k.allowedProviders.join(", ")}</td>
                <td className="px-4 py-2 text-right">{k.rateLimit ?? "Unlimited"}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${k.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {k.enabled ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => { setEditing(k); setIsNew(false); }} className="text-indigo-600 hover:underline mr-2">Edit</button>
                  <button onClick={() => remove(k.key)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[480px]">
            <h3 className="text-lg font-bold mb-4">{isNew ? "Create" : "Edit"} Key</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              {!isNew && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Key</label>
                  <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded">{editing.key}</div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Allowed Providers</label>
                <div className="space-y-1">
                  {providers.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editing.allowedProviders?.includes(p.id) ?? false}
                        onChange={(e) => {
                          const current = editing.allowedProviders ?? [];
                          setEditing({
                            ...editing,
                            allowedProviders: e.target.checked
                              ? [...current, p.id]
                              : current.filter((x) => x !== p.id),
                          });
                        }}
                      />
                      {p.name} ({p.id})
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Rate Limit (req/min, empty = unlimited)</label>
                <input
                  type="number"
                  value={editing.rateLimit ?? ""}
                  onChange={(e) => setEditing({ ...editing, rateLimit: e.target.value ? Number(e.target.value) : null })}
                  className="w-full border rounded px-3 py-2 text-sm"
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
