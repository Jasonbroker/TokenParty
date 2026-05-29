import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";

export default function Overview() {
  const [stats, setStats] = useState<any[]>([]);
  const [days, setDays] = useState(7);

  useEffect(() => {
    api.getStats(days).then(setStats).catch(console.error);
  }, [days]);

  const dailyData = stats.reduce((acc: any[], row) => {
    const existing = acc.find((d) => d.date === row.date);
    if (existing) {
      existing.input_tokens += row.input_tokens;
      existing.output_tokens += row.output_tokens;
      existing.cache_input_tokens += row.cache_input_tokens ?? 0;
      existing.request_count += row.request_count;
      existing.cost += row.cost ?? 0;
    } else {
      acc.push({ ...row, cost: row.cost ?? 0, cache_input_tokens: row.cache_input_tokens ?? 0 });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date));

  const totalRequests = stats.reduce((s, r) => s + r.request_count, 0);
  const totalInput = stats.reduce((s, r) => s + r.input_tokens, 0);
  const totalOutput = stats.reduce((s, r) => s + r.output_tokens, 0);
  const totalCacheInput = stats.reduce((s, r) => s + (r.cache_input_tokens ?? 0), 0);
  const totalCost = stats.reduce((s, r) => s + (r.cost ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Overview</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Requests" value={totalRequests.toLocaleString()} />
        <StatCard label="Input Tokens" value={totalInput.toLocaleString()} />
        <StatCard label="Cached Input" value={totalCacheInput.toLocaleString()} />
        <StatCard label="Output Tokens" value={totalOutput.toLocaleString()} />
        <StatCard label="Total Cost" value={`$${totalCost.toFixed(4)}`} />
      </div>

      <div className="bg-white rounded-lg shadow p-4" style={{ height: 350 }}>
        <ResponsiveContainer>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="input_tokens" name="Input Tokens" fill="#6366f1" />
            <Bar dataKey="output_tokens" name="Output Tokens" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
