"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { localDateKey } from "@/lib/date";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import type { CashTransaction } from "@/lib/types";

export function FinanceChart({ transactions }: { transactions: CashTransaction[] }) {
  const monthKey = localDateKey().slice(0, 7);
  const cashFlow = transactions
    .filter((transaction) => transaction.date.startsWith(monthKey))
    .reduce(
      (weeks, transaction) => {
        const day = Number(transaction.date.slice(8, 10));
        const index = Math.min(Math.floor((day - 1) / 7), 3);
        weeks[index][transaction.direction === "Masuk" ? "masuk" : "keluar"] += transaction.amount;
        return weeks;
      },
      [
        { week: "1–7", masuk: 0, keluar: 0 },
        { week: "8–14", masuk: 0, keluar: 0 },
        { week: "15–21", masuk: 0, keluar: 0 },
        { week: "22–akhir", masuk: 0, keluar: 0 },
      ],
    );
  return (
    <div className="h-[280px] w-full" aria-label="Grafik arus kas bulan berjalan">
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
