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
  Textarea,
} from "@fluentui/react-components";
import {
  Add20Regular,
  ArrowRight20Regular,
  BuildingFactory24Regular,
  Delete20Regular,
  Food24Regular,
  Warning24Regular,
} from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { ProductionResultDialog } from "@/components/production/production-result-dialog";
import { useAppToast } from "@/components/ui/app-toast";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { canPerformAction } from "@/lib/access";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import type { MaterialType, ProductionOrder } from "@/lib/types";
import { saleStockShortages, useERPStore } from "@/store/use-erp-store";

type MaterialDraft = { key: string; productId: string; quantity: string };
type DemandRow = {
  productId: string;
  required: number;
  reserved: number;
  shortage: number;
  orders: number;
  earliestNeededAt?: string;
  oldestCreatedAt: string;
};

const materialTypes: MaterialType[] = ["Bahan Baku", "Bahan Baku Toping", "Kemasan"];
const createMaterialLine = (productId = ""): MaterialDraft => ({
  key: `${Date.now()}-${Math.random()}`,
  productId,
  quantity: "",
});

export default function ProductionPage() {
  const [tab, setTab] = useState("batches");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priority, setPriority] = useState<ProductionOrder["priority"]>("Normal");
  const [requestNote, setRequestNote] = useState("");
  const [materialDrafts, setMaterialDrafts] = useState<MaterialDraft[]>([]);
  const [traceBatch, setTraceBatch] = useState("");
  const [resultOrderId, setResultOrderId] = useState<string | null>(null);
  const toast = useAppToast();
  const { role } = useCurrentAccess();
  const productionOrders = useERPStore((state) => state.productionOrders);
  const products = useERPStore((state) => state.products);
  const sales = useERPStore((state) => state.sales);
  const customers = useERPStore((state) => state.customers);
  const addProductionOrder = useERPStore((state) => state.addProductionOrder);
  const confirmProductionMaterials = useERPStore((state) => state.confirmProductionMaterials);
  const advanceProduction = useERPStore((state) => state.advanceProduction);
  const canCreateProduction = canPerformAction(role, "production.create");
  const canConfirmMaterials = canPerformAction(role, "production.material.confirm");
  const canAdvanceProduction = canPerformAction(role, "production.advance");
  const canFinalizeProduction = canPerformAction(role, "production.finalize");
  const materialProducts = useMemo(
    () => products.filter((product) => product.type !== "Produk Jadi" && product.isActive),
    [products],
  );
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const customerById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const productName = (id: string) => productById.get(id)?.name ?? id;
  const productUnit = (id: string) => productById.get(id)?.stockUnit || "unit";

  const demandRows = useMemo(() => {
    const totals = new Map<string, DemandRow>();
    for (const sale of sales.filter((item) => item.status === "Menunggu Produksi")) {
      for (const shortage of saleStockShortages(sale, products).filter((item) => item.shortage > 0)) {
        const current = totals.get(shortage.productId);
        const earliestNeededAt = !current?.earliestNeededAt || (sale.neededAt && sale.neededAt < current.earliestNeededAt)
          ? sale.neededAt
          : current.earliestNeededAt;
        totals.set(shortage.productId, {
          productId: shortage.productId,
          required: (current?.required ?? 0) + shortage.required,
          reserved: (current?.reserved ?? 0) + shortage.available,
          shortage: (current?.shortage ?? 0) + shortage.shortage,
          orders: (current?.orders ?? 0) + 1,
          earliestNeededAt,
          oldestCreatedAt: current && current.oldestCreatedAt < sale.createdAt ? current.oldestCreatedAt : sale.createdAt,
        });
      }
    }
    return [...totals.values()].sort((a, b) =>
      (a.earliestNeededAt ?? "9999").localeCompare(b.earliestNeededAt ?? "9999")
      || a.oldestCreatedAt.localeCompare(b.oldestCreatedAt),
    );
  }, [products, sales]);

  const totalGood = productionOrders.flatMap((order) => order.outputs).reduce((sum, output) => sum + output.goodQty, 0);
  const totalFailed = productionOrders.flatMap((order) => order.outputs).reduce((sum, output) => sum + output.failedQty, 0);
  const activeBatches = productionOrders.filter((order) => order.status !== "Selesai").length;
  const materialShortages = productionOrders.filter((order) => ["Kekurangan Bahan", "Menunggu Pembelian"].includes(order.status)).length;
  const orderShortage = demandRows.reduce((sum, row) => sum + row.shortage, 0);

  const productionColumns = useMemo<ColumnDef<ProductionOrder>[]>(() => [
    {
      header: "Batch / permintaan",
      accessorKey: "batchNumber",
      cell: ({ row }) => <div><span className="font-mono text-xs font-semibold">{row.original.batchNumber}</span><p className="mt-0.5 font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.materialRequestNumber ?? "—"}</p></div>,
    },
    {
      header: "Bahan diminta manual",
      accessorFn: (row) => row.materials.map((item) => productName(item.materialProductId)).join(" "),
      cell: ({ row }) => <div className="min-w-[230px] space-y-1">{row.original.materials.map((item) => <p key={item.id} className="flex justify-between gap-3 text-xs"><span>{productName(item.materialProductId)}</span><strong className="tabular">{formatNumber(item.requestedQty)} {productUnit(item.materialProductId)}</strong></p>)}</div>,
    },
    {
      header: "Kategori",
      accessorFn: (row) => [...new Set(row.materials.map((item) => item.role))].join(", "),
      cell: ({ row }) => <div className="flex min-w-[170px] flex-wrap gap-1">{[...new Set(row.original.materials.map((item) => item.role))].map((item) => <StatusBadge key={item} status={item} />)}</div>,
    },
    {
      header: "Hasil",
      accessorFn: (row) => row.outputs.map((item) => productName(item.productId)).join(" "),
      cell: ({ row }) => row.original.outputs.length
        ? <div className="min-w-[210px] space-y-1">{row.original.outputs.map((output) => <p key={output.id} className="text-xs"><span className="font-medium">{productName(output.productId)}</span> · <span className="tabular text-emerald-700 dark:text-emerald-300">{formatNumber(output.goodQty)} berhasil</span>{output.failedQty ? <span className="tabular text-red-700 dark:text-red-300"> · {formatNumber(output.failedQty)} gagal</span> : null}</p>)}</div>
        : <span className="text-xs text-[var(--app-text-muted)]">Belum dicatat</span>,
    },
    { header: "Prioritas", accessorKey: "priority", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    {
      id: "action",
      header: "Tindakan Produksi",
      cell: ({ row }) => {
        const order = row.original;
        if (order.status === "Disetujui Gudang" && canConfirmMaterials) return (
          <Button size="small" appearance="primary" icon={<ArrowRight20Regular />} onClick={() => {
            try {
              confirmProductionMaterials(order.id);
              toast("Penerimaan bahan dikonfirmasi", `${order.batchNumber} · stok Gudang Bahan telah berkurang.`);
            } catch (error) {
              toast("Penerimaan tidak dapat dikonfirmasi", error instanceof Error ? error.message : "Minta Gudang memeriksa saldo bahan.", "error");
            }
          }}>Konfirmasi diterima</Button>
        );
        if (order.status === "Bahan Dikonfirmasi" && canAdvanceProduction) return (
          <Button size="small" appearance="primary" icon={<ArrowRight20Regular />} onClick={() => {
            try {
              advanceProduction(order.id);
              toast("Produksi dimulai", order.batchNumber);
            } catch (error) {
              toast("Produksi tidak dapat dimulai", error instanceof Error ? error.message : "Periksa status bahan.", "error");
            }
          }}>Mulai produksi</Button>
        );
        if (order.status === "Berjalan" && canFinalizeProduction) return <Button size="small" appearance="primary" onClick={() => setResultOrderId(order.id)}>Catat hasil</Button>;
        if (["Kekurangan Bahan", "Menunggu Pembelian"].includes(order.status)) return <span className="text-xs font-medium text-red-700 dark:text-red-300">Tunggu Gudang/Purchasing</span>;
        if (["Menunggu Gudang", "Ditunda Gudang"].includes(order.status)) return <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Tunggu Gudang</span>;
        return <span className="text-xs text-[var(--app-text-muted)]">—</span>;
      },
    },
  ], [advanceProduction, canAdvanceProduction, canConfirmMaterials, canFinalizeProduction, confirmProductionMaterials, productById, toast]);

  const demandColumns = useMemo<ColumnDef<DemandRow>[]>(() => [
    { header: "Barang Jadi", accessorFn: (row) => productName(row.productId), cell: ({ row }) => <div><p className="font-medium">{productName(row.original.productId)}</p><p className="font-mono text-[11px] text-[var(--app-text-muted)]">{productById.get(row.original.productId)?.code}</p></div> },
    { header: "Pesanan", accessorKey: "orders", cell: ({ getValue }) => <span className="tabular">{String(getValue())} pesanan</span> },
    { header: "Total dipesan", accessorKey: "required", cell: ({ row }) => <span className="tabular">{formatNumber(row.original.required)} {productUnit(row.original.productId)}</span> },
    { header: "Sudah direservasi", accessorKey: "reserved", cell: ({ row }) => <span className="tabular">{formatNumber(row.original.reserved)} {productUnit(row.original.productId)}</span> },
    { header: "Kekurangan", accessorKey: "shortage", cell: ({ row }) => <strong className="tabular text-red-700 dark:text-red-300">{formatNumber(row.original.shortage)} {productUnit(row.original.productId)}</strong> },
    { header: "Kebutuhan terdekat", accessorKey: "earliestNeededAt", cell: ({ getValue }) => getValue() ? formatDate(String(getValue())) : "Belum ditentukan" },
  ], [productById]);

  const selectedTrace = productionOrders.find((order) => order.id === traceBatch) ?? productionOrders[0];
  const selectedResultOrder = productionOrders.find((order) => order.id === resultOrderId);
  const traceAllocations = selectedTrace
    ? sales.flatMap((sale) => (sale.stockAllocations ?? []).filter((allocation) => allocation.productionOrderId === selectedTrace.id).map((allocation) => ({ sale, allocation })))
    : [];
  const draftsValid = materialDrafts.length > 0
    && materialDrafts.every((line) => line.productId && Number.isFinite(Number(line.quantity)) && Number(line.quantity) > 0)
    && new Set(materialDrafts.map((line) => line.productId)).size === materialDrafts.length;

  const openCreateDialog = () => {
    setMaterialDrafts([createMaterialLine(materialProducts[0]?.id)]);
    setPriority("Normal");
    setRequestNote("");
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Produksi"
        description="Staff Produksi membuat permintaan bahan secara manual per batch, mengolah bahan yang diterima, lalu mencatat satu atau beberapa Barang Jadi berhasil dan gagal."
        actions={canCreateProduction ? <Button appearance="primary" icon={<Add20Regular />} onClick={openCreateDialog}>Buat batch & permintaan bahan</Button> : null}
      />

      <MetricStrip items={[
        { label: "Batch aktif", value: formatNumber(activeBatches), detail: `${productionOrders.length} total batch`, trend: activeBatches ? "neutral" : "up", icon: <BuildingFactory24Regular />, onClick: () => setTab("batches"), targetId: "production-batches" },
        { label: "Produk berhasil", value: formatNumber(totalGood), detail: "Langsung masuk Gudang Produk Jadi", trend: "up", icon: <Food24Regular />, onClick: () => setTab("batches"), targetId: "production-batches" },
        { label: "Waste produksi", value: formatNumber(totalFailed), detail: "Tidak masuk stok mana pun", trend: totalFailed ? "down" : "neutral", icon: <Warning24Regular />, onClick: () => setTab("batches"), targetId: "production-batches" },
        { label: "Kekurangan pesanan / bahan", value: `${formatNumber(orderShortage)} / ${materialShortages}`, detail: "Informasi demand / batch menunggu bahan", trend: orderShortage || materialShortages ? "down" : "neutral", icon: <Warning24Regular />, onClick: () => setTab("demand"), targetId: "production-demand" },
      ]} />

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionPanel title="Prinsip pembuatan batch" description="Kebutuhan bahan ditentukan manual oleh Produksi, bukan dihitung dari kekurangan pesanan.">
          <ol className="space-y-3 text-sm leading-6 text-[var(--app-text-muted)]">
            <li><strong className="text-[var(--app-text)]">1. Produksi memilih bahan manual.</strong> Bahan Baku, Bahan Baku Toping, dan Kemasan dimasukkan beserta jumlahnya dalam satuan stok.</li>
            <li><strong className="text-[var(--app-text)]">2. Gudang Bahan menyerahkan stok.</strong> Stok berkurang setelah Produksi mengonfirmasi penerimaan.</li>
            <li><strong className="text-[var(--app-text)]">3. Produksi mencatat hasil.</strong> Hasil berhasil masuk Gudang Produk Jadi; hasil gagal menjadi waste dengan alasan.</li>
          </ol>
        </SectionPanel>
        <SectionPanel title="Pemenuhan pesanan otomatis" description="Demand pesanan membantu menentukan kebutuhan SKU, bukan formula bahan.">
          <p className="text-sm leading-6 text-[var(--app-text-muted)]">Saat batch selesai, stok Barang Jadi dialokasikan ke pesanan SKU yang sama berdasarkan <strong className="text-[var(--app-text)]">tanggal kebutuhan paling dekat</strong>, kemudian <strong className="text-[var(--app-text)]">pesanan yang dibuat lebih dahulu</strong>. Kelebihan hasil tetap menjadi stok bebas.</p>
          <div className="mt-4 flex flex-wrap gap-2">{demandRows.slice(0, 4).map((row) => <StatusBadge key={row.productId} status={`${productName(row.productId)} kurang ${formatNumber(row.shortage)}`} />)}{!demandRows.length ? <StatusBadge status="Semua pesanan teralokasi" /> : null}</div>
        </SectionPanel>
      </div>

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} className="overflow-x-auto">
        <Tab value="batches">Batch produksi</Tab>
        <Tab value="demand">Kekurangan pesanan</Tab>
        <Tab value="trace">Pelacakan batch</Tab>
      </TabList>

      {tab === "batches" ? <SectionPanel id="production-batches" title="Batch produksi" description="Permintaan bahan manual, status serah-terima, dan hasil setiap batch." noPadding><DataTable data={productionOrders} columns={productionColumns} searchPlaceholder="Cari batch, bahan, hasil, atau status..." /></SectionPanel> : null}
      {tab === "demand" ? <SectionPanel id="production-demand" title="Kekurangan stok untuk pesanan agen" description="Informasi per SKU ini tidak otomatis menjadi target batch atau menghitung kebutuhan bahan." noPadding><DataTable data={demandRows} columns={demandColumns} searchPlaceholder="Cari SKU Barang Jadi..." emptyTitle="Tidak ada kekurangan pesanan" emptyDescription="Seluruh pesanan aktif sudah memiliki reservasi stok Barang Jadi." /></SectionPanel> : null}

      {tab === "trace" && selectedTrace ? (
        <div id="production-trace" className="space-y-5">
          <SectionPanel title="Jejak batch" description="Hubungan permintaan bahan, hasil produksi, stok jadi, dan pesanan yang dipenuhi.">
            <Field label="Pilih batch" className="max-w-xl"><Select value={selectedTrace.id} onChange={(event) => setTraceBatch(event.target.value)}>{productionOrders.map((order) => <option key={order.id} value={order.id}>{order.batchNumber} · {order.status}</option>)}</Select></Field>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-[var(--app-border)] p-4"><p className="text-xs text-[var(--app-text-muted)]">Permintaan bahan</p><p className="mt-1 font-semibold">{selectedTrace.materials.length} jenis barang</p><p className="mt-2 font-mono text-[11px] text-[var(--app-text-muted)]">{selectedTrace.materialRequestNumber ?? "—"}</p></article>
              <article className="rounded-xl border border-[var(--app-border)] p-4"><p className="text-xs text-[var(--app-text-muted)]">Status batch</p><div className="mt-2"><StatusBadge status={selectedTrace.status} /></div><p className="mt-2 text-[11px] text-[var(--app-text-muted)]">{formatDateTime(selectedTrace.startedAt ?? selectedTrace.scheduledAt)}</p></article>
              <article className="rounded-xl border border-[var(--app-border)] p-4"><p className="text-xs text-[var(--app-text-muted)]">Hasil</p><p className="mt-1 font-semibold">{formatNumber(selectedTrace.outputs.reduce((sum, output) => sum + output.goodQty, 0))} berhasil · {formatNumber(selectedTrace.outputs.reduce((sum, output) => sum + output.failedQty, 0))} gagal</p><p className="mt-2 text-[11px] text-[var(--app-text-muted)]">{selectedTrace.outputs.length} SKU Barang Jadi</p></article>
              <article className="rounded-xl border border-[var(--app-border)] p-4"><p className="text-xs text-[var(--app-text-muted)]">Pesanan dipenuhi</p><p className="mt-1 font-semibold">{traceAllocations.length} alokasi</p><p className="mt-2 text-[11px] text-[var(--app-text-muted)]">Hubungan pesanan–batch tersimpan per lot</p></article>
            </div>
          </SectionPanel>
          <SectionPanel title="Rincian bahan" description="Jumlah diminta ditentukan manual oleh Staff Produksi." noPadding>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-[var(--app-surface-2)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--app-text-muted)]"><tr><th className="px-4 py-2.5">Kategori</th><th className="px-4 py-2.5">Bahan</th><th className="px-4 py-2.5 text-right">Diminta</th><th className="px-4 py-2.5 text-right">Disetujui</th><th className="px-4 py-2.5 text-right">Diterima / terpakai</th><th className="px-4 py-2.5 text-right">Kurang</th></tr></thead><tbody>{selectedTrace.materials.map((requirement) => { const approved = requirement.allocations.reduce((sum, allocation) => sum + allocation.approvedQty, 0); const used = requirement.allocations.reduce((sum, allocation) => sum + allocation.usedQty, 0); const unit = productUnit(requirement.materialProductId); return <tr key={requirement.id} className="border-b border-[var(--app-border)] last:border-0"><td className="px-4 py-3"><StatusBadge status={requirement.role} /></td><td className="px-4 py-3 font-medium">{productName(requirement.materialProductId)}</td><td className="tabular px-4 py-3 text-right">{formatNumber(requirement.requestedQty)} {unit}</td><td className="tabular px-4 py-3 text-right">{formatNumber(approved)} {unit}</td><td className="tabular px-4 py-3 text-right">{formatNumber(used)} {unit}</td><td className="tabular px-4 py-3 text-right">{formatNumber(requirement.shortageQty)} {unit}</td></tr>; })}</tbody></table></div>
          </SectionPanel>
          <SectionPanel title="Hasil dan alokasi pesanan" description="Hasil berhasil langsung menjadi stok tersedia; alokasi menjaga hubungan pesanan–batch.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">{selectedTrace.outputs.map((output) => <article key={output.id} className="rounded-lg border border-[var(--app-border)] p-3"><p className="font-medium">{productName(output.productId)}</p><p className="mt-1 text-xs text-[var(--app-text-muted)]"><span className="text-emerald-700 dark:text-emerald-300">{formatNumber(output.goodQty)} berhasil</span> · <span className="text-red-700 dark:text-red-300">{formatNumber(output.failedQty)} gagal</span></p>{output.failureReason ? <p className="mt-2 text-xs">Alasan waste: {output.failureReason}</p> : null}</article>)}{!selectedTrace.outputs.length ? <p className="text-sm text-[var(--app-text-muted)]">Hasil belum dicatat.</p> : null}</div>
              <div className="space-y-2">{traceAllocations.map(({ sale, allocation }) => <article key={allocation.id} className="rounded-lg border border-[var(--app-border)] p-3"><div className="flex justify-between gap-3"><div><p className="font-medium">{sale.number} · {customerById.get(sale.customerId)?.name ?? sale.customerId}</p><p className="mt-1 text-xs text-[var(--app-text-muted)]">{productName(allocation.productId)}</p></div><strong className="tabular text-sm">{formatNumber(allocation.quantity)} {productUnit(allocation.productId)}</strong></div></article>)}{!traceAllocations.length ? <p className="text-sm text-[var(--app-text-muted)]">Belum ada hasil batch ini yang dialokasikan ke pesanan.</p> : null}</div>
            </div>
          </SectionPanel>
        </div>
      ) : null}

      <Dialog open={canCreateProduction && dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface className="erp-dialog--wide"><DialogBody><DialogTitle>Buat batch dan permintaan bahan</DialogTitle><DialogContent className="space-y-5">
          <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-xs leading-5 text-[var(--app-text-muted)]">Pilih kebutuhan batch secara manual. Form ini tidak meminta target hasil dan tidak menghitung bahan dari kekurangan pesanan agen.</div>
          <div className="space-y-3">
            {materialDrafts.map((line, index) => {
              const product = productById.get(line.productId);
              return <div key={line.key} className="grid gap-3 rounded-xl border border-[var(--app-border)] p-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
                <Field label={`Bahan / kemasan ${index + 1}`} required><Select value={line.productId} onChange={(event) => setMaterialDrafts((current) => current.map((item) => item.key === line.key ? { ...item, productId: event.target.value } : item))}><option value="">Pilih barang</option>{materialTypes.map((type) => <optgroup key={type} label={type}>{materialProducts.filter((item) => item.type === type).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</optgroup>)}</Select></Field>
                <Field label="Jumlah diminta" required><Input type="number" min="0" step="any" value={line.quantity} onChange={(_, data) => setMaterialDrafts((current) => current.map((item) => item.key === line.key ? { ...item, quantity: data.value } : item))} contentAfter={product?.stockUnit || "unit"} /></Field>
                <Button appearance="subtle" icon={<Delete20Regular />} disabled={materialDrafts.length === 1} onClick={() => setMaterialDrafts((current) => current.filter((item) => item.key !== line.key))}>Hapus</Button>
              </div>;
            })}
            <Button appearance="secondary" icon={<Add20Regular />} disabled={materialDrafts.length >= materialProducts.length} onClick={() => setMaterialDrafts((current) => [...current, createMaterialLine(materialProducts.find((product) => !current.some((line) => line.productId === product.id))?.id)])}>Tambah bahan / kemasan</Button>
          </div>
          {!draftsValid && materialDrafts.length ? <p className="text-xs text-red-700 dark:text-red-300">Setiap barang harus unik dan memiliki jumlah lebih dari nol.</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prioritas"><Select value={priority} onChange={(event) => setPriority(event.target.value as ProductionOrder["priority"])}><option>Normal</option><option>Tinggi</option><option>Mendesak</option></Select></Field>
            <Field label="Catatan batch"><Textarea resize="vertical" value={requestNote} onChange={(_, data) => setRequestNote(data.value)} placeholder="Kebutuhan atau instruksi produksi" /></Field>
          </div>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setDialogOpen(false)}>Batal</Button><Button appearance="primary" disabled={!draftsValid} onClick={() => {
          try {
            const order = addProductionOrder(materialDrafts.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })), priority, requestNote);
            setDialogOpen(false);
            setTraceBatch(order.id);
            toast("Batch dan permintaan bahan dibuat", `${order.materialRequestNumber} · ${order.batchNumber} menunggu Gudang Bahan.`, "success");
          } catch (error) {
            toast("Batch tidak dapat dibuat", error instanceof Error ? error.message : "Periksa kembali kebutuhan bahan.", "error");
          }
        }}>Kirim ke Gudang Bahan</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>

      <ProductionResultDialog order={selectedResultOrder} onClose={() => setResultOrderId(null)} />
    </div>
  );
}
