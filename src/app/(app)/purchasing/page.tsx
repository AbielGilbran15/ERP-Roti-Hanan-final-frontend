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
  ArrowDownload24Regular,
  Cart24Regular,
  Clock24Regular,
  Delete20Regular,
  Money24Regular,
  Receipt24Regular,
  Search20Regular,
  Subtract20Regular,
  Warning24Regular,
} from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/components/ui/app-toast";
import { SupplierComparison } from "@/components/purchasing/supplier-comparison";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { useMetricSection } from "@/hooks/use-metric-section";
import { canPerformAction } from "@/lib/access";
import { startOfLocalDay } from "@/lib/date";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { MaterialPurchaseRequest, PurchaseOrder } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

const purchasingMetricSections = {
  "purchasing-requests": "requests",
  "purchasing-orders": "orders",
  "purchasing-needs": "needs",
  "purchasing-offers": "offers",
} as const;

export default function PurchasingPage() {
  const [tab, setTab] = useState("orders");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourcePurchaseRequestId, setSourcePurchaseRequestId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("sup-sumber");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseCart, setPurchaseCart] = useState<Record<string, { quantity: string; unitPrice: string }>>({});
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<number, string>>({});
  const toast = useAppToast();
  const { role } = useCurrentAccess();
  const canCreatePurchaseOrder = canPerformAction(role, "purchasing.create");
  const canReceivePurchaseOrder = canPerformAction(role, "purchasing.receive");
  const purchaseOrders = useERPStore((state) => state.purchaseOrders);
  const materialPurchaseRequests = useERPStore((state) => state.materialPurchaseRequests);
  const stocks = useERPStore((state) => state.stocks);
  const products = useERPStore((state) => state.products);
  const suppliers = useERPStore((state) => state.suppliers);
  const addPurchaseOrder = useERPStore((state) => state.addPurchaseOrder);
  const sendPurchaseOrder = useERPStore((state) => state.sendPurchaseOrder);
  const receivePurchaseOrder = useERPStore((state) => state.receivePurchaseOrder);
  useMetricSection(purchasingMetricSections, setTab);
  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? id;
  const purchaseProducts = products.filter(
    (product) => product.type !== "Produk Jadi" && product.isActive && `${product.code} ${product.name}`.toLowerCase().includes(purchaseSearch.toLowerCase()),
  );
  const purchaseCartLines = Object.entries(purchaseCart)
    .map(([cartProductId, values]) => ({ product: products.find((product) => product.id === cartProductId)!, ...values }))
    .filter((line) => line.product);
  const purchaseTotal = purchaseCartLines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
    0,
  );
  const purchaseCartInvalid = purchaseCartLines.some((line) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    return !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0;
  });
  const receiptOrder = purchaseOrders.find((order) => order.id === receiptOrderId);
  const receiptInvalid = receiptOrder
    ? receiptOrder.items.some((item, index) => {
        const quantity = Number(receiptQuantities[index] ?? "0");
        const outstanding = item.quantity - item.receivedQty;
        return !Number.isFinite(quantity) || quantity < 0 || quantity > outstanding;
      }) || !receiptOrder.items.some((_, index) => Number(receiptQuantities[index] ?? "0") > 0)
    : true;

  const addToPurchaseCart = (cartProductId: string) => {
    const product = products.find((item) => item.id === cartProductId);
    if (!product) return;
    setPurchaseCart((current) => {
      const existing = current[cartProductId];
      return {
        ...current,
        [cartProductId]: existing
          ? { ...existing, quantity: String((Number(existing.quantity) || 0) + 1) }
          : { quantity: "1", unitPrice: String(product.purchasePrice) },
      };
    });
  };

  const removeFromPurchaseCart = (cartProductId: string) => {
    setPurchaseCart((current) => {
      const next = { ...current };
      delete next[cartProductId];
      return next;
    });
  };

  const openOrders = purchaseOrders.filter((item) => !["Diterima", "Ditutup"].includes(item.status));
  const pendingValue = openOrders.reduce((sum, item) => sum + item.total, 0);
  const overdue = openOrders.filter((item) => new Date(`${item.expectedAt}T00:00:00`) < startOfLocalDay());
  const needSuggestions = products
    .filter((product) => product.type !== "Produk Jadi" && product.isActive)
    .map((product) => {
      const available = stocks
        .filter((stock) => stock.productId === product.id && stock.status === "Tersedia")
        .reduce((sum, stock) => sum + stock.onHand - stock.reserved, 0);
      const suggestedStock = Math.max(product.minStock * 2 - available, 0);
      return { product, available, suggestedStock, suggestedPurchase: Math.ceil(suggestedStock / product.conversionValue) };
    })
    .filter((item) => item.available < item.product.minStock);

  const requestColumns = useMemo<ColumnDef<MaterialPurchaseRequest>[]>(() => [
    { header: "Permintaan", accessorKey: "number", cell: ({ row }) => <div><p className="font-mono text-xs font-semibold">{row.original.number}</p><p className="mt-0.5 font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.productionBatchNumber}</p></div> },
    { header: "Dibutuhkan", accessorKey: "neededAt", cell: ({ getValue }) => formatDate(String(getValue()), "dd MMM, HH:mm") },
    { header: "Kekurangan bahan", accessorFn: (row) => row.items.map((item) => productName(item.productId)).join(" "), cell: ({ row }) => <div className="space-y-1">{row.original.items.map((item) => <p key={item.productId} className="flex min-w-[250px] items-center justify-between gap-3 text-xs"><span>{productName(item.productId)}</span><strong className="tabular">{formatNumber(item.quantity)} {item.unit}</strong></p>)}</div> },
    { header: "Prioritas", accessorKey: "priority", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    {
      id: "action", header: "Tindakan Purchasing", cell: ({ row }) => {
        if (!canCreatePurchaseOrder || row.original.status === "PO Dibuat" || row.original.status === "Selesai") return row.original.purchaseOrderId ? <span className="font-mono text-xs text-[var(--app-text-muted)]">PO sudah dibuat</span> : null;
        return <Button size="small" appearance="primary" onClick={() => {
          const cart = Object.fromEntries(row.original.items.map((item) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            const quantityInPurchaseUnit = product?.conversionValue ? Math.ceil(item.quantity / product.conversionValue) : 0;
            return [item.productId, { quantity: String(quantityInPurchaseUnit), unitPrice: String(product?.purchasePrice ?? 0) }];
          }));
          setPurchaseCart(cart);
          setSourcePurchaseRequestId(row.original.id);
          setDialogOpen(true);
        }}>Buat PO</Button>;
      },
    },
  ], [canCreatePurchaseOrder, products]);

  const columns = useMemo<ColumnDef<PurchaseOrder>[]>(
    () => [
      { header: "Nomor PO", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Supplier", accessorKey: "supplierNameSnapshot" },
      {
        header: "Isi PO",
        accessorFn: (row) => row.items.map((item) => productName(item.productId)).join(", "),
        cell: ({ row }) => (
          <div className="min-w-40">
            <p className="text-sm font-medium">{row.original.items.length} barang</p>
            <p className="mt-0.5 max-w-64 truncate text-xs text-[var(--app-text-muted)]">
              {row.original.items.map((item) => `${productName(item.productId)} × ${formatNumber(item.quantity, 6)} ${item.purchaseUnit}`).join(" · ")}
            </p>
          </div>
        ),
      },
      { header: "Estimasi", accessorKey: "expectedAt", cell: ({ getValue }) => formatDate(String(getValue())) },
      { header: "Total", accessorKey: "total", cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      {
        id: "action",
        header: "Tindakan",
        cell: ({ row }) => {
          if (canCreatePurchaseOrder && row.original.status === "Draft") {
            return (
              <Button
                appearance="primary"
                size="small"
                icon={<Cart24Regular />}
                onClick={() => {
                  try {
                    sendPurchaseOrder(row.original.id);
                    toast("PO berhasil dikirim", `${row.original.number} sekarang berstatus Dipesan dan siap diterima.`);
                  } catch (error) {
                    toast("PO tidak dapat dikirim", error instanceof Error ? error.message : "Coba lagi.", "error");
                  }
                }}
              >
                Kirim PO
              </Button>
            );
          }
          return canReceivePurchaseOrder && (row.original.status === "Dipesan" || row.original.status === "Diterima Sebagian") ? (
            <Button
              appearance="primary"
              size="small"
              icon={<ArrowDownload24Regular />}
              onClick={() => {
                setReceiptOrderId(row.original.id);
                setReceiptQuantities(Object.fromEntries(row.original.items.map((item, index) => [index, String(item.quantity - item.receivedQty)])));
              }}
            >
              Terima
            </Button>
          ) : null;
        },
      },
    ],
    [canCreatePurchaseOrder, canReceivePurchaseOrder, products, sendPurchaseOrder, toast],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchasing"
        description="Terima perintah pembelian dari Gudang, buat PO ke supplier, dan pantau penerimaan bahan."
        actions={canCreatePurchaseOrder ? <Button appearance="primary" icon={<Add20Regular />} onClick={() => { setSourcePurchaseRequestId(null); setPurchaseCart({}); setDialogOpen(true); }}>Buat purchase order</Button> : null}
      />

      <MetricStrip
        items={[
          { label: "Permintaan Gudang", value: String(materialPurchaseRequests.filter((item) => item.status === "Baru" || item.status === "Diproses").length), detail: "Kekurangan bahan produksi", trend: materialPurchaseRequests.some((item) => item.status === "Baru") ? "down" : "neutral", icon: <Warning24Regular />, onClick: () => setTab("requests"), targetId: "purchasing-requests" },
          { label: "PO aktif", value: String(openOrders.length), detail: `${purchaseOrders.length} PO bulan ini`, trend: "neutral", icon: <Receipt24Regular />, onClick: () => setTab("orders"), targetId: "purchasing-orders" },
          { label: "Nilai belum diterima", value: formatCurrency(pendingValue), detail: "PO aktif dan langsung diproses", trend: "neutral", icon: <Money24Regular />, onClick: () => setTab("orders"), targetId: "purchasing-orders" },
          { label: "Bahan kritis", value: String(needSuggestions.length), detail: "Di bawah stok minimum", trend: "down", icon: <Warning24Regular />, onClick: () => setTab("needs"), targetId: "purchasing-needs" },
          { label: "Pengiriman terlambat", value: String(overdue.length), detail: "Perlu follow-up supplier", trend: overdue.length ? "down" : "neutral", icon: <Clock24Regular />, onClick: () => setTab("orders"), targetId: "purchasing-orders" },
        ]}
      />

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} className="overflow-x-auto">
        <Tab value="requests">Permintaan Gudang</Tab>
        <Tab value="orders">Purchase order</Tab>
        <Tab value="needs">Saran kebutuhan</Tab>
        <Tab value="offers">Perbandingan supplier</Tab>
      </TabList>

      {tab === "requests" ? <SectionPanel id="purchasing-requests" title="Perintah pembelian dari Gudang" description="Daftar ini berasal dari permintaan Produksi yang tidak dapat dipenuhi stok Gudang." noPadding><DataTable data={materialPurchaseRequests} columns={requestColumns} searchPlaceholder="Cari permintaan, batch, atau bahan..." emptyTitle="Belum ada permintaan Gudang" emptyDescription="Kekurangan bahan Produksi yang diteruskan Gudang akan tampil di sini." /></SectionPanel> : null}

      {tab === "orders" ? (
        <SectionPanel id="purchasing-orders" title="Purchase order" description="Daftar PO, status pemesanan, penerimaan, nilai, dan tindak lanjut supplier." noPadding>
          <DataTable data={purchaseOrders} columns={columns} searchPlaceholder="Cari PO, supplier, barang..." />
        </SectionPanel>
      ) : null}

      {tab === "needs" ? (
        <SectionPanel id="purchasing-needs" title="Saran pembelian" description="Dihitung dari stok tersedia, minimum, reservasi, dan pesanan aktif." noPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[var(--app-surface-2)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                <tr><th className="px-4 py-2.5">Bahan</th><th className="px-4 py-2.5">Tersedia</th><th className="px-4 py-2.5">Minimum</th><th className="px-4 py-2.5">Saran beli</th><th className="px-4 py-2.5">Kondisi</th></tr>
              </thead>
              <tbody>
                {needSuggestions.map(({ product, available, suggestedStock, suggestedPurchase }) => (
                  <tr key={product.id} className="interactive-row border-b border-[var(--app-border)] last:border-0">
                    <td className="px-4 py-3"><p className="font-medium">{product.name}</p><p className="font-mono text-[11px] text-[var(--app-text-muted)]">{product.code}</p></td>
                    <td className="tabular px-4 py-3">{formatNumber(available)} {product.stockUnit}</td>
                    <td className="tabular px-4 py-3">{formatNumber(product.minStock)} {product.stockUnit}</td>
                    <td className="px-4 py-3"><p className="tabular font-semibold">{formatNumber(suggestedPurchase)} {product.purchaseUnit}</p><p className="tabular text-xs text-[var(--app-text-muted)]">= {formatNumber(suggestedStock)} {product.stockUnit}</p></td>
                    <td className="px-4 py-3"><StatusBadge status="Kritis" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      ) : null}

      {tab === "offers" ? (
        <div id="purchasing-offers" className="scroll-mt-24"><SupplierComparison
          canCreatePurchaseOrder={canCreatePurchaseOrder}
          onUseQuotation={(quotation, quantity) => {
            setSourcePurchaseRequestId(null);
            setSupplierId(quotation.supplierId);
            setPurchaseCart({ [quotation.productId]: { quantity: String(quantity), unitPrice: String(quotation.unitPrice) } });
            setDialogOpen(true);
          }}
        /></div>
      ) : null}

      <Dialog open={canCreatePurchaseOrder && dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface className="erp-dialog--xwide">
          <DialogBody>
            <DialogTitle>Buat purchase order</DialogTitle>
            <DialogContent className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
              {sourcePurchaseRequestId ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">PO ini menindaklanjuti <strong className="font-mono">{materialPurchaseRequests.find((item) => item.id === sourcePurchaseRequestId)?.number}</strong> dari Gudang. Jumlah telah dikonversi dari kekurangan satuan stok ke satuan beli.</div> : null}
              <Field label="Supplier"><Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>{suppliers.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></Field>

              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
                <section className="min-w-0 rounded-xl border border-[var(--app-border)] p-3">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold">Pilih Barang/Bahan</h3>
                    <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">Klik beberapa barang untuk memasukkannya ke satu PO.</p>
                  </div>
                  <Input
                    value={purchaseSearch}
                    onChange={(_, data) => setPurchaseSearch(data.value)}
                    contentBefore={<Search20Regular />}
                    placeholder="Cari kode atau nama barang..."
                    className="mb-3 w-full"
                  />
                  <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {purchaseProducts.map((product) => {
                      const isConversionValid = Boolean(product.purchaseUnit && product.purchaseContentUnit && (product.purchaseContentValue ?? 0) > 0 && product.conversionValue > 0);
                      const quantityInCart = Number(purchaseCart[product.id]?.quantity) || 0;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-left transition-colors hover:border-[var(--app-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!isConversionValid}
                          onClick={() => addToPurchaseCart(product.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-[11px] text-[var(--app-text-muted)]">{product.code}</span>
                            <StatusBadge status={product.type} />
                          </div>
                          <p className="mt-2 text-sm font-semibold">{product.name}</p>
                          <p className="mt-1 text-xs text-[var(--app-text-muted)]">1 {product.purchaseUnit} = {formatNumber(product.conversionValue, 6)} {product.stockUnit}</p>
                          <div className="mt-2 flex items-end justify-between gap-2">
                            <span className="tabular text-sm font-semibold text-[var(--app-accent)]">{formatCurrency(product.purchasePrice)} / {product.purchaseUnit}</span>
                            {quantityInCart > 0 ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{formatNumber(quantityInCart, 6)} dipilih</span> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--app-border)]">
                  <div className="border-b border-[var(--app-border)] px-3 py-2.5">
                    <h3 className="text-sm font-semibold">Isi purchase order</h3>
                    <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">{purchaseCartLines.length} jenis barang · satu nomor PO</p>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto">
                    {purchaseCartLines.length ? purchaseCartLines.map((line) => {
                      const quantity = Number(line.quantity) || 0;
                      const unitPrice = Number(line.unitPrice) || 0;
                      const stockQuantity = quantity * line.product.conversionValue;
                      return (
                        <div key={line.product.id} className="border-b border-[var(--app-border)] px-3 py-3 last:border-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{line.product.name}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-[var(--app-text-muted)]">{line.product.code} · {line.product.type}</p>
                            </div>
                            <p className="tabular shrink-0 text-sm font-semibold">{formatCurrency(quantity * unitPrice)}</p>
                          </div>
                          <div className="mt-2 rounded-md bg-[var(--app-surface-2)] px-2.5 py-2 text-xs">
                            <p>1 {line.product.purchaseUnit} berisi {formatNumber(line.product.purchaseContentValue ?? 0, 6)} {line.product.purchaseContentUnit}</p>
                            <p className="tabular mt-0.5 font-medium">Stok masuk: {formatNumber(stockQuantity, 6)} {line.product.stockUnit}</p>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto]">
                            <Field label="Jumlah beli">
                              <Input
                                type="number"
                                min="0.0001"
                                step="any"
                                value={line.quantity}
                                contentAfter={line.product.purchaseUnit}
                                onFocus={(event) => event.currentTarget.select()}
                                onChange={(_, data) => setPurchaseCart((current) => ({ ...current, [line.product.id]: { ...current[line.product.id], quantity: data.value } }))}
                              />
                            </Field>
                            <Field label={`Harga / ${line.product.purchaseUnit}`}>
                              <Input
                                type="number"
                                min="1"
                                value={line.unitPrice}
                                contentBefore="Rp"
                                onFocus={(event) => event.currentTarget.select()}
                                onChange={(_, data) => setPurchaseCart((current) => ({ ...current, [line.product.id]: { ...current[line.product.id], unitPrice: data.value } }))}
                              />
                            </Field>
                            <div className="flex items-end gap-1">
                              <Button
                                size="small"
                                appearance="subtle"
                                icon={<Subtract20Regular />}
                                aria-label={`Kurangi ${line.product.name}`}
                                onClick={() => quantity <= 1 ? removeFromPurchaseCart(line.product.id) : setPurchaseCart((current) => ({ ...current, [line.product.id]: { ...current[line.product.id], quantity: String(quantity - 1) } }))}
                              />
                              <Button size="small" appearance="subtle" icon={<Add20Regular />} aria-label={`Tambah ${line.product.name}`} onClick={() => addToPurchaseCart(line.product.id)} />
                              <Button size="small" appearance="subtle" icon={<Delete20Regular />} aria-label={`Hapus ${line.product.name}`} onClick={() => removeFromPurchaseCart(line.product.id)} />
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="flex min-h-60 flex-col items-center justify-center px-5 text-center">
                        <Cart24Regular className="text-[var(--app-accent)]" />
                        <p className="mt-3 text-sm font-semibold">PO masih kosong</p>
                        <p className="mt-1 text-xs text-[var(--app-text-muted)]">Pilih satu atau beberapa Barang/Bahan.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div><span className="block text-xs text-[var(--app-text-muted)]">Supplier</span><strong>{suppliers.find((supplier) => supplier.id === supplierId)?.name ?? "-"}</strong></div>
                  <div><span className="block text-xs text-[var(--app-text-muted)]">Isi PO</span><strong>{purchaseCartLines.length} jenis barang</strong></div>
                  <div><span className="block text-xs text-[var(--app-text-muted)]">Total satu PO</span><strong className="tabular text-base">{formatCurrency(purchaseTotal)}</strong></div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border)] pt-2 text-xs text-[var(--app-text-muted)]">
                  <span>Tempo {suppliers.find((supplier) => supplier.id === supplierId)?.paymentTermsDays ?? 0} hari · Konversi disimpan per item</span>
                  <strong className="text-emerald-700 dark:text-emerald-300">{purchaseCartLines.length ? "Langsung Dipesan" : "Pilih barang"}</strong>
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button
                appearance="primary"
                disabled={!purchaseCartLines.length || purchaseCartInvalid || purchaseTotal <= 0}
                onClick={() => {
                  try {
                    const order = addPurchaseOrder(supplierId, purchaseCartLines.map((line) => ({
                      productId: line.product.id,
                      quantity: Number(line.quantity),
                      unitPrice: Number(line.unitPrice),
                    })), sourcePurchaseRequestId ?? undefined);
                    setPurchaseCart({});
                    setPurchaseSearch("");
                    setSourcePurchaseRequestId(null);
                    setDialogOpen(false);
                    toast("Purchase order dibuat", `${order.number} · ${order.items.length} barang · ${formatCurrency(order.total)}`);
                  } catch (error) {
                    toast("PO tidak dapat dibuat", error instanceof Error ? error.message : "Periksa kembali data pembelian.");
                  }
                }}
              >
                Simpan 1 PO · {formatCurrency(purchaseTotal)}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={canReceivePurchaseOrder && Boolean(receiptOrder)}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setReceiptOrderId(null);
            setReceiptQuantities({});
          }
        }}
      >
        <DialogSurface className="erp-dialog--wide">
          <DialogBody>
            <DialogTitle>Catat penerimaan barang</DialogTitle>
            <DialogContent className="space-y-4">
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm">
                <p className="font-mono text-xs font-semibold">{receiptOrder?.number}</p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                  Isi jumlah yang benar-benar diterima. Sisa PO tetap terbuka dan setiap penerimaan memperoleh nomor GR serta lot unik.
                </p>
              </div>
              <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {receiptOrder?.items.map((item, index) => {
                  const outstanding = item.quantity - item.receivedQty;
                  return (
                    <div key={`${item.productId}-${index}`} className="grid gap-2 rounded-lg border border-[var(--app-border)] p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
                      <div>
                        <p className="text-sm font-semibold">{productName(item.productId)}</p>
                        <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                          Dipesan {formatNumber(item.quantity, 6)} · sudah diterima {formatNumber(item.receivedQty, 6)} · sisa {formatNumber(outstanding, 6)} {item.purchaseUnit}
                        </p>
                      </div>
                      <Field label="Diterima sekarang">
                        <Input
                          type="number"
                          min="0"
                          max={String(outstanding)}
                          step="any"
                          value={receiptQuantities[index] ?? "0"}
                          contentAfter={item.purchaseUnit}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(_, data) => setReceiptQuantities((current) => ({ ...current, [index]: data.value }))}
                        />
                      </Field>
                    </div>
                  );
                })}
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => { setReceiptOrderId(null); setReceiptQuantities({}); }}>Batal</Button>
              <Button
                appearance="primary"
                disabled={receiptInvalid}
                onClick={() => {
                  if (!receiptOrder) return;
                  try {
                    const receipt = receivePurchaseOrder(
                      receiptOrder.id,
                      receiptOrder.items.map((_, index) => Number(receiptQuantities[index] ?? "0")),
                    );
                    setReceiptOrderId(null);
                    setReceiptQuantities({});
                    toast("Penerimaan dicatat", `${receipt.number} selesai; stok langsung masuk Gudang Bahan.`);
                  } catch (error) {
                    toast("Penerimaan gagal", error instanceof Error ? error.message : "Periksa kembali jumlah penerimaan.");
                  }
                }}
              >
                Simpan penerimaan
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
