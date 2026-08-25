"use client";

import { Button } from "@fluentui/react-components";
import {
  ArrowRight20Regular,
  BoxCheckmark24Regular,
  BuildingFactory24Regular,
  Cart24Regular,
  CheckmarkCircle24Regular,
  Money24Regular,
  Warning24Regular,
} from "@fluentui/react-icons";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ChartLoading } from "@/components/charts/chart-loading";
import { MetricStrip, type MetricItem } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCompactCurrency, formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { useERPStore } from "@/store/use-erp-store";
import { canAccessRoute, type AppRoute } from "@/lib/access";
import { localDateKey } from "@/lib/date";

const SalesTrendChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((module) => module.SalesTrendChart),
  { ssr: false, loading: () => <ChartLoading /> },
);

const CustomerCategoryPerformanceChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((module) => module.CustomerCategoryPerformanceChart),
  { ssr: false, loading: () => <ChartLoading /> },
);

export default function DashboardPage() {
  const { user, role, business } = useCurrentAccess();
  const sales = useERPStore((state) => state.sales);
  const salesShifts = useERPStore((state) => state.salesShifts);
  const stocks = useERPStore((state) => state.stocks);
  const productionOrders = useERPStore((state) => state.productionOrders);
  const qualityInspections = useERPStore((state) => state.qualityInspections);
  const purchaseOrders = useERPStore((state) => state.purchaseOrders);
  const invoices = useERPStore((state) => state.invoices);
  const approvals = useERPStore((state) => state.approvals);
  const payrolls = useERPStore((state) => state.payrolls);
  const customers = useERPStore((state) => state.customers);
  const products = useERPStore((state) => state.products);
  const productNames = useMemo(() => new Map(products.map((item) => [item.id, item.name])), [products]);
  const customerNames = useMemo(() => new Map(customers.map((item) => [item.id, item.name])), [customers]);
  const availableStockByProduct = useMemo(() => {
    const totals = new Map<string, number>();
    for (const stock of stocks) {
      if (stock.status !== "Tersedia") continue;
      totals.set(stock.productId, (totals.get(stock.productId) ?? 0) + Math.max(stock.onHand - stock.reserved, 0));
    }
    return totals;
  }, [stocks]);
  const productName = (productId: string) => productNames.get(productId) ?? productId;

  const todayKey = localDateKey();
  const todaySales = sales.filter((sale) => localDateKey(sale.createdAt) === todayKey);
  const totalSales = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const availableStock = stocks.reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0);
  const qcPending = qualityInspections.filter((item) => item.status === "Menunggu" || item.status === "Ditahan").length;
  const productionTarget = productionOrders.reduce((sum, item) => sum + item.targetQty, 0);
  const productionActual = productionOrders.reduce((sum, item) => sum + item.actualQty, 0);
  const overdue = invoices.filter((invoice) => invoice.status === "Jatuh Tempo").reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0);
  const pendingApprovals = approvals.filter((item) => item.status === "Menunggu");
  const activeOrders = sales.filter((sale) => !["Selesai", "Diretur"].includes(sale.status));
  const lowStockCount = products.filter((product) => {
    const available = availableStockByProduct.get(product.id) ?? 0;
    return product.isActive && available < product.minStock;
  }).length;
  const openProduction = productionOrders.filter((order) => !["Selesai", "Ditahan"].includes(order.status)).length;
  const openPurchasing = purchaseOrders.filter((order) => order.status !== "Diterima").length;
  const roleHome: AppRoute = role === "Admin Penjualan/Sales" ? "/sales" : role === "Staff Gudang" ? "/inventory" : role === "Staff Produksi" || role === "QC Inspector" ? "/production" : role === "Staff Purchasing" ? "/purchasing" : role === "Admin HR/Finance" ? "/finance" : "/dashboard";

  const ownerMetrics: MetricItem[] = [
    { label: "Penjualan hari ini", value: formatCompactCurrency(totalSales), detail: `${todaySales.length} transaksi hari ini`, trend: todaySales.length ? "up" : "neutral", icon: <Cart24Regular />, href: "/sales" },
    { label: "Output produksi", value: `${formatNumber(productionActual)} pcs`, detail: `${formatNumber(productionTarget)} pcs direncanakan`, trend: "neutral", icon: <BuildingFactory24Regular />, href: "/production" },
    { label: "Stok siap digunakan", value: formatNumber(availableStock), detail: `${lowStockCount} barang di bawah minimum`, trend: lowStockCount ? "down" : "up", icon: <BoxCheckmark24Regular />, href: "/inventory" },
    { label: "Piutang terlambat", value: formatCompactCurrency(overdue), detail: "Perlu ditagih hari ini", trend: overdue ? "down" : "neutral", icon: <Money24Regular />, href: "/finance" },
  ];

  const operationalMetrics: MetricItem[] = role === "Admin Penjualan/Sales" ? [
    { label: "Penjualan hari ini", value: formatCurrency(totalSales), detail: `${todaySales.length} transaksi`, trend: todaySales.length ? "up" : "neutral", icon: <Cart24Regular />, href: "/sales" },
    { label: "Pesanan aktif", value: String(activeOrders.length), detail: "Perlu dipantau pemenuhannya", trend: "neutral", icon: <Warning24Regular />, href: "/sales" },
    { label: "Agen aktif", value: String(customers.filter((customer) => customer.isActive).length), detail: "Agen 1 dan Agen 2", trend: "neutral", icon: <CheckmarkCircle24Regular />, href: "/master-data" },
    { label: "Shift POS", value: String(salesShifts.filter((shift) => shift.status === "Buka").length), detail: "Shift masih terbuka", trend: "neutral", icon: <Money24Regular />, href: "/sales" },
  ] : role === "Staff Gudang" ? [
    { label: "Stok tersedia", value: formatNumber(availableStock), detail: "Seluruh area gudang pusat", trend: "neutral", icon: <BoxCheckmark24Regular />, href: "/inventory" },
    { label: "Pemenuhan aktif", value: String(activeOrders.length), detail: "Pesanan menunggu tindakan", trend: "neutral", icon: <Cart24Regular />, href: "/inventory" },
    { label: "Stok minimum", value: String(lowStockCount), detail: "Perlu pengadaan atau produksi", trend: lowStockCount ? "down" : "up", icon: <Warning24Regular />, href: "/inventory" },
    { label: "Menunggu QC", value: String(qcPending), detail: "Batch atau bahan", trend: qcPending ? "down" : "neutral", icon: <CheckmarkCircle24Regular />, href: "/production" },
  ] : role === "Staff Produksi" || role === "QC Inspector" ? [
    { label: "Batch aktif", value: String(openProduction), detail: "Jadwal produksi berjalan", trend: "neutral", icon: <BuildingFactory24Regular />, href: "/production" },
    { label: "Target produksi", value: `${formatNumber(productionTarget)} pcs`, detail: `${formatNumber(productionActual)} pcs tercatat`, trend: "neutral", icon: <Cart24Regular />, href: "/production" },
    { label: "Menunggu QC", value: String(qcPending), detail: "Batch atau bahan", trend: qcPending ? "down" : "neutral", icon: <CheckmarkCircle24Regular />, href: "/production" },
    { label: "Stok tersedia", value: formatNumber(availableStock), detail: "Bahan dan produk pusat", trend: "neutral", icon: <BoxCheckmark24Regular />, href: "/inventory" },
  ] : role === "Staff Purchasing" ? [
    { label: "PO aktif", value: String(openPurchasing), detail: "Belum diterima penuh", trend: "neutral", icon: <Cart24Regular />, href: "/purchasing" },
    { label: "Bahan kritis", value: String(lowStockCount), detail: "Di bawah batas minimum", trend: lowStockCount ? "down" : "up", icon: <Warning24Regular />, href: "/purchasing" },
    { label: "Stok tersedia", value: formatNumber(availableStock), detail: "Rujukan kebutuhan beli", trend: "neutral", icon: <BoxCheckmark24Regular />, href: "/inventory" },
    { label: "Menunggu QC", value: String(qcPending), detail: "Penerimaan bahan", trend: qcPending ? "down" : "neutral", icon: <CheckmarkCircle24Regular />, href: "/inventory" },
  ] : [
    { label: "Piutang terlambat", value: formatCurrency(overdue), detail: "Perlu ditagih", trend: overdue ? "down" : "neutral", icon: <Money24Regular />, href: "/finance" },
    { label: "Tagihan aktif", value: String(invoices.filter((invoice) => invoice.status !== "Lunas").length), detail: "Utang dan piutang", trend: "neutral", icon: <Cart24Regular />, href: "/finance" },
    { label: "Payroll terbuka", value: String(payrolls.filter((payroll) => payroll.status === "Draft" || payroll.status === "Menunggu Persetujuan").length), detail: "Perlu diproses", trend: "neutral", icon: <CheckmarkCircle24Regular />, href: "/hr" },
    { label: "Analitik", value: formatCurrency(totalSales), detail: "Penjualan hari ini", trend: "neutral", icon: <Warning24Regular />, href: "/analytics" },
  ];

  const tasks = [
    ...qualityInspections
      .filter((item) => item.status === "Menunggu" || item.status === "Ditahan")
      .map((item) => ({ id: item.id, title: `${item.itemName} membutuhkan keputusan QC`, meta: item.reference, status: item.status, href: "/production" as AppRoute })),
    ...purchaseOrders
      .filter((item) => item.status === "Menunggu Persetujuan")
      .map((item) => ({ id: item.id, title: `${item.number} menunggu persetujuan`, meta: item.supplierNameSnapshot, status: item.status, href: (role === "Owner" ? "/approvals" : "/purchasing") as AppRoute })),
    ...sales
      .filter((item) => !["Selesai", "Diretur"].includes(item.status))
      .map((item) => ({ id: item.id, title: `Pemenuhan ${customerNames.get(item.customerId) ?? "agen"}`, meta: item.number, status: item.status, href: "/inventory" as AppRoute })),
  ].filter((task) => role ? canAccessRoute(role, task.href) : false).slice(0, 6);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Selamat datang, ${user?.name.split(" ")[0] ?? "Pengguna"}`}
        description={`${role} | ${business.name}. Fokus pada pekerjaan yang membutuhkan tindakan hari ini.`}
        actions={
          role === "Owner" ? (
            <Button as="a" appearance="primary" icon={<ArrowRight20Regular />} iconPosition="after" href="/approvals">
              Tinjau persetujuan
            </Button>
          ) : null
        }
      />

      <MetricStrip items={role === "Owner" ? ownerMetrics : operationalMetrics} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <SectionPanel title="Penjualan tujuh hari" description="Nilai penjualan pusat dibanding target harian.">
          <SalesTrendChart />
        </SectionPanel>

        <SectionPanel
          title="Pekerjaan prioritas"
          description={`${tasks.length} item membutuhkan perhatian`}
          action={
            <Link href={tasks[0]?.href ?? roleHome} className="text-xs font-semibold text-[var(--app-accent)] hover:underline">
              Lihat semua
            </Link>
          }
          noPadding
        >
          <div>
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={task.href}
                className="interactive-row block border-b border-[var(--app-border)] px-4 py-3.5 last:border-0 md:px-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--app-text)]">{task.title}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-[var(--app-text-muted)]">{task.meta}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              </Link>
            ))}
          </div>
        </SectionPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.75fr)_minmax(0,1.25fr)]">
        <SectionPanel title="Penjualan per kategori agen" description="Perbandingan nilai transaksi Agen 1 dan Agen 2 hari ini.">
          <CustomerCategoryPerformanceChart />
        </SectionPanel>

        <SectionPanel title="Aktivitas terbaru" description="Perubahan operasional dari seluruh modul." noPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[var(--app-surface-2)] text-[11px] uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Waktu</th>
                  <th className="px-4 py-2.5 font-semibold">Aktivitas</th>
                  <th className="px-4 py-2.5 font-semibold">Referensi</th>
                  <th className="px-4 py-2.5 font-semibold">Nilai/Kuantitas</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...todaySales.slice(0, 3).map((sale) => ({ time: sale.createdAt, activity: `Penjualan ${customerNames.get(sale.customerId) ?? "agen"}`, ref: sale.number, value: formatCurrency(sale.total), status: sale.status })),
                  ...productionOrders.slice(0, 2).map((order) => ({ time: order.completedAt ?? order.scheduledAt, activity: `Produksi ${productName(order.productId)}`, ref: order.batchNumber, value: `${formatNumber(order.actualQty || order.targetQty)} pcs`, status: order.status })),
                ].map((activity) => (
                  <tr key={activity.ref} className="interactive-row border-b border-[var(--app-border)] last:border-0">
                    <td className="px-4 py-3 text-xs text-[var(--app-text-muted)]">{formatDateTime(activity.time)}</td>
                    <td className="px-4 py-3 font-medium">{activity.activity}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--app-text-muted)]">{activity.ref}</td>
                    <td className="tabular px-4 py-3">{activity.value}</td>
                    <td className="px-4 py-3"><StatusBadge status={activity.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
