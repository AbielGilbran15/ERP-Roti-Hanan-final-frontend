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
  Tab,
  TabList,
} from "@fluentui/react-components";
import {
  ArrowRight20Regular,
  Box24Regular,
  Clock24Regular,
  ScanObject24Regular,
  VehicleTruck24Regular,
  Warning24Regular,
} from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/components/ui/app-toast";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { canPerformAction } from "@/lib/access";
import { formatDate, formatNumber } from "@/lib/format";
import type { Sale, StockItem } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

const maxAttachmentSize = 10 * 1024 * 1024;
const acceptedAttachmentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const acceptedAttachmentExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx"];

const isAcceptedAttachment = (file: File) =>
  acceptedAttachmentTypes.includes(file.type) ||
  acceptedAttachmentExtensions.some((extension) => file.name.toLowerCase().endsWith(extension));

const formatFileSize = (size: number) => size < 1024 * 1024
  ? `${Math.ceil(size / 1024)} KB`
  : `${(size / (1024 * 1024)).toFixed(1)} MB`;

export default function InventoryPage() {
  const [tab, setTab] = useState("stock");
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [deliveryProof, setDeliveryProof] = useState("");
  const [deliveryIssue, setDeliveryIssue] = useState("");
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const toast = useAppToast();
  const { role } = useCurrentAccess();
  const canManageFulfillment = canPerformAction(role, "inventory.fulfillment");
  const stocks = useERPStore((state) => state.stocks);
  const sales = useERPStore((state) => state.sales);
  const customers = useERPStore((state) => state.customers);
  const products = useERPStore((state) => state.products);
  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? id;
  const advanceFulfillment = useERPStore((state) => state.advanceFulfillment);
  const confirmDelivery = useERPStore((state) => state.confirmDelivery);

  const totalAvailable = stocks
    .filter((stock) => stock.status === "Tersedia")
    .reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0);
  const lowStock = products.filter((product) => product.isActive).filter((product) => {
    const available = stocks
      .filter((stock) => stock.productId === product.id && stock.status === "Tersedia")
      .reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0);
    return available < product.minStock;
  });
  const quarantine = stocks.filter((stock) => stock.status === "Karantina" || stock.status === "Ditahan" || stock.status === "Ditolak");
  const fulfillmentOrders = sales.filter((sale) => !["Selesai", "Diretur"].includes(sale.status));
  const inDelivery = sales.filter((sale) => sale.status === "Dalam Pengiriman");

  const stockColumns = useMemo<ColumnDef<StockItem>[]>(
    () => [
      {
        header: "Barang",
        accessorFn: (row) => productName(row.productId),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{productName(row.original.productId)}</p>
            <p className="mt-0.5 font-mono text-[11px] text-[var(--app-text-muted)]">{products.find((item) => item.id === row.original.productId)?.code}</p>
          </div>
        ),
      },
      { header: "Area gudang", accessorKey: "warehouse" },
      { header: "Lot", accessorKey: "lot", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
      { header: "Kedaluwarsa", accessorKey: "expiryDate", cell: ({ getValue }) => getValue() ? formatDate(String(getValue())) : "—" },
      {
        header: "Tersedia",
        accessorFn: (row) => row.onHand - row.reserved,
        cell: ({ row }) => (
          <div className="text-right">
            <span className="tabular font-semibold">{formatNumber(row.original.onHand - row.original.reserved)}</span>
            <span className="ml-1 text-xs text-[var(--app-text-muted)]">{products.find((item) => item.id === row.original.productId)?.stockUnit}</span>
          </div>
        ),
      },
      { header: "Kondisi", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    ],
    [products],
  );

  const fulfillmentColumns = useMemo<ColumnDef<Sale>[]>(
    () => [
      { header: "Pesanan", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Agen", accessorFn: (row) => customers.find((item) => item.id === row.customerId)?.name ?? row.customerId },
      { header: "Kategori", accessorKey: "customerCategory", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      { header: "Metode", accessorKey: "fulfillmentMethod" },
      { header: "Dibutuhkan", accessorKey: "neededAt", cell: ({ getValue }) => getValue() ? formatDate(String(getValue()), "dd MMM, HH:mm") : "—" },
      { header: "Isi", accessorFn: (row) => row.items.map((item) => `${productName(item.productId)} ${item.quantity}`).join(", ") },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      {
        id: "action",
        header: "Tindakan",
        cell: ({ row }) => {
          const sale = row.original;
          if (!canManageFulfillment) return <span className="text-xs text-[var(--app-text-muted)]">Hanya lihat</span>;
          if (sale.status === "Bermasalah") return <span className="text-xs text-red-700">Perlu tindak lanjut</span>;
          if (sale.status === "Dalam Pengiriman") {
            return <Button size="small" appearance="primary" onClick={() => { setDeliveryId(sale.id); setDeliveryProof(""); setDeliveryIssue(""); setDeliveryFiles([]); }}>Konfirmasi diterima</Button>;
          }
          const label = sale.status === "Menunggu Produksi"
            ? "Tandai siap"
            : sale.fulfillmentMethod === "Dikirim"
              ? "Kirim"
              : "Serah terima";
          return (
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowRight20Regular />}
              onClick={() => {
                advanceFulfillment(sale.id);
                toast("Pemenuhan diperbarui", `${sale.number} · ${label}`);
              }}
            >
              {label}
            </Button>
          );
        },
      },
    ],
    [advanceFulfillment, canManageFulfillment, customers, products, toast],
  );

  const selectedDelivery = sales.find((sale) => sale.id === deliveryId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventori & Gudang"
        description="Pantau stok per lot di seluruh area gudang internal pusat dan selesaikan pemenuhan pesanan agen."
      />

      <MetricStrip
        items={[
          { label: "Total siap digunakan", value: formatNumber(totalAvailable), detail: `${stocks.length} lot internal tercatat`, trend: "neutral", icon: <Box24Regular />, onClick: () => setTab("stock") },
          { label: "Di bawah minimum", value: String(lowStock.length), detail: "Perlu pembelian atau produksi", trend: "down", icon: <Warning24Regular />, onClick: () => setTab("stock") },
          { label: "Karantina / ditahan", value: String(quarantine.length), detail: `${formatNumber(quarantine.reduce((sum, item) => sum + item.onHand, 0))} unit terdampak`, trend: "down", icon: <ScanObject24Regular />, onClick: () => setTab("stock") },
          { label: "Dalam pengiriman", value: String(inDelivery.length), detail: "Menunggu konfirmasi agen", trend: "neutral", icon: <VehicleTruck24Regular />, onClick: () => setTab("fulfillment") },
        ]}
      />

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} className="overflow-x-auto">
        <Tab value="stock">Posisi stok pusat</Tab>
        <Tab value="fulfillment">Pemenuhan agen</Tab>
        <Tab value="count">Stok opname</Tab>
      </TabList>

      {tab === "stock" ? <SectionPanel noPadding><DataTable data={stocks} columns={stockColumns} searchPlaceholder="Cari barang, lot, atau area gudang..." /></SectionPanel> : null}
      {tab === "fulfillment" ? (
        <SectionPanel title="Pemenuhan pesanan agen" description="Stok dikurangi saat diserahkan. Pesanan kirim baru selesai setelah penerimaan dikonfirmasi." noPadding>
          <DataTable data={fulfillmentOrders} columns={fulfillmentColumns} searchPlaceholder="Cari pesanan, agen, atau kategori..." emptyTitle="Tidak ada pemenuhan aktif" emptyDescription="Semua pesanan sudah diterima agen." />
        </SectionPanel>
      ) : null}
      {tab === "count" ? (
        <SectionPanel title="Stok opname Agustus" description="Siklus hitung untuk area gudang internal di pusat Bandung.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              { name: "Gudang bahan baku", date: "23 Agu 2026", progress: "38 dari 42 item", status: "Berjalan" },
              { name: "Gudang produk jadi", date: "22 Agu 2026", progress: "24 dari 24 item", status: "Selesai" },
              { name: "Gudang kemasan", date: "23 Agu 2026", progress: "8 dari 10 item", status: "Menunggu" },
            ].map((count) => (
              <article key={count.name} className="rounded-xl border border-[var(--app-border)] p-4">
                <div className="flex items-start justify-between gap-3"><Clock24Regular className="text-[var(--app-accent)]" /><StatusBadge status={count.status} /></div>
                <h3 className="mt-4 text-sm font-semibold">{count.name}</h3>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">{count.date}</p>
                <p className="tabular mt-3 text-sm">{count.progress}</p>
              </article>
            ))}
          </div>
        </SectionPanel>
      ) : null}

      <Dialog open={canManageFulfillment && Boolean(deliveryId)} onOpenChange={(_, data) => !data.open && setDeliveryId(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Konfirmasi penerimaan agen</DialogTitle>
            <DialogContent className="space-y-4">
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm">
                <p className="font-mono font-semibold">{selectedDelivery?.number}</p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">Penjualan dan stok pengiriman dinyatakan selesai setelah agen menerima barang.</p>
              </div>
              <Field label="Keterangan bukti penerimaan" required><Input value={deliveryProof} onChange={(_, data) => setDeliveryProof(data.value)} placeholder="Contoh: surat jalan diterima Pak Dedi" /></Field>
              <Field label="Dokumen atau foto" hint="JPG, PNG, WebP, PDF, DOC, atau DOCX. Maksimal 10 MB per berkas.">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx"
                  className="block w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-text-muted)] file:mr-3 file:border-0 file:border-r file:border-[var(--app-border)] file:bg-[var(--app-surface-2)] file:px-3 file:py-2.5 file:text-sm file:font-semibold file:text-[var(--app-text)] hover:file:bg-[var(--app-canvas)]"
                  onChange={(event) => {
                    const selectedFiles = Array.from(event.target.files ?? []);
                    const validFiles = selectedFiles.filter(
                      (file) => isAcceptedAttachment(file) && file.size <= maxAttachmentSize,
                    );
                    if (validFiles.length !== selectedFiles.length) {
                      toast("Sebagian berkas tidak diterima", "Gunakan format yang didukung dengan ukuran maksimal 10 MB.");
                    }
                    setDeliveryFiles(validFiles);
                  }}
                />
              </Field>
              {deliveryFiles.length ? (
                <div className="space-y-2 rounded-lg border border-[var(--app-border)] p-3">
                  {deliveryFiles.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--app-text)]">{file.name}</p>
                        <p className="mt-0.5 text-[var(--app-text-muted)]">{formatFileSize(file.size)}</p>
                      </div>
                      <Button size="small" appearance="subtle" onClick={() => setDeliveryFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Hapus</Button>
                    </div>
                  ))}
                </div>
              ) : null}
              <Field label="Masalah pengiriman" hint="Kosongkan jika barang diterima dengan baik."><Input value={deliveryIssue} onChange={(_, data) => setDeliveryIssue(data.value)} placeholder="Contoh: 2 kemasan rusak" /></Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDeliveryId(null)}>Batal</Button>
              <Button
                appearance="primary"
                disabled={!deliveryProof.trim() || !deliveryId}
                onClick={() => {
                  if (!deliveryId) return;
                  const uploadedAt = new Date().toISOString();
                  confirmDelivery(
                    deliveryId,
                    deliveryProof,
                    deliveryIssue,
                    deliveryFiles.map((file, index) => ({
                      id: `delivery-file-${Date.now()}-${index}`,
                      name: file.name,
                      mimeType: file.type || "application/octet-stream",
                      size: file.size,
                      uploadedAt,
                    })),
                  );
                  setDeliveryId(null);
                  toast(deliveryIssue.trim() ? "Pengiriman ditandai bermasalah" : "Penerimaan dikonfirmasi", selectedDelivery?.number ?? "Pesanan agen");
                }}
              >
                Simpan konfirmasi
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
