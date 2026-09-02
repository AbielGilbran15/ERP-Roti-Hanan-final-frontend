"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/format";

export type SalesAnalyticsPoint = { day: string; sales: number; target: number };
export type CustomerCategoryPoint = { name: string; sales: number; margin: number };
export type ProductionAnalyticsPoint = { label: string; target: number; actual: number };
export type CategoryMixPoint = { name: string; value: number };

const colors = ["#0f766e", "#3b82f6", "#f59e0b", "#94a3b8"];

const tooltipStyle = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  color: "var(--app-text)",
};

function ChartEmpty({ children }: { children: string }) {
  return <div className="grid h-full place-items-center rounded-lg border border-dashed border-[var(--app-border)] text-center text-sm text-[var(--app-text-muted)]">{children}</div>;
}

export function SalesAnalyticsChart({ data }: { data: SalesAnalyticsPoint[] }) {
  return (
    <div className="h-[290px]" aria-label="Grafik penjualan dan target tujuh hari">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--app-border)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatCompactCurrency} tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="sales" name="Penjualan" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="target" name="Target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CustomerCategoryAnalyticsChart({ data }: { data: CustomerCategoryPoint[] }) {
  if (!data.some((item) => item.sales > 0)) return <div className="h-[270px]"><ChartEmpty>Belum ada penjualan pada filter ini.</ChartEmpty></div>;
  return (
    <div className="h-[270px]" aria-label="Grafik penjualan per kategori agen">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="var(--app-border)" horizontal={false} />
          <XAxis type="number" tickFormatter={formatCompactCurrency} tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={68} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
          <Bar dataKey="sales" name="Penjualan" fill="#0f766e" radius={[0, 4, 4, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProductionAnalyticsChart({ data }: { data: ProductionAnalyticsPoint[] }) {
  if (!data.length) return <div className="h-[270px]"><ChartEmpty>Belum ada hasil produksi pada periode ini.</ChartEmpty></div>;
  return (
      <div className="h-[270px]" aria-label="Grafik total hasil proses dan jumlah berhasil per batch">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--app-border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => formatNumber(value)} tick={{ fill: "var(--app-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip formatter={(value) => `${formatNumber(Number(value))} unit`} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="target" name="Total proses" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="actual" name="Berhasil" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryMixChart({ data }: { data: CategoryMixPoint[] }) {
  if (!data.some((item) => item.value > 0)) return <div className="h-[270px]"><ChartEmpty>Belum ada komposisi produk pada filter ini.</ChartEmpty></div>;
  return (
    <div className="h-[270px]" aria-label="Komposisi penjualan per kategori">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="46%" innerRadius={56} outerRadius={88} paddingAngle={2}>
            {data.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
