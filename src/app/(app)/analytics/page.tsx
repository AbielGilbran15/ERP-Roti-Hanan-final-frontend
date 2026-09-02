"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Select,
  Textarea,
} from "@fluentui/react-components";
import {
  ArrowDownload20Regular,
  BoxMultiple24Regular,
  BuildingShop24Regular,
  Edit20Regular,
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
import { useCurrentAccess } from "@/hooks/use-current-access";
import { useAppToast } from "@/components/ui/app-toast";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { addLocalDays, endOfLocalDay, localDateKey, startOfLocalDay } from "@/lib/date";
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { canPerformAction } from "@/lib/access";
import { isPostedSale, postedSaleDateKey } from "@/lib/finance";
import { getFinishedProductCategory } from "@/lib/product-classification";
import type { CustomerCategory, SalesTarget } from "@/lib/types";
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

type Period = "hari" | "minggu" | "bulan" | "tahun" | "custom";
type CategoryFilter = "all" | CustomerCategory;
type SalesTargetForm = {
  id: string;
  effectiveFrom: string;
  effectiveUntil: string;
  agent1DailyTarget: string;
  agent2DailyTarget: string;
  notes: string;
};

const emptySalesTargetForm = (): SalesTargetForm => {
  const today = new Date();
  return {
    id: "",
    effectiveFrom: localDateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
    effectiveUntil: localDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    agent1DailyTarget: "",
    agent2DailyTarget: "",
    notes: "",
  };
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { role } = useCurrentAccess();
  const [period, setPeriod] = useState<Period>("minggu");
  const [customStart, setCustomStart] = useState(() => localDateKey(addLocalDays(new Date(), -6)));
  const [customEnd, setCustomEnd] = useState(() => localDateKey());
  const [customerCategory, setCustomerCategory] = useState<CategoryFilter>("all");
  const [finishedCategory, setFinishedCategory] = useState("all");
  const [finishedType, setFinishedType] = useState("all");
  const [finishedVariant, setFinishedVariant] = useState("all");
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [targetForm, setTargetForm] = useState<SalesTargetForm>(() => emptySalesTargetForm());
  const toast = useAppToast();
  const sales = useERPStore((state) => state.sales);
  const salesTargets = useERPStore((state) => state.salesTargets);
  const saveSalesTarget = useERPStore((state) => state.saveSalesTarget);
  const products = useERPStore((state) => state.products);
  const finishedProductCategories = useERPStore((state) => state.finishedProductCategories);
  const finishedProductTypes = useERPStore((state) => state.finishedProductTypes);
  const finishedProductVariants = useERPStore((state) => state.finishedProductVariants);
  const productionOrders = useERPStore((state) => state.productionOrders);
  const stocks = useERPStore((state) => state.stocks);
  const salesReturns = useERPStore((state) => state.salesReturns);
  const expenses = useERPStore((state) => state.expenses);
  const payrolls = useERPStore((state) => state.payrolls);
  const canManageTarget = canPerformAction(role, "analytics.target.manage");

  const openTargetEditor = (target?: SalesTarget) => {
    setTargetForm(target ? {
      id: target.id,
      effectiveFrom: target.effectiveFrom,
      effectiveUntil: target.effectiveUntil,
      agent1DailyTarget: String(target.agent1DailyTarget),
      agent2DailyTarget: String(target.agent2DailyTarget),
      notes: target.notes,
    } : emptySalesTargetForm());
    setTargetDialogOpen(true);
  };

  const analytics = useMemo(() => {
    const today = startOfLocalDay();
    const start = period === "hari"
      ? today
      : period === "minggu"
        ? startOfLocalDay(addLocalDays(today, -6))
        : period === "bulan"
          ? new Date(today.getFullYear(), today.getMonth(), 1)
          : period === "tahun"
            ? new Date(today.getFullYear(), 0, 1)
            : startOfLocalDay(new Date(`${customStart}T12:00:00`));
    const end = period === "custom" ? endOfLocalDay(new Date(`${customEnd}T12:00:00`)) : endOfLocalDay(today);
    const classificationData = { categories: finishedProductCategories, types: finishedProductTypes, variants: finishedProductVariants };
    const matchesProductClassification = (productId: string) => {
      const product = products.find((item) => item.id === productId);
      return Boolean(product) &&
        (finishedCategory === "all" || product?.finishedProductCategoryId === finishedCategory) &&
        (finishedType === "all" || product?.finishedProductTypeId === finishedType) &&
        (finishedVariant === "all" || product?.finishedProductVariantId === finishedVariant);
    };
    const categorySales = sales.filter((sale) =>
      isPostedSale(sale) &&
      new Date(`${postedSaleDateKey(sale)}T12:00:00`) >= start &&
      new Date(`${postedSaleDateKey(sale)}T12:00:00`) <= end &&
      (customerCategory === "all" || sale.customerCategory === customerCategory),
    ).flatMap((sale) => {
      const items = sale.items.filter((line) => {
        return matchesProductClassification(line.productId);
      });
      if (!items.length) return [];
      const subtotal = items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      const discount = sale.subtotal > 0 ? sale.discount * subtotal / sale.subtotal : 0;
      return [{ ...sale, items, subtotal, discount, total: subtotal - discount }];
    });

    const dayKeys: string[] = [];
    for (let cursor = new Date(start); cursor <= end; cursor = addLocalDays(cursor, 1)) dayKeys.push(localDateKey(cursor));
    const targetForDay = (key: string) => {
      const configured = salesTargets.find((item) => item.effectiveFrom <= key && item.effectiveUntil >= key);
      if (!configured) return null;
      if (customerCategory === "Agen 1") return configured.agent1DailyTarget;
      if (customerCategory === "Agen 2") return configured.agent2DailyTarget;
      return configured.agent1DailyTarget + configured.agent2DailyTarget;
    };
    const filteredReturns = salesReturns.filter((salesReturn) => {
      const created = new Date(salesReturn.createdAt);
      const originalSale = sales.find((sale) => sale.id === salesReturn.saleId);
      return created >= start && created <= end
        && Boolean(originalSale)
        && (customerCategory === "all" || originalSale?.customerCategory === customerCategory);
    }).map((salesReturn) => ({
      ...salesReturn,
      items: salesReturn.items.filter((item) => matchesProductClassification(item.productId)),
    })).filter((salesReturn) => salesReturn.items.length > 0);
    const returnValue = filteredReturns.reduce((sum, salesReturn) => sum + salesReturn.items.reduce((lineSum, line) => lineSum + line.quantity * line.unitPrice, 0), 0);
    const salesChart: SalesAnalyticsPoint[] = dayKeys.map((key) => ({
      day: period === "hari" ? "Hari ini" : formatDate(`${key}T12:00:00`, period === "tahun" ? "dd MMM" : "dd MMM"),
      sales: categorySales.filter((sale) => postedSaleDateKey(sale) === key).reduce((sum, sale) => sum + sale.total, 0)
        - filteredReturns.filter((item) => localDateKey(item.createdAt) === key).reduce((sum, item) => sum + item.items.reduce((lineSum, line) => lineSum + line.quantity * line.unitPrice, 0), 0),
      target: targetForDay(key) ?? 0,
    }));

    const grossSales = categorySales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = grossSales - returnValue;
    const configuredTargetDays = dayKeys.filter((key) => targetForDay(key) !== null).length;
    const target = dayKeys.reduce((sum, key) => sum + (targetForDay(key) ?? 0), 0);
    const categoryMixMap = new Map<string, number>();
    categorySales.forEach((sale) => sale.items.forEach((line) => {
      const product = products.find((item) => item.id === line.productId);
      const name = getFinishedProductCategory(classificationData, product?.finishedProductCategoryId)?.name || "Belum diklasifikasikan";
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
      const reported = new Date(order.completedAt ?? order.reportedAt ?? order.scheduledAt);
      return reported >= start && reported <= end && order.outputs.some((output) => matchesProductClassification(output.productId));
    });
    const productionChart: ProductionAnalyticsPoint[] = periodProduction.map((order) => {
      const outputs = order.outputs.filter((output) => matchesProductClassification(output.productId));
      const actual = outputs.reduce((sum, output) => sum + output.goodQty, 0);
      const failed = outputs.reduce((sum, output) => sum + output.failedQty, 0);
      return {
        label: formatDate(order.completedAt ?? order.scheduledAt, period === "hari" ? "HH:mm" : "dd MMM"),
        target: actual + failed,
        actual,
      };
    });
    const productionTarget = productionChart.reduce((sum, order) => sum + order.target, 0);
    const productionActual = productionChart.reduce((sum, order) => sum + order.actual, 0);
    const grossRevenue = categoryPerformance.reduce((sum, item) => sum + item.sales, 0);
    const grossMarginValue = categoryPerformance.reduce((sum, item) => sum + item.sales * item.margin / 100, 0);
    const margin = grossRevenue > 0 ? grossMarginValue / grossRevenue * 100 : 0;
    const topCategory = [...categoryPerformance].sort((a, b) => b.sales - a.sales)[0];
    const lowStock = products.filter((product) => {
      if ((finishedCategory !== "all" || finishedType !== "all" || finishedVariant !== "all") && !matchesProductClassification(product.id)) return false;
      const available = stocks.filter((stock) => stock.productId === product.id && stock.status === "Tersedia").reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0);
      return product.isActive && available < product.minStock;
    });
    const returnHpp = filteredReturns.reduce((sum, item) => sum + item.items.reduce((lineSum, line) => lineSum + line.quantity * (products.find((product) => product.id === line.productId)?.cost ?? 0), 0), 0);
    const hpp = Math.max(grossRevenue - grossMarginValue - returnHpp, 0);
    const grossProfit = totalSales - hpp;
    const operatingExpenses = expenses
      .filter((expense) => ["Disetujui", "Dibayar"].includes(expense.status) && new Date(`${expense.date}T12:00:00`) >= start && new Date(`${expense.date}T12:00:00`) <= end)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const periodNames = new Set<string>();
    for (let cursor = new Date(start.getFullYear(), start.getMonth(), 1); cursor <= end; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
      periodNames.add(new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(cursor).toLocaleLowerCase("id-ID"));
    }
    const payroll = payrolls
      .filter((item) => periodNames.has(item.period.toLocaleLowerCase("id-ID")) && ["Disetujui", "Dibayar", "Dikunci"].includes(item.status))
      .reduce((sum, item) => sum + item.netPay, 0);
    const operatingProfit = grossProfit - operatingExpenses - payroll;

    return {
      categorySales,
      salesChart,
      categoryMix,
      categoryPerformance,
      productionChart,
      totalSales,
      target,
      configuredTargetDays,
      periodDayCount: dayKeys.length,
      productionTarget,
      productionActual,
      productionFailed: productionTarget - productionActual,
      margin,
      returnValue,
      hpp,
      grossProfit,
      operatingExpenses,
      payroll,
      operatingProfit,
      topCategory,
      lowStock,
    };
  }, [customEnd, customStart, customerCategory, expenses, finishedCategory, finishedProductCategories, finishedProductTypes, finishedProductVariants, finishedType, finishedVariant, payrolls, period, productionOrders, products, sales, salesReturns, salesTargets, stocks]);

  const typeOptions = finishedProductTypes.filter((item) => finishedCategory === "all" || item.categoryId === finishedCategory);
  const variantOptions = finishedProductVariants.filter((item) => {
    if (finishedType !== "all") return item.typeId === finishedType;
    if (finishedCategory === "all") return true;
    return finishedProductTypes.some((type) => type.id === item.typeId && type.categoryId === finishedCategory);
  });

  const targetAchievement = analytics.target > 0 ? analytics.totalSales / analytics.target * 100 : 0;
  const productionAchievement = analytics.productionTarget > 0 ? analytics.productionActual / analytics.productionTarget * 100 : 0;
  const periodLabel = period === "hari" ? "Hari ini" : period === "minggu" ? "7 hari terakhir" : period === "bulan" ? "Bulan ini" : period === "tahun" ? "Tahun ini" : `${formatDate(customStart)} – ${formatDate(customEnd)}`;
  const hasConfiguredTarget = analytics.configuredTargetDays > 0;
  const targetCoverageComplete = analytics.configuredTargetDays === analytics.periodDayCount;
  const targetMetricValue = !hasConfiguredTarget
    ? "Belum diatur"
    : analytics.target > 0
      ? `${targetAchievement.toFixed(1)}%`
      : formatCurrency(0);
  const targetMetricDetail = !hasConfiguredTarget
    ? "Target periode belum ditetapkan"
    : analytics.target <= 0
      ? "Target kategori ini ditetapkan nol"
      : targetCoverageComplete
        ? `${formatCurrency(Math.max(analytics.target - analytics.totalSales, 0))} menuju target`
        : `${formatCurrency(Math.max(analytics.target - analytics.totalSales, 0))} · target ${analytics.configuredTargetDays}/${analytics.periodDayCount} hari`;
  const todayKey = localDateKey();
  const currentTarget = salesTargets.find((item) => item.effectiveFrom <= todayKey && item.effectiveUntil >= todayKey);
  const sortedTargets = [...salesTargets].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const targetAgent1 = Number(targetForm.agent1DailyTarget);
  const targetAgent2 = Number(targetForm.agent2DailyTarget);
  const targetFormInvalid = !targetForm.effectiveFrom || !targetForm.effectiveUntil || targetForm.effectiveFrom > targetForm.effectiveUntil ||
    !Number.isInteger(targetAgent1) || targetAgent1 < 0 || !Number.isInteger(targetAgent2) || targetAgent2 < 0 || targetAgent1 + targetAgent2 <= 0;

  const submitSalesTarget = () => {
    try {
      const saved = saveSalesTarget({
        id: targetForm.id || undefined,
        effectiveFrom: targetForm.effectiveFrom,
        effectiveUntil: targetForm.effectiveUntil,
        agent1DailyTarget: targetAgent1,
        agent2DailyTarget: targetAgent2,
        notes: targetForm.notes,
      });
      setTargetDialogOpen(false);
      toast("Target penjualan disimpan", `${formatCurrency(saved.agent1DailyTarget + saved.agent2DailyTarget)} per hari untuk pusat.`, "success");
    } catch (error) {
      toast("Target belum dapat disimpan", error instanceof Error ? error.message : "Periksa kembali periode dan nilai target.", "error");
    }
  };

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
    { code: "01", title: "Belum ada penjualan pada filter", detail: "Ubah periode atau kategori agen untuk menampilkan transaksi yang tersedia.", status: "Info", accent: "border-l-blue-500", href: "/sales#sales-history" },
    { code: "02", title: "Pantau hasil produksi", detail: `${formatNumber(analytics.productionActual)} berhasil dan ${formatNumber(analytics.productionFailed)} gagal pada periode ini.`, status: "Perlu dicek", accent: "border-l-amber-500", href: "/production#production-batches" },
    { code: "03", title: "Tinjau stok minimum", detail: `${analytics.lowStock.length} jenis barang memiliki stok siap pakai di bawah batas minimum.`, status: analytics.lowStock.length ? "Prioritas Tinggi" : "Aman", accent: analytics.lowStock.length ? "border-l-red-500" : "border-l-emerald-600", href: "/inventory#inventory-materials" },
  ] : [
    { code: "01", title: `Jaga layanan ${analytics.topCategory?.name ?? "agen"}`, detail: `Kontribusi penjualan tertinggi pada filter ini sebesar ${formatCurrency(analytics.topCategory?.sales ?? 0)}. Buka riwayat untuk melihat transaksi penyusunnya.`, status: "Prioritas Tinggi", accent: "border-l-red-500", href: "/sales#sales-history" },
    { code: "02", title: productionAchievement < 95 ? "Tinjau waste produksi" : "Yield produksi terjaga", detail: `Yield berhasil ${productionAchievement.toFixed(1)}% pada periode terpilih.`, status: productionAchievement < 95 ? "Perlu Tindakan" : "Aman", accent: productionAchievement < 95 ? "border-l-amber-500" : "border-l-emerald-600", href: "/production#production-batches" },
    { code: "03", title: "Tinjau stok minimum", detail: `${analytics.lowStock.length} jenis barang memiliki stok siap pakai di bawah batas minimum.`, status: analytics.lowStock.length ? "Perlu dicek" : "Aman", accent: analytics.lowStock.length ? "border-l-amber-500" : "border-l-emerald-600", href: "/inventory#inventory-materials" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard Analitik"
        description="Satukan indikator penjualan B2B, produksi, persediaan, dan margin pusat untuk keputusan operasional."
        actions={<div className="flex flex-wrap gap-2">
          {canManageTarget ? <Button appearance="primary" icon={<TargetArrow24Regular />} onClick={() => openTargetEditor(currentTarget)}>Atur target</Button> : null}
          <Button icon={<ArrowDownload20Regular />} onClick={exportReport}>Ekspor CSV</Button>
        </div>}
      />

      <SectionPanel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Periode"><Select value={period} onChange={(event) => setPeriod(event.target.value as Period)}><option value="hari">Harian</option><option value="minggu">Mingguan (7 hari)</option><option value="bulan">Bulanan</option><option value="tahun">Tahunan</option><option value="custom">Rentang tanggal khusus</option></Select></Field>
          <Field label="Kategori agen"><Select value={customerCategory} onChange={(event) => setCustomerCategory(event.target.value as CategoryFilter)}><option value="all">Agen 1 & Agen 2</option><option value="Agen 1">Agen 1</option><option value="Agen 2">Agen 2</option></Select></Field>
          <Field label="Kategori roti"><Select value={finishedCategory} onChange={(event) => { setFinishedCategory(event.target.value); setFinishedType("all"); setFinishedVariant("all"); }}><option value="all">Semua kategori</option>{finishedProductCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Tipe"><Select value={finishedType} onChange={(event) => { setFinishedType(event.target.value); setFinishedVariant("all"); }}><option value="all">Semua tipe</option>{typeOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Varian"><Select value={finishedVariant} onChange={(event) => setFinishedVariant(event.target.value)}><option value="all">Semua varian</option>{variantOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
        </div>
        {period === "custom" ? <div className="mt-4 grid gap-3 sm:max-w-xl sm:grid-cols-2"><Field label="Tanggal mulai"><Input type="date" value={customStart} max={customEnd} onChange={(_, data) => setCustomStart(data.value)} /></Field><Field label="Tanggal selesai"><Input type="date" value={customEnd} min={customStart} onChange={(_, data) => setCustomEnd(data.value)} /></Field></div> : null}
      </SectionPanel>

      <MetricStrip items={[
        { label: `Penjualan · ${periodLabel}`, value: formatCompactCurrency(analytics.totalSales), detail: `${analytics.categorySales.length} transaksi selesai`, trend: analytics.totalSales ? "up" : "neutral", icon: <Money24Regular />, onClick: () => router.push("/sales#sales-history") },
        { label: "Total HPP", value: formatCompactCurrency(analytics.hpp), detail: `Retur ${formatCompactCurrency(analytics.returnValue)}`, trend: "neutral", icon: <BoxMultiple24Regular />, onClick: () => router.push("/finance#finance-costs") },
        { label: "Laba kotor", value: formatCompactCurrency(analytics.grossProfit), detail: "Penjualan bersih − HPP", trend: analytics.grossProfit >= 0 ? "up" : "down", icon: <BuildingShop24Regular />, onClick: () => undefined, targetId: "category-analytics" },
        { label: "Laba operasional", value: formatCompactCurrency(analytics.operatingProfit), detail: `Setelah biaya ${formatCompactCurrency(analytics.operatingExpenses)} & payroll ${formatCompactCurrency(analytics.payroll)}`, trend: analytics.operatingProfit >= 0 ? "up" : "down", icon: <Money24Regular />, onClick: () => router.push("/finance#finance-profit") },
        { label: "Pencapaian target", value: targetMetricValue, detail: targetMetricDetail, trend: !hasConfiguredTarget || analytics.target <= 0 ? "neutral" : targetAchievement >= 100 ? "up" : "down", icon: <TargetArrow24Regular />, onClick: () => undefined, targetId: "sales-analytics" },
        { label: "Yield produksi", value: `${productionAchievement.toFixed(1)}%`, detail: `${formatNumber(analytics.productionActual)} berhasil · ${formatNumber(analytics.productionFailed)} gagal`, trend: productionAchievement >= 95 ? "up" : "neutral", icon: <BoxMultiple24Regular />, onClick: () => router.push("/production#production-batches") },
      ]} />

      <div id="sales-analytics" className="scroll-mt-24 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <SectionPanel title="Penjualan terhadap target" description="Nilai bersih pusat pada periode terpilih."><SalesAnalyticsChart data={analytics.salesChart} /></SectionPanel>
        <SectionPanel title="Komposisi kategori" description="Kontribusi kategori produk terhadap penjualan."><CategoryMixChart data={analytics.categoryMix} /></SectionPanel>
      </div>

      <div id="category-analytics" className="scroll-mt-24 grid gap-5 xl:grid-cols-2">
        <SectionPanel title="Kinerja kategori agen" description="Penjualan bersih Agen 1 dibanding Agen 2 pada filter aktif."><CustomerCategoryAnalyticsChart data={analytics.categoryPerformance} /></SectionPanel>
        <SectionPanel title="Hasil produksi" description="Total hasil proses dibanding jumlah berhasil; batch tidak memiliki target formula otomatis."><ProductionAnalyticsChart data={analytics.productionChart} /></SectionPanel>
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

      <Dialog open={targetDialogOpen} onOpenChange={(_, data) => setTargetDialogOpen(data.open)}>
        <DialogSurface className="erp-dialog--wide">
          <DialogBody>
            <DialogTitle>{targetForm.id ? "Ubah target penjualan" : "Atur target penjualan"}</DialogTitle>
            <DialogContent className="space-y-5">
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-xs leading-5 text-[var(--app-text-muted)]">
                Target pusat dihitung dari target harian Agen 1 dan Agen 2. Nilai pada dashboard akan dijumlahkan sesuai jumlah hari dalam filter aktif.
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Berlaku mulai" required><Input type="date" value={targetForm.effectiveFrom} onChange={(_, data) => setTargetForm((current) => ({ ...current, effectiveFrom: data.value }))} /></Field>
                <Field label="Berlaku sampai" required><Input type="date" value={targetForm.effectiveUntil} onChange={(_, data) => setTargetForm((current) => ({ ...current, effectiveUntil: data.value }))} /></Field>
                <Field label="Target harian Agen 1" required><Input type="number" min="0" step="1" contentBefore="Rp" value={targetForm.agent1DailyTarget} onChange={(_, data) => setTargetForm((current) => ({ ...current, agent1DailyTarget: data.value }))} /></Field>
                <Field label="Target harian Agen 2" required><Input type="number" min="0" step="1" contentBefore="Rp" value={targetForm.agent2DailyTarget} onChange={(_, data) => setTargetForm((current) => ({ ...current, agent2DailyTarget: data.value }))} /></Field>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--app-border)] px-4 py-3">
                <div><p className="text-xs text-[var(--app-text-muted)]">Target harian pusat</p><p className="mt-1 font-semibold tabular">{formatCurrency((Number.isFinite(targetAgent1) ? targetAgent1 : 0) + (Number.isFinite(targetAgent2) ? targetAgent2 : 0))}</p></div>
                <StatusBadge status={targetForm.id ? "Diubah" : "Draft"} />
              </div>

              <Field label="Catatan"><Textarea resize="vertical" value={targetForm.notes} placeholder="Contoh: target September berdasarkan rencana penjualan." onChange={(_, data) => setTargetForm((current) => ({ ...current, notes: data.value }))} /></Field>

              <div className="rounded-xl border border-[var(--app-border)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3">
                  <div><h3 className="text-sm font-semibold">Periode target tersimpan</h3><p className="mt-0.5 text-xs text-[var(--app-text-muted)]">Periode tidak boleh saling bertumpang tindih.</p></div>
                  <Button size="small" appearance="secondary" onClick={() => setTargetForm(emptySalesTargetForm())}>Target periode baru</Button>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {sortedTargets.length ? sortedTargets.map((target) => (
                    <div key={target.id} className="flex items-center justify-between gap-4 border-b border-[var(--app-border)] px-4 py-3 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{formatDate(target.effectiveFrom)} – {formatDate(target.effectiveUntil)}</p>
                        <p className="mt-1 text-xs text-[var(--app-text-muted)]">Agen 1 {formatCurrency(target.agent1DailyTarget)} · Agen 2 {formatCurrency(target.agent2DailyTarget)} per hari</p>
                      </div>
                      <Button size="small" appearance="subtle" icon={<Edit20Regular />} onClick={() => openTargetEditor(target)}>Edit</Button>
                    </div>
                  )) : <p className="px-4 py-6 text-center text-sm text-[var(--app-text-muted)]">Belum ada target penjualan tersimpan.</p>}
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setTargetDialogOpen(false)}>Batal</Button>
              <Button appearance="primary" disabled={targetFormInvalid} onClick={submitSalesTarget}>Simpan target</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
