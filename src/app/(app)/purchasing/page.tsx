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
import { useCurrentAccess } from "@/hooks/use-current-access";
import { canPerformAction } from "@/lib/access";
import { startOfLocalDay } from "@/lib/date";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { PurchaseOrder } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

export default function PurchasingPage() {
  const [tab, setTab] = useState("orders");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("sup-sumber");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseCart, setPurchaseCart] = useState<Record<string, { quantity: string; unitPrice: string }>>({});
  const toast = useAppToast();
  const { role } = useCurrentAccess();
  const canCreatePurchaseOrder = canPerformAction(role, "purchasing.create");
  const canReceivePurchaseOrder = canPerformAction(role, "purchasing.receive");
  const purchaseOrders = useERPStore((state) => state.purchaseOrders);
  const stocks = useERPStore((state) => state.stocks);
  const products = useERPStore((state) => state.products);
  const suppliers = useERPStore((state) => state.suppliers);
  const addPurchaseOrder = useERPStore((state) => state.addPurchaseOrder);
  const receivePurchaseOrder = useERPStore((state) => state.receivePurchaseOrder);
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

  const openOrders = purchaseOrders.filter((item) => item.status !== "Diterima");
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
        cell: ({ row }) =>
          canReceivePurchaseOrder && (row.original.status === "Dipesan" || row.original.status === "Diterima Sebagian") ? (
            <Button
              appearance="primary"
              size="small"
              icon={<ArrowDownload24Regular />}
              onClick={() => {
                receivePurchaseOrder(row.original.id);
                toast("Penerimaan dicatat", `${row.original.number} masuk antrean QC bahan.`);
              }}
            >
              Terima
            </Button>
          ) : null,
      },
    ],
    [canReceivePurchaseOrder, products, receivePurchaseOrder, toast],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchasing"
        description="Kelola kebutuhan bahan, pesanan pembelian, penerimaan, dan evaluasi supplier."
        actions={canCreatePurchaseOrder ? <Button appearance="primary" icon={<Add20Regular />} onClick={() => setDialogOpen(true)}>Buat purchase order</Button> : null}
      />

      <MetricStrip
        items={[
          { label: "PO aktif", value: String(openOrders.length), detail: `${purchaseOrders.length} PO bulan ini`, trend: "neutral", icon: <Receipt24Regular />, onClick: () => setTab("orders") },
          { label: "Nilai belum diterima", value: formatCurrency(pendingValue), detail: "Termasuk PO menunggu approval", trend: "neutral", icon: <Money24Regular />, onClick: () => setTab("orders") },
          { label: "Bahan kritis", value: String(needSuggestions.length), detail: "Di bawah stok minimum", trend: "down", icon: <Warning24Regular />, onClick: () => setTab("needs") },
          { label: "Pengiriman terlambat", value: String(overdue.length), detail: "Perlu follow-up supplier", trend: overdue.length ? "down" : "neutral", icon: <Clock24Regular />, onClick: () => setTab("orders") },
        ]}
      />

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} className="overflow-x-auto">
        <Tab value="orders">Purchase order</Tab>
        <Tab value="needs">Saran kebutuhan</Tab>
        <Tab value="offers">Perbandingan supplier</Tab>
      </TabList>

      {tab === "orders" ? (
        <SectionPanel noPadding>
          <DataTable data={purchaseOrders} columns={columns} searchPlaceholder="Cari PO, supplier, barang..." />
        </SectionPanel>
      ) : null}

      {tab === "needs" ? (
        <SectionPanel title="Saran pembelian" description="Dihitung dari stok tersedia, minimum, reservasi, dan pesanan aktif." noPadding>
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
        <SectionPanel title="Penawaran tepung terigu" description="Perbandingan untuk 2 Karung; 1 Karung = 25 Kg, sehingga stok masuk 50 Kg.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              { name: "CV Sumber Pangan Jaya", price: 300000, lead: "1 hari", terms: "14 hari", qc: "98,2% lulus", choice: "Direkomendasikan" },
              { name: "PT Bahan Roti Mandiri", price: 305000, lead: "2 hari", terms: "21 hari", qc: "99,1% lulus", choice: "Alternatif" },
            ].map((offer) => (
              <button
                key={offer.name}
                type="button"
                disabled={!canCreatePurchaseOrder}
                className="focus-ring rounded-xl border border-[var(--app-border)] p-4 text-left transition-colors enabled:hover:bg-[var(--app-surface-2)] disabled:cursor-default"
                onClick={() => {
                  setSupplierId(offer.name === "CV Sumber Pangan Jaya" ? "sup-sumber" : "sup-bahan-roti");
                  setPurchaseCart({ "raw-tepung": { quantity: "2", unitPrice: String(offer.price) } });
                  setDialogOpen(true);
                }}
              >
                <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold">{offer.name}</h3><StatusBadge status={offer.choice} /></div>
                <p className="tabular mt-4 text-xl font-semibold">{formatCurrency(offer.price)} <span className="text-xs font-normal text-[var(--app-text-muted)]">/ Karung</span></p>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div><dt className="text-[var(--app-text-muted)]">Pengiriman</dt><dd className="mt-1 font-medium">{offer.lead}</dd></div>
                  <div><dt className="text-[var(--app-text-muted)]">Termin</dt><dd className="mt-1 font-medium">{offer.terms}</dd></div>
                  <div><dt className="text-[var(--app-text-muted)]">Kualitas</dt><dd className="mt-1 font-medium">{offer.qc}</dd></div>
                </dl>
                {canCreatePurchaseOrder ? <p className="mt-4 text-xs font-semibold text-[var(--app-accent)]">Gunakan penawaran ini</p> : null}
              </button>
            ))}
          </div>
        </SectionPanel>
      ) : null}

      <Dialog open={canCreatePurchaseOrder && dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface className="!max-w-5xl">
          <DialogBody>
            <DialogTitle>Buat purchase order</DialogTitle>
            <DialogContent className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
              <Field label="Supplier"><Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>{suppliers.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></Field>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,1fr)]">
                <section className="rounded-xl border border-[var(--app-border)] p-3">
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

                <section className="overflow-hidden rounded-xl border border-[var(--app-border)]">
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
                  <strong className={purchaseTotal > 3000000 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}>{purchaseCartLines.length ? (purchaseTotal > 3000000 ? "Menunggu Persetujuan" : "Langsung Dipesan") : "Pilih barang"}</strong>
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
                    })));
                    setPurchaseCart({});
                    setPurchaseSearch("");
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
    </div>
  );
}
