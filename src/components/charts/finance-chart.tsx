"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";

const cashFlow = [
  { week: "Minggu 1", masuk: 118400000, keluar: 84200000 },
  { week: "Minggu 2", masuk: 126800000, keluar: 91300000 },
  { week: "Minggu 3", masuk: 139600000, keluar: 97800000 },
  { week: "Minggu 4", masuk: 154200000, keluar: 108500000 },
];

export function FinanceChart() {
  return (
    <div className="h-[280px] w-full" aria-label="Grafik arus kas empat minggu">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={cashFlow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--app-border)" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={formatCompactCurrency}
            tick={{ fill: "var(--app-text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              background: "var(--app-surface)",
              border: "1px solid var(--app-border)",
              borderRadius: 10,
              color: "var(--app-text)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="masuk" name="Kas masuk" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="keluar" name="Kas keluar" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
