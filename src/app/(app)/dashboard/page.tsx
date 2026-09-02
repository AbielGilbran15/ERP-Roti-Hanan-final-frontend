"use client";

import {
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
import { calculateMonthlyOperatingProfit, isPostedSale, postedSaleDateKey } from "@/lib/finance";

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
  const purchaseOrders = useERPStore((state) => state.purchaseOrders);
  const materialPurchaseRequests = useERPStore((state) => state.materialPurchaseRequests);
  const invoices = useERPStore((state) => state.invoices);
  const expenses = useERPStore((state) => state.expenses);
  const costOfGoodsSold = useERPStore((state) => state.costOfGoodsSold);
  const salesReturns = useERPStore((state) => state.salesReturns);
  const payrolls = useERPStore((state) => state.payrolls);
  const cashAccounts = useERPStore((state) => state.cashAccounts);
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
  const todaySales = sales.filter((sale) => postedSaleDateKey(sale) === todayKey && isPostedSale(sale));
  const totalSales = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const availableProductCount = products.filter((product) => product.isActive && (availableStockByProduct.get(product.id) ?? 0) > 0).length;
  const monthKey = todayKey.slice(0, 7);
  const currentPayrollPeriod = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());
  const companyProfit = calculateMonthlyOperatingProfit({
    monthKey,
    payrollPeriod: currentPayrollPeriod,
    sales,
    salesReturns,
    costOfGoodsSold,
    expenses,
    payrolls,
  }).profit;
  const productionActual = productionOrders.flatMap((order) => order.outputs).reduce((sum, item) => sum + item.goodQty, 0);
  const productionWaste = productionOrders.flatMap((order) => order.outputs).reduce((sum, item) => sum + item.failedQty, 0);
  const overdue = invoices.filter((invoice) => invoice.status === "Jatuh Tempo").reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0);
  const receivables = invoices.filter((invoice) => invoice.type === "Piutang" && invoice.status !== "Lunas").reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0);
  const payables = invoices.filter((invoice) => invoice.type === "Utang" && invoice.status !== "Lunas").reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0);
  const cashTotal = cashAccounts.reduce((sum, account) => sum + account.balance, 0);
  const finishedInventoryValue = stocks
    .filter((stock) => stock.warehouse === "Gudang Produk Jadi" && stock.status === "Tersedia")
    .reduce((sum, stock) => sum + stock.onHand * (products.find((product) => product.id === stock.productId)?.cost ?? 0), 0);
  const activeOrders = sales.filter((sale) => !isPostedSale(sale));
  const lowStockCount = products.filter((product) => {
    const available = availableStockByProduct.get(product.id) ?? 0;
    return product.isActive && available < product.minStock;
  }).length;
  const openProduction = productionOrders.filter((order) => order.status !== "Selesai").length;
  const pendingWarehouseRequests = productionOrders.filter((order) => ["Menunggu Gudang", "Ditunda Gudang", "Kekurangan Bahan", "Menunggu Pembelian"].includes(order.status));
  const pendingPurchaseRequests = materialPurchaseRequests.filter((request) => request.status === "Baru" || request.status === "Diproses");
  const openPurchasing = purchaseOrders.filter((order) => order.status !== "Diterima").length;
  const roleHome: AppRoute = role === "Admin Penjualan/Sales" ? "/sales" : role === "Staff Gudang" ? "/inventory" : role === "Staff Produksi" ? "/production" : role === "Staff Purchasing" ? "/purchasing" : role === "Admin HR/Finance" ? "/finance" : "/dashboard";

  const ownerMetrics: MetricItem[] = [
    { label: "Penjualan selesai hari ini", value: formatCompactCurrency(totalSales), detail: `${todaySales.length} transaksi sudah selesai`, trend: todaySales.length ? "up" : "neutral", icon: <Cart24Regular />, href: "/sales#sales-history" },
    { label: "Profit bulan ini", value: formatCompactCurrency(companyProfit), detail: "Pendapatan bersih − HPP − biaya − payroll", trend: companyProfit >= 0 ? "up" : "down", icon: <Money24Regular />, href: "/finance#finance-profit" },
    { label: "Nilai stok Barang Jadi", value: formatCompactCurrency(finishedInventoryValue), detail: "Stok fisik × HPP master", trend: "neutral", icon: <BoxCheckmark24Regular />, href: "/inventory#inventory-finished" },
    { label: "Kas & bank", value: formatCompactCurrency(cashTotal), detail: `${cashAccounts.length} akun`, trend: "neutral", icon: <Money24Regular />, href: "/finance#finance-cash" },
    { label: "Piutang / utang", value: `${formatCompactCurrency(receivables)} / ${formatCompactCurrency(payables)}`, detail: `${formatCompactCurrency(overdue)} piutang jatuh tempo`, trend: overdue ? "down" : "neutral", icon: <Money24Regular />, href: "/finance#finance-invoices" },
  ];

  const operationalMetrics: MetricItem[] = role === "Admin Penjualan/Sales" ? [
    { label: "Penjualan selesai hari ini", value: formatCurrency(totalSales), detail: `${todaySales.length} transaksi sudah selesai`, trend: todaySales.length ? "up" : "neutral", icon: <Cart24Regular />, href: "/sales#sales-history" },
    { label: "Pesanan aktif", value: String(activeOrders.length), detail: "Perlu dipantau pemenuhannya", trend: "neutral", icon: <Warning24Regular />, href: "/sales#sales-orders" },
    { label: "Agen aktif", value: String(customers.filter((customer) => customer.isActive).length), detail: "Agen 1 dan Agen 2", trend: "neutral", icon: <CheckmarkCircle24Regular />, href: "/master-data#master-agents" },
    { label: "Shift POS", value: String(salesShifts.filter((shift) => shift.status === "Buka").length), detail: "Shift masih terbuka", trend: "neutral", icon: <Money24Regular />, href: "/sales#sales-shift" },
  ] : role === "Staff Gudang" ? [
    { label: "Permintaan Produksi", value: String(pendingWarehouseRequests.length), detail: "Perlu keputusan Gudang", trend: pendingWarehouseRequests.length ? "down" : "neutral", icon: <BuildingFactory24Regular />, href: "/inventory#inventory-requests" },
    { label: "Jenis barang tersedia", value: `${availableProductCount} jenis`, detail: "Gudang Bahan dan Produk Jadi", trend: "neutral", icon: <BoxCheckmark24Regular />, href: "/inventory#inventory-materials" },
    { label: "Pemenuhan aktif", value: String(activeOrders.length), detail: "Pesanan menunggu tindakan", trend: "neutral", icon: <Cart24Regular />, href: "/inventory#inventory-fulfillment" },
    { label: "Stok minimum", value: String(lowStockCount), detail: "Perlu pengadaan atau produksi", trend: lowStockCount ? "down" : "up", icon: <Warning24Regular />, href: "/inventory#inventory-materials" },
  ] : role === "Staff Produksi" ? [
    { label: "Batch aktif", value: String(openProduction), detail: "Jadwal produksi berjalan", trend: "neutral", icon: <BuildingFactory24Regular />, href: "/production#production-batches" },
    { label: "Hasil berhasil", value: `${formatNumber(productionActual)} unit`, detail: `${formatNumber(productionWaste)} gagal/waste`, trend: "neutral", icon: <Cart24Regular />, href: "/production#production-batches" },
    { label: "Permintaan bahan", value: String(pendingWarehouseRequests.length), detail: "Menunggu Gudang/Purchasing", trend: pendingWarehouseRequests.length ? "down" : "neutral", icon: <Warning24Regular />, href: "/production#production-batches" },
    { label: "Jenis barang tersedia", value: `${availableProductCount} jenis`, detail: "Bahan dan produk pusat", trend: "neutral", icon: <BoxCheckmark24Regular />, href: "/inventory#inventory-materials" },
  ] : role === "Staff Purchasing" ? [
    { label: "Permintaan Gudang", value: String(pendingPurchaseRequests.length), detail: "Kekurangan bahan produksi", trend: pendingPurchaseRequests.length ? "down" : "neutral", icon: <Warning24Regular />, href: "/purchasing#purchasing-requests" },
    { label: "PO aktif", value: String(openPurchasing), detail: "Belum diterima penuh", trend: "neutral", icon: <Cart24Regular />, href: "/purchasing#purchasing-orders" },
    { label: "Bahan kritis", value: String(lowStockCount), detail: "Di bawah batas minimum", trend: lowStockCount ? "down" : "up", icon: <Warning24Regular />, href: "/purchasing#purchasing-needs" },
    { label: "Jenis barang tersedia", value: `${availableProductCount} jenis`, detail: "Rujukan kebutuhan beli", trend: "neutral", icon: <BoxCheckmark24Regular />, href: "/inventory#inventory-materials" },
  ] : [
    { label: "Piutang terlambat", value: formatCurrency(overdue), detail: "Perlu ditagih", trend: overdue ? "down" : "neutral", icon: <Money24Regular />, href: "/finance#finance-invoices" },
    { label: "Tagihan aktif", value: String(invoices.filter((invoice) => invoice.status !== "Lunas").length), detail: "Utang dan piutang", trend: "neutral", icon: <Cart24Regular />, href: "/finance#finance-invoices" },
    { label: "Payroll terbuka", value: String(payrolls.filter((payroll) => payroll.status === "Draft").length), detail: "Perlu diproses", trend: "neutral", icon: <CheckmarkCircle24Regular />, href: "/hr#hr-payroll" },
    { label: "Analitik", value: formatCurrency(totalSales), detail: "Penjualan hari ini", trend: "neutral", icon: <Warning24Regular />, href: "/analytics#sales-analytics" },
  ];

  const tasks = [
    ...pendingWarehouseRequests.map((item) => ({ id: `material-${item.id}`, title: `${item.materialRequestNumber ?? item.batchNumber} membutuhkan keputusan Gudang`, meta: item.batchNumber, status: item.status, href: "/inventory" as AppRoute })),
    ...pendingPurchaseRequests.map((item) => ({ id: item.id, title: `${item.number} membutuhkan tindak lanjut Purchasing`, meta: item.productionBatchNumber, status: item.status, href: "/purchasing" as AppRoute })),
    ...purchaseOrders
      .filter((item) => item.status === "Draft")
      .map((item) => ({ id: item.id, title: `${item.number} siap dikirim ke supplier`, meta: item.supplierNameSnapshot, status: item.status, href: "/purchasing" as AppRoute })),
    ...sales
      .filter((item) => !["Selesai", "Diretur"].includes(item.status))
      .map((item) => ({ id: item.id, title: `Pemenuhan ${customerNames.get(item.customerId) ?? "agen"}`, meta: item.number, status: item.status, href: "/inventory" as AppRoute })),
  ].filter((task) => role ? canAccessRoute(role, task.href) : false).slice(0, 6);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Selamat datang, ${user?.name.split(" ")[0] ?? "Pengguna"}`}
        description={`${role} | ${business.name}. Fokus pada pekerjaan yang membutuhkan tindakan hari ini.`}
      />

      <MetricStrip items={role === "Owner" ? ownerMetrics : operationalMetrics} className={role === "Owner" ? "owner-metric-strip" : undefined} />

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
                  ...productionOrders.slice(0, 2).map((order) => ({ time: order.completedAt ?? order.scheduledAt, activity: `Produksi ${order.outputs.length ? order.outputs.map((output) => productName(output.productId)).join(", ") : "batch manual"}`, ref: order.batchNumber, value: `${formatNumber(order.outputs.reduce((sum, output) => sum + output.goodQty, 0))} berhasil`, status: order.status })),
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
