"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { customerCategoryPerformance, salesTrend } from "@/data/mock-data";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";

const tooltipStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  background: "var(--app-surface)",
  color: "var(--app-text)",
  boxShadow: "var(--app-shadow)",
  fontSize: 12,
};

export function SalesTrendChart() {
  return (
    <div className="h-[270px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={salesTrend} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--app-border)" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(value) => formatCompactCurrency(Number(value)).replace("Rp", "")}
            tick={{ fill: "var(--app-text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--app-text-muted)" }} />
          <Area type="monotone" dataKey="sales" name="Penjualan" stroke="#31895e" strokeWidth={2} fill="#31895e" fillOpacity={0.1} />
          <Area type="monotone" dataKey="target" name="Target" stroke="#94a39a" strokeWidth={1.5} strokeDasharray="5 4" fill="transparent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CustomerCategoryPerformanceChart() {
  return (
    <div className="h-[270px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={customerCategoryPerformance} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--app-border)" horizontal={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickFormatter={(value) => formatCompactCurrency(Number(value)).replace("Rp", "")}
            tick={{ fill: "var(--app-text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis type="category" dataKey="name" tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
          <Bar dataKey="sales" name="Penjualan" fill="#31895e" radius={[0, 5, 5, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
