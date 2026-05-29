import { useState } from "react";

interface SettingsData {
  displayCurrency: "USD" | "CNY";
  exchangeRate: number;
}

const STORAGE_KEY = "tokenparty_settings";
const DEFAULT_RATE = 7.2;

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { displayCurrency: "USD", exchangeRate: DEFAULT_RATE };
}

function saveSettings(data: SettingsData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getSettings(): SettingsData {
  return loadSettings();
}

export function formatCost(usdCost: number): string {
  const s = loadSettings();
  if (s.displayCurrency === "CNY") {
    return `¥${(usdCost * s.exchangeRate).toFixed(4)}`;
  }
  return `$${usdCost.toFixed(4)}`;
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData>(loadSettings);
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<SettingsData>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <div className="bg-white rounded-lg shadow p-6 max-w-lg space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Currency</label>
          <p className="text-xs text-gray-500 mb-2">All costs are stored in USD internally. Switching to CNY converts using the exchange rate below.</p>
          <select
            value={settings.displayCurrency}
            onChange={(e) => update({ displayCurrency: e.target.value as "USD" | "CNY" })}
            className="w-48 border rounded px-3 py-2 text-sm"
          >
            <option value="USD">$ USD</option>
            <option value="CNY">¥ CNY</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate (1 USD = ? CNY)</label>
          <p className="text-xs text-gray-500 mb-2">Used when displaying costs in CNY. Default: {DEFAULT_RATE}</p>
          <input
            type="number"
            step="0.01"
            value={settings.exchangeRate}
            onChange={(e) => update({ exchangeRate: Number(e.target.value) || DEFAULT_RATE })}
            className="w-48 border rounded px-3 py-2 text-sm"
          />
        </div>

        {saved && (
          <div className="text-sm text-green-600">Settings saved</div>
        )}
      </div>
    </div>
  );
}
