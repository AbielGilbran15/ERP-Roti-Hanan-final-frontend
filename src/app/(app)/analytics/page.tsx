"use client";

import { Button, Field, Select } from "@fluentui/react-components";
import {
  ArrowDownload20Regular,
  BoxMultiple24Regular,
  BuildingShop24Regular,
  Money24Regular,
  TargetArrow24Regular,
} from "@fluentui/react-icons";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  CategoryMixPoint,
  CustomerCategoryPoint,
  ProductionAnalyticsPoint,
  SalesAnalyticsPoint,
} from "@/components/charts/analytics-charts";
import { ChartLoading } from "@/components/charts/chart-loading";
import { useAppToast } from "@/components/ui/app-toast";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { addLocalDays, endOfLocalDay, localDateKey, startOfLocalDay } from "@/lib/date";
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { CustomerCategory } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

const SalesAnalyticsChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((module) => module.SalesAnalyticsChart),
  { ssr: false, loading: () => <ChartLoading height="h-[290px]" /> },
);
const CategoryMixChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((module) => module.CategoryMixChart),
  { ssr: false, loading: () => <ChartLoading /> },
);
const CustomerCategoryAnalyticsChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((module) => module.CustomerCategoryAnalyticsChart),
  { ssr: false, loading: () => <ChartLoading /> },
);
const ProductionAnalyticsChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((module) => module.ProductionAnalyticsChart),
  { ssr: false, loading: () => <ChartLoading /> },
);

type Period = "hari" | "7hari" | "bulan";
type CategoryFilter = "all" | CustomerCategory;

const dailyTarget = 6_300_000;

export default function AnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("7hari");
  const [customerCategory, setCustomerCategory] = useState<CategoryFilter>("all");
  const toast = useAppToast();
  const sales = useERPStore((state) => state.sales);
  const products = useERPStore((state) => state.products);
  const productionOrders = useERPStore((state) => state.productionOrders);
  const stocks = useERPStore((state) => state.stocks);

  const analytics = useMemo(() => {
    const today = startOfLocalDay();
    const start = period === "hari"
      ? today
      : period === "7hari"
        ? startOfLocalDay(addLocalDays(today, -6))
        : new Date(today.getFullYear(), today.getMonth(), 1);
    const end = endOfLocalDay(today);
    const categorySales = sales.filter((sale) =>
      sale.status === "Selesai" &&
      new Date(sale.createdAt) >= start &&
      new Date(sale.createdAt) <= end &&
      (customerCategory === "all" || sale.customerCategory === customerCategory),
    );

    const dayKeys: string[] = [];
    for (let cursor = new Date(start); cursor <= today; cursor = addLocalDays(cursor, 1)) dayKeys.push(localDateKey(cursor));
    const categoryTargetFactor = customerCategory === "all" ? 1 : 0.5;
    const salesChart: SalesAnalyticsPoint[] = dayKeys.map((key) => ({
      day: period === "hari" ? "Hari ini" : formatDate(`${key}T12:00:00`, "dd MMM"),
      sales: categorySales.filter((sale) => localDateKey(sale.createdAt) === key).reduce((sum, sale) => sum + sale.total, 0),
      target: dailyTarget * categoryTargetFactor,
    }));

    const totalSales = categorySales.reduce((sum, sale) => sum + sale.total, 0);
    const target = dailyTarget * dayKeys.length * categoryTargetFactor;
    const categoryMixMap = new Map<string, number>();
    categorySales.forEach((sale) => sale.items.forEach((line) => {
      const product = products.find((item) => item.id === line.productId);
      const name = product?.productType || "Lainnya";
      categoryMixMap.set(name, (categoryMixMap.get(name) ?? 0) + line.quantity * line.unitPrice);
    }));
    const categoryMix: CategoryMixPoint[] = [...categoryMixMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const categoryPerformance: CustomerCategoryPoint[] = (["Agen 1", "Agen 2"] as CustomerCategory[])
      .filter((category) => customerCategory === "all" || category === customerCategory)
      .map((category) => {
        const rows = categorySales.filter((sale) => sale.customerCategory === category);
        const revenue = rows.reduce((sum, sale) => sum + sale.total, 0);
        const cost = rows.reduce((sum, sale) => sum + sale.items.reduce((lineSum, line) => {
          const product = products.find((item) => item.id === line.productId);
          return lineSum + (product?.cost ?? 0) * line.quantity;
        }, 0), 0);
        return { name: category, sales: revenue, margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0 };
      });

    const periodProduction = productionOrders.filter((order) => {
      const scheduled = new Date(order.scheduledAt);
      return scheduled >= start && scheduled <= end;
    });
    const productionChart: ProductionAnalyticsPoint[] = periodProduction.map((order) => ({
      label: formatDate(order.scheduledAt, period === "hari" ? "HH:mm" : "dd MMM"),
      target: order.targetQty,
      actual: order.actualQty,
    }));
    const productionTarget = periodProduction.reduce((sum, order) => sum + order.targetQty, 0);
    const productionActual = periodProduction.reduce((sum, order) => sum + order.actualQty, 0);
    const grossRevenue = categoryPerformance.reduce((sum, item) => sum + item.sales, 0);
    const grossMarginValue = categoryPerformance.reduce((sum, item) => sum + item.sales * item.margin / 100, 0);
    const margin = grossRevenue > 0 ? grossMarginValue / grossRevenue * 100 : 0;
    const topCategory = [...categoryPerformance].sort((a, b) => b.sales - a.sales)[0];
    const lowStock = products.filter((product) => {
      const available = stocks.filter((stock) => stock.productId === product.id && stock.status === "Tersedia").reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0);
      return product.isActive && available < product.minStock;
    });

    return {
      categorySales,
      salesChart,
      categoryMix,
      categoryPerformance,
      productionChart,
      totalSales,
      target,
      productionTarget,
      productionActual,
      margin,
      topCategory,
      lowStock,
    };
  }, [customerCategory, period, productionOrders, products, sales, stocks]);

  const targetAchievement = analytics.target > 0 ? analytics.totalSales / analytics.target * 100 : 0;
  const productionAchievement = analytics.productionTarget > 0 ? analytics.productionActual / analytics.productionTarget * 100 : 0;
  const periodLabel = period === "hari" ? "Hari ini" : period === "7hari" ? "7 hari terakhir" : "Bulan ini";

  const exportReport = () => {
    const rows = [
      ["Nomor", "Tanggal", "Kategori", "Total", "Status"],
      ...analytics.categorySales.map((sale) => [sale.number, sale.createdAt, sale.customerCategory, String(sale.total), sale.status]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `analitik-${period}-${customerCategory.replaceAll(" ", "-").toLowerCase()}-${localDateKey()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("Laporan diunduh", `${analytics.categorySales.length} transaksi pada filter aktif diekspor ke CSV.`);
  };

  const findings = analytics.totalSales === 0 ? [
    { code: "01", title: "Belum ada penjualan pada filter", detail: "Ubah periode atau kategori agen untuk menampilkan transaksi yang tersedia.", status: "Info", accent: "border-l-blue-500", href: "/sales" },
    { code: "02", title: "Pantau jadwal produksi", detail: `${formatNumber(analytics.productionActual)} dari ${formatNumber(analytics.productionTarget)} unit tercatat pada periode ini.`, status: "Perlu dicek", accent: "border-l-amber-500", href: "/production" },
    { code: "03", title: "Tinjau stok minimum", detail: `${analytics.lowStock.length} barang berada di bawah batas minimum.`, status: analytics.lowStock.length ? "Prioritas Tinggi" : "Aman", accent: analytics.lowStock.length ? "border-l-red-500" : "border-l-emerald-600", href: "/inventory" },
  ] : [
    { code: "01", title: `Jaga layanan ${analytics.topCategory?.name ?? "agen"}`, detail: `Kontribusi tertinggi pada filter ini sebesar ${formatCurrency(analytics.topCategory?.sales ?? 0)}.`, status: "Prioritas Tinggi", accent: "border-l-red-500", href: "/sales" },
    { code: "02", title: productionAchievement < 95 ? "Kejar target produksi" : "Produksi sesuai rencana", detail: `Capaian produksi ${productionAchievement.toFixed(1)}% pada periode terpilih.`, status: productionAchievement < 95 ? "Perlu Tindakan" : "Aman", accent: productionAchievement < 95 ? "border-l-amber-500" : "border-l-emerald-600", href: "/production" },
    { code: "03", title: "Tinjau stok minimum", detail: `${analytics.lowStock.length} barang berada di bawah batas minimum.`, status: analytics.lowStock.length ? "Perlu dicek" : "Aman", accent: analytics.lowStock.length ? "border-l-amber-500" : "border-l-emerald-600", href: "/inventory" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard Analitik"
        description="Satukan indikator penjualan B2B, produksi, persediaan, dan margin pusat untuk keputusan operasional."
        actions={<Button icon={<ArrowDownload20Regular />} onClick={exportReport}>Ekspor CSV</Button>}
      />

      <SectionPanel>
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <Field label="Periode"><Select value={period} onChange={(event) => setPeriod(event.target.value as Period)}><option value="hari">Hari ini</option><option value="7hari">7 hari terakhir</option><option value="bulan">Bulan ini</option></Select></Field>
          <Field label="Kategori agen"><Select value={customerCategory} onChange={(event) => setCustomerCategory(event.target.value as CategoryFilter)}><option value="all">Agen 1 & Agen 2</option><option value="Agen 1">Agen 1</option><option value="Agen 2">Agen 2</option></Select></Field>
        </div>
      </SectionPanel>

      <MetricStrip items={[
        { label: `Penjualan · ${periodLabel}`, value: formatCompactCurrency(analytics.totalSales), detail: `${analytics.categorySales.length} transaksi selesai`, trend: analytics.totalSales ? "up" : "neutral", icon: <Money24Regular />, onClick: () => router.push("/sales") },
        { label: "Pencapaian target", value: `${targetAchievement.toFixed(1)}%`, detail: `${formatCurrency(Math.max(analytics.target - analytics.totalSales, 0))} menuju target`, trend: targetAchievement >= 100 ? "up" : "down", icon: <TargetArrow24Regular />, onClick: () => document.getElementById("sales-analytics")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
        { label: "Hasil produksi", value: `${formatNumber(analytics.productionActual)} unit`, detail: `${productionAchievement.toFixed(1)}% dari target periode`, trend: productionAchievement >= 95 ? "up" : "neutral", icon: <BoxMultiple24Regular />, onClick: () => router.push("/production") },
        { label: "Margin agen", value: `${analytics.margin.toFixed(1)}%`, detail: analytics.topCategory ? `${analytics.topCategory.name} tertinggi pada filter` : "Belum ada transaksi", trend: analytics.margin > 0 ? "up" : "neutral", icon: <BuildingShop24Regular />, onClick: () => document.getElementById("category-analytics")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
      ]} />

      <div id="sales-analytics" className="scroll-mt-24 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <SectionPanel title="Penjualan terhadap target" description="Nilai bersih pusat pada periode terpilih."><SalesAnalyticsChart data={analytics.salesChart} /></SectionPanel>
        <SectionPanel title="Komposisi kategori" description="Kontribusi kategori produk terhadap penjualan."><CategoryMixChart data={analytics.categoryMix} /></SectionPanel>
      </div>

      <div id="category-analytics" className="scroll-mt-24 grid gap-5 xl:grid-cols-2">
        <SectionPanel title="Kinerja kategori agen" description="Penjualan bersih Agen 1 dibanding Agen 2 pada filter aktif."><CustomerCategoryAnalyticsChart data={analytics.categoryPerformance} /></SectionPanel>
        <SectionPanel title="Pencapaian produksi" description="Target dan hasil aktual pada periode terpilih."><ProductionAnalyticsChart data={analytics.productionChart} /></SectionPanel>
      </div>

      <SectionPanel title="Temuan untuk keputusan" description="Kesimpulan otomatis dari data lokal yang sedang ditampilkan.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {findings.map((item) => (
            <button key={item.title} type="button" className={`focus-ring min-w-0 rounded-xl border border-l-[3px] border-[var(--app-border)] bg-[var(--app-surface-2)]/45 p-4 text-left transition-colors hover:bg-[var(--app-surface-2)] md:last:col-span-2 xl:last:col-span-1 ${item.accent}`} onClick={() => router.push(item.href)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-muted)]">Sinyal {item.code}</span>
                <StatusBadge status={item.status} />
              </div>
              <h3 className="mt-4 text-pretty text-sm font-semibold leading-5">{item.title}</h3>
              <p className="mt-2 text-pretty text-xs leading-5 text-[var(--app-text-muted)]">{item.detail}</p>
              <p className="mt-3 text-xs font-semibold text-[var(--app-accent)]">Buka rincian</p>
            </button>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}
