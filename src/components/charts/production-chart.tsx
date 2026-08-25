"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { productionTrend } from "@/data/mock-data";
import { formatNumber } from "@/lib/format";

export function ProductionChart() {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={productionTrend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--app-border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} />
          <Tooltip
            formatter={(value) => `${formatNumber(Number(value))} pcs`}
            contentStyle={{ border: "1px solid var(--app-border)", borderRadius: 10, background: "var(--app-surface)", color: "var(--app-text)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="target" name="Target" fill="#aab7af" radius={[4, 4, 0, 0]} barSize={24} />
          <Bar dataKey="actual" name="Aktual" fill="#31895e" radius={[4, 4, 0, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
