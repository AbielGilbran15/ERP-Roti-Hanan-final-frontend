"use client";

import type { ColumnDef } from "@tanstack/react-table";
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
  Tab,
  TabList,
} from "@fluentui/react-components";
import {
  Add20Regular,
  ArrowRight20Regular,
  Beaker24Regular,
  BuildingFactory24Regular,
  Checkmark24Regular,
  Clock24Regular,
  Dismiss24Regular,
  Food24Regular,
  Pause24Regular,
  Warning24Regular,
} from "@fluentui/react-icons";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ChartLoading } from "@/components/charts/chart-loading";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/components/ui/app-toast";
import { formatDateTime, formatNumber } from "@/lib/format";
import { canPerformAction } from "@/lib/access";
import type { ProductionOrder, QualityInspection } from "@/lib/types";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { useERPStore } from "@/store/use-erp-store";

const ProductionChart = dynamic(
  () => import("@/components/charts/production-chart").then((module) => module.ProductionChart),
  { ssr: false, loading: () => <ChartLoading /> },
);

export default function ProductionPage() {
  const [tab, setTab] = useState("production");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState("prd-roti-susu");
  const [targetQty, setTargetQty] = useState("500");
  const [priority, setPriority] = useState<ProductionOrder["priority"]>("Normal");
  const [traceBatch, setTraceBatch] = useState("prod-001");
  const toast = useAppToast();
  const { role } = useCurrentAccess();
  const productionOrders = useERPStore((state) => state.productionOrders);
  const qualityInspections = useERPStore((state) => state.qualityInspections);
  const products = useERPStore((state) => state.products);
  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? id;
  const addProductionOrder = useERPStore((state) => state.addProductionOrder);
  const advanceProduction = useERPStore((state) => state.advanceProduction);
  const resolveInspection = useERPStore((state) => state.resolveInspection);
  const canCreateProduction = canPerformAction(role, "production.create");
  const targetNumber = Number(targetQty);
  const targetInvalid = !Number.isFinite(targetNumber) || !Number.isInteger(targetNumber) || targetNumber <= 0;

  const totalTarget = productionOrders.reduce((sum, item) => sum + item.targetQty, 0);
  const totalActual = productionOrders.reduce((sum, item) => sum + item.actualQty, 0);
  const waste = productionOrders.reduce((sum, item) => sum + item.wasteQty, 0);
  const yieldRate = totalActual + waste > 0 ? (totalActual / (totalActual + waste)) * 100 : 0;
  const pendingQc = qualityInspections.filter((item) => item.status === "Menunggu" || item.status === "Ditahan");

  const productionColumns = useMemo<ColumnDef<ProductionOrder>[]>(
    () => [
      { header: "Batch", accessorKey: "batchNumber", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Produk", accessorFn: (row) => productName(row.productId) },
      { header: "Jadwal", accessorKey: "scheduledAt", cell: ({ getValue }) => formatDateTime(String(getValue())) },
      { header: "Target", accessorKey: "targetQty", cell: ({ getValue }) => <span className="tabular">{formatNumber(Number(getValue()))} pcs</span> },
      {
        header: "Hasil / Waste",
        accessorFn: (row) => `${row.actualQty}/${row.wasteQty}`,
        cell: ({ row }) => <span className="tabular">{formatNumber(row.original.actualQty)} / <span className="text-red-700 dark:text-red-300">{formatNumber(row.original.wasteQty)}</span></span>,
      },
      { header: "Mesin", accessorKey: "machine" },
      { header: "Prioritas", accessorKey: "priority", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      {
        id: "action",
        header: "Tindakan",
        cell: ({ row }) =>
          (role === "Staff Produksi" || role === "Owner") && (row.original.status === "Dijadwalkan" || row.original.status === "Berjalan") ? (
            <Button
              size="small"
              appearance="primary"
              icon={<ArrowRight20Regular />}
              onClick={() => {
                advanceProduction(row.original.id);
                toast(row.original.status === "Dijadwalkan" ? "Produksi dimulai" : "Produksi dikirim ke QC", row.original.batchNumber);
              }}
            >
              {row.original.status === "Dijadwalkan" ? "Mulai" : "Selesaikan"}
            </Button>
          ) : null,
      },
    ],
    [advanceProduction, products, role, toast],
  );

  const qcColumns = useMemo<ColumnDef<QualityInspection>[]>(
    () => [
      { header: "Pemeriksaan", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Jenis", accessorKey: "type" },
      { header: "Item / Lot", accessorFn: (row) => `${row.itemName} ${row.lot}`, cell: ({ row }) => <div><p className="font-medium">{row.original.itemName}</p><p className="font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.lot}</p></div> },
      { header: "Referensi", accessorKey: "reference", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
      { header: "Inspector", accessorKey: "inspector" },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      {
        id: "action",
        header: "Keputusan QC",
        cell: ({ row }) =>
          (role === "QC Inspector" || role === "Owner") && (row.original.status === "Menunggu" || row.original.status === "Ditahan") ? (
            <div className="flex gap-1">
              <Button
                appearance="primary"
                size="small"
                icon={<Checkmark24Regular />}
                onClick={() => {
                  resolveInspection(row.original.id, "Lulus");
                  toast("Batch diluluskan", row.original.reference);
                }}
              >
                Lulus
              </Button>
              <Button
                appearance="secondary"
                size="small"
                icon={<Pause24Regular />}
                onClick={() => {
                  resolveInspection(row.original.id, "Ditahan");
                  toast("Batch ditahan", "Tindak lanjut QC diperlukan.", "warning");
                }}
              >
                Tahan
              </Button>
              <Button
                appearance="subtle"
                size="small"
                icon={<Dismiss24Regular />}
                aria-label="Tolak batch"
                onClick={() => {
                  resolveInspection(row.original.id, "Ditolak");
                  toast("Batch ditolak", row.original.reference, "error");
                }}
              />
            </div>
          ) : null,
      },
    ],
    [resolveInspection, role, toast],
  );

  const selectedTrace = productionOrders.find((item) => item.id === traceBatch) ?? productionOrders[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Produksi & QC"
        description="Susun rencana, jalankan batch, catat hasil dan waste, lalu lepaskan produk melalui pemeriksaan mutu."
        actions={canCreateProduction ? <Button appearance="primary" icon={<Add20Regular />} onClick={() => setDialogOpen(true)}>Buat perintah produksi</Button> : null}
      />

      <MetricStrip
        items={[
          { label: "Target hari ini", value: `${formatNumber(totalTarget)} pcs`, detail: `${productionOrders.length} batch`, trend: "neutral", icon: <BuildingFactory24Regular />, onClick: () => setTab("production") },
          { label: "Hasil tercatat", value: `${formatNumber(totalActual)} pcs`, detail: `${Math.round((totalActual / Math.max(totalTarget, 1)) * 100)}% dari target`, trend: "up", icon: <Food24Regular />, onClick: () => setTab("production") },
          { label: "Yield aktual", value: `${yieldRate.toFixed(1)}%`, detail: `${formatNumber(waste)} pcs waste`, trend: yieldRate > 95 ? "up" : "down", icon: <Beaker24Regular />, onClick: () => setTab("production") },
          { label: "Menunggu keputusan QC", value: String(pendingQc.length), detail: "Bahan, proses, atau produk jadi", trend: pendingQc.length ? "down" : "neutral", icon: <Warning24Regular />, onClick: () => setTab("qc") },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <SectionPanel title="Target dan hasil per gelombang" description="Output aktual bertambah saat batch diselesaikan.">
          <ProductionChart />
        </SectionPanel>
        <SectionPanel title="Antrean QC" description="Pemeriksaan yang perlu diselesaikan hari ini." noPadding>
          <div>
            {pendingQc.slice(0, 5).map((inspection) => (
              <button key={inspection.id} className="interactive-row block w-full border-b border-[var(--app-border)] px-4 py-3.5 text-left last:border-0" onClick={() => setTab("qc")}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{inspection.itemName}</p><p className="mt-1 font-mono text-[11px] text-[var(--app-text-muted)]">{inspection.reference}</p></div><StatusBadge status={inspection.status} /></div>
              </button>
            ))}
          </div>
        </SectionPanel>
      </div>

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} className="overflow-x-auto">
        <Tab value="production">Batch produksi</Tab>
        <Tab value="qc">Pemeriksaan QC</Tab>
        <Tab value="recipes">Resep & standar</Tab>
        <Tab value="trace">Pelacakan batch</Tab>
      </TabList>

      {tab === "production" ? <SectionPanel noPadding><DataTable data={productionOrders} columns={productionColumns} searchPlaceholder="Cari batch, produk, mesin..." /></SectionPanel> : null}
      {tab === "qc" ? <SectionPanel noPadding><DataTable data={qualityInspections} columns={qcColumns} searchPlaceholder="Cari pemeriksaan, lot, inspector..." /></SectionPanel> : null}

      {tab === "recipes" ? (
        <SectionPanel title="Resep aktif" description="Versi resep tidak berubah setelah dipakai oleh batch produksi." noPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[var(--app-surface-2)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--app-text-muted)]"><tr><th className="px-4 py-2.5">Produk</th><th className="px-4 py-2.5">Versi</th><th className="px-4 py-2.5">Ukuran batch</th><th className="px-4 py-2.5">Waktu standar</th><th className="px-4 py-2.5">Suhu panggang</th><th className="px-4 py-2.5">Status</th></tr></thead>
              <tbody>
                {[
                  { product: "Roti Susu", version: "v3.2", batch: 600, time: "224 menit", temp: "185 C" },
                  { product: "Roti Cokelat", version: "v2.8", batch: 520, time: "218 menit", temp: "182 C" },
                  { product: "Roti Keju", version: "v2.4", batch: 420, time: "210 menit", temp: "180 C" },
                  { product: "Roti Tawar Kupas", version: "v4.1", batch: 260, time: "246 menit", temp: "195 C" },
                ].map((recipe) => (
                  <tr key={recipe.product} className="interactive-row border-b border-[var(--app-border)] last:border-0"><td className="px-4 py-3 font-medium">{recipe.product}</td><td className="px-4 py-3 font-mono text-xs">{recipe.version}</td><td className="tabular px-4 py-3">{formatNumber(recipe.batch)} pcs</td><td className="px-4 py-3">{recipe.time}</td><td className="px-4 py-3">{recipe.temp}</td><td className="px-4 py-3"><StatusBadge status="Aktif" /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      ) : null}

      {tab === "trace" && selectedTrace ? (
        <SectionPanel title="Jejak satu batch" description="Dari bahan yang digunakan sampai stok produk jadi.">
          <Field label="Pilih batch" className="max-w-md">
            <Select value={traceBatch} onChange={(event) => setTraceBatch(event.target.value)}>
              {productionOrders.map((order) => <option key={order.id} value={order.id}>{order.batchNumber} | {productName(order.productId)}</option>)}
            </Select>
          </Field>
          <div className="mt-6 grid gap-3 lg:grid-cols-4">
            {[
              { label: "Bahan dikeluarkan", value: "Tepung TPG-260815-A", time: "01:38" },
              { label: "Produksi", value: selectedTrace.machine, time: formatDateTime(selectedTrace.startedAt ?? selectedTrace.scheduledAt) },
              { label: "QC produk jadi", value: selectedTrace.status === "Selesai" ? "Lulus" : selectedTrace.status, time: formatDateTime(selectedTrace.completedAt) },
              { label: "Stok / pemenuhan", value: selectedTrace.status === "Selesai" ? "Gudang Produk Jadi" : "Belum tersedia", time: selectedTrace.status === "Selesai" ? "Siap dialokasikan" : "Menunggu" },
            ].map((step) => (
              <article key={step.label} className="rounded-xl border border-[var(--app-border)] p-4">
                <Clock24Regular className="text-[var(--app-accent)]" />
                <p className="mt-3 text-xs font-medium text-[var(--app-text-muted)]">{step.label}</p>
                <p className="mt-1 text-sm font-semibold">{step.value}</p>
                <p className="mt-2 font-mono text-[11px] text-[var(--app-text-muted)]">{step.time}</p>
              </article>
            ))}
          </div>
        </SectionPanel>
      ) : null}

      <Dialog open={canCreateProduction && dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Buat perintah produksi</DialogTitle>
            <DialogContent className="space-y-4">
              <Field label="Produk"><Select value={productId} onChange={(event) => setProductId(event.target.value)}>{products.filter((item) => item.type === "Produk Jadi" && item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
              <Field label="Target produksi" validationState={targetInvalid ? "error" : "none"} validationMessage={targetInvalid ? "Target harus berupa bilangan bulat lebih dari nol." : undefined}><Input type="number" min="1" step="1" value={targetQty} onChange={(_, data) => setTargetQty(data.value)} contentAfter="pcs" /></Field>
              <Field label="Prioritas"><Select value={priority} onChange={(event) => setPriority(event.target.value as ProductionOrder["priority"])}><option>Normal</option><option>Tinggi</option><option>Mendesak</option></Select></Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button
                appearance="primary"
                disabled={targetInvalid}
                onClick={() => {
                  try {
                    addProductionOrder(productId, targetNumber, priority);
                    setDialogOpen(false);
                    toast("Perintah produksi dibuat", `${productName(productId)} sebanyak ${targetNumber} pcs`);
                  } catch (error) {
                    toast("Perintah produksi tidak dapat dibuat", error instanceof Error ? error.message : "Periksa kembali target produksi.", "error");
                  }
                }}
              >
                Simpan perintah
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
