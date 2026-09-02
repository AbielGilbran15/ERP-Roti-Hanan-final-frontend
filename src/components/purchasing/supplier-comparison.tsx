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
import { Add20Regular, Delete20Regular, Edit20Regular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/components/ui/app-toast";
import { localDateKey } from "@/lib/date";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { SupplierQuotation } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

type SupplierComparisonProps = {
  canCreatePurchaseOrder: boolean;
  onUseQuotation: (quotation: SupplierQuotation, quantity: number) => void;
};

const today = () => localDateKey();

export function SupplierComparison({ canCreatePurchaseOrder, onUseQuotation }: SupplierComparisonProps) {
  const toast = useAppToast();
  const products = useERPStore((state) => state.products);
  const suppliers = useERPStore((state) => state.suppliers);
  const quotations = useERPStore((state) => state.supplierQuotations);
  const addSupplierQuotation = useERPStore((state) => state.addSupplierQuotation);
  const updateSupplierQuotation = useERPStore((state) => state.updateSupplierQuotation);
  const deleteSupplierQuotation = useERPStore((state) => state.deleteSupplierQuotation);
  const comparisonProducts = products.filter((product) => product.type !== "Produk Jadi" && product.isActive && product.purchaseUnit);
  const initialProductId = comparisonProducts.find((product) => product.id === "raw-tepung")?.id ?? comparisonProducts[0]?.id ?? "";
  const [productId, setProductId] = useState(initialProductId);
  const [quantity, setQuantity] = useState("2");
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [quotationToDelete, setQuotationToDelete] = useState<SupplierQuotation | null>(null);
  const [supplierId, setSupplierId] = useState("sup-sumber");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState("1");
  const [leadTimeDays, setLeadTimeDays] = useState("1");
  const [quotedAt, setQuotedAt] = useState(today());
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  const selectedProduct = comparisonProducts.find((product) => product.id === productId);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
  const comparisonQuantity = Number(quantity);
  const displayedQuotations = useMemo(
    () => quotations.filter((quotation) => quotation.productId === productId).sort((a, b) => a.unitPrice - b.unitPrice || a.leadTimeDays - b.leadTimeDays),
    [productId, quotations],
  );
  const eligibleQuotations = displayedQuotations.filter((quotation) =>
    Number.isFinite(comparisonQuantity)
    && comparisonQuantity >= quotation.minimumOrderQuantity
    && (!quotation.validUntil || quotation.validUntil >= today()),
  );
  const lowestQuotationId = eligibleQuotations[0]?.id;

  const resetForm = () => {
    setReferenceNumber("");
    setUnitPrice("");
    setMinimumOrderQuantity("1");
    setLeadTimeDays("1");
    setQuotedAt(today());
    setValidUntil("");
    setNotes("");
  };

  const openQuotationDialog = () => {
    const defaultSupplier = suppliers.find((supplier) => supplier.isActive)?.id ?? "";
    setEditingQuotationId(null);
    setSupplierId(defaultSupplier);
    resetForm();
    setQuotationDialogOpen(true);
  };

  const openEditDialog = (quotation: SupplierQuotation) => {
    setEditingQuotationId(quotation.id);
    setProductId(quotation.productId);
    setSupplierId(quotation.supplierId);
    setReferenceNumber(quotation.referenceNumber);
    setUnitPrice(String(quotation.unitPrice));
    setMinimumOrderQuantity(String(quotation.minimumOrderQuantity));
    setLeadTimeDays(String(quotation.leadTimeDays));
    setQuotedAt(quotation.quotedAt);
    setValidUntil(quotation.validUntil ?? "");
    setNotes(quotation.notes);
    setQuotationDialogOpen(true);
  };

  const formInvalid = !referenceNumber.trim()
    || !productId
    || !supplierId
    || !quotedAt
    || !Number.isFinite(Number(unitPrice))
    || Number(unitPrice) <= 0
    || !Number.isFinite(Number(minimumOrderQuantity))
    || Number(minimumOrderQuantity) <= 0
    || !Number.isFinite(Number(leadTimeDays))
    || Number(leadTimeDays) < 0
    || Boolean(validUntil && validUntil < quotedAt);

  return (
    <>
      <SectionPanel
        title="Perbandingan penawaran supplier"
        description="Bandingkan harga, minimum pembelian, termin, dan estimasi pengiriman dari setiap supplier."
        action={canCreatePurchaseOrder ? <Button appearance="primary" icon={<Add20Regular />} onClick={openQuotationDialog}>Tambah penawaran</Button> : null}
      >
        <div className="grid gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3 sm:grid-cols-[minmax(220px,1fr)_minmax(180px,0.55fr)]">
          <Field label="Barang/Bahan yang dibandingkan">
            <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
              {comparisonProducts.map((product) => <option key={product.id} value={product.id}>{product.code} — {product.name}</option>)}
            </Select>
          </Field>
          <Field label="Jumlah pembanding">
            <Input type="number" min="0.0001" step="any" value={quantity} contentAfter={selectedProduct?.purchaseUnit ?? "Unit"} onChange={(_, data) => setQuantity(data.value)} />
          </Field>
        </div>

        {selectedProduct ? (
          <p className="mt-3 text-xs text-[var(--app-text-muted)]">
            {Number.isFinite(comparisonQuantity) && comparisonQuantity > 0
              ? `${formatNumber(comparisonQuantity, 6)} ${selectedProduct.purchaseUnit} × ${formatNumber(selectedProduct.conversionValue, 6)} ${selectedProduct.stockUnit} = ${formatNumber(comparisonQuantity * selectedProduct.conversionValue, 6)} ${selectedProduct.stockUnit} stok masuk.`
              : "Masukkan jumlah pembanding yang valid."}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {displayedQuotations.map((quotation) => {
            const meetsMinimum = Number.isFinite(comparisonQuantity) && comparisonQuantity >= quotation.minimumOrderQuantity;
            const expired = Boolean(quotation.validUntil && quotation.validUntil < today());
            const canUse = canCreatePurchaseOrder && meetsMinimum && !expired && comparisonQuantity > 0;
            return (
              <article key={quotation.id} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{quotation.supplierNameSnapshot}</h3>
                    <p className="mt-1 font-mono text-[11px] text-[var(--app-text-muted)]">{quotation.referenceNumber}</p>
                  </div>
                  <StatusBadge status={expired ? "Kedaluwarsa" : quotation.id === lowestQuotationId ? "Harga terendah" : "Pembanding"} />
                </div>

                <p className="tabular mt-4 text-xl font-semibold">{formatCurrency(quotation.unitPrice)} <span className="text-xs font-normal text-[var(--app-text-muted)]">/ {quotation.purchaseUnitSnapshot}</span></p>
                <p className="tabular mt-1 text-xs text-[var(--app-text-muted)]">Total {formatCurrency(quotation.unitPrice * (Number.isFinite(comparisonQuantity) ? comparisonQuantity : 0))}</p>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-[var(--app-text-muted)]">Pengiriman</dt><dd className="mt-1 font-medium">{quotation.leadTimeDays} hari</dd></div>
                  <div><dt className="text-[var(--app-text-muted)]">Termin</dt><dd className="mt-1 font-medium">{quotation.paymentTermsDaysSnapshot} hari</dd></div>
                </dl>

                <div className="mt-4 space-y-1 rounded-lg bg-[var(--app-surface-2)] p-3 text-[11px] leading-4 text-[var(--app-text-muted)]">
                  <p><strong className="text-[var(--app-text)]">Harga & pengiriman:</strong> {quotation.referenceNumber}, dicatat {formatDate(quotation.quotedAt)}{quotation.validUntil ? `, berlaku s.d. ${formatDate(quotation.validUntil)}` : ""}.</p>
                  <p><strong className="text-[var(--app-text)]">Termin:</strong> snapshot master {quotation.supplierNameSnapshot} saat penawaran dicatat.</p>
                  <p><strong className="text-[var(--app-text)]">Minimum:</strong> {formatNumber(quotation.minimumOrderQuantity, 6)} {quotation.purchaseUnitSnapshot}{quotation.notes ? ` · ${quotation.notes}` : "."}</p>
                  {quotation.updatedAt ? <p><strong className="text-[var(--app-text)]">Terakhir diubah:</strong> {formatDate(quotation.updatedAt, "dd MMM yyyy, HH:mm")}.</p> : null}
                </div>

                {canCreatePurchaseOrder ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button appearance={quotation.id === lowestQuotationId ? "primary" : "secondary"} disabled={!canUse} onClick={() => onUseQuotation(quotation, comparisonQuantity)}>
                      {expired ? "Penawaran kedaluwarsa" : !meetsMinimum ? `Minimum ${formatNumber(quotation.minimumOrderQuantity, 6)} ${quotation.purchaseUnitSnapshot}` : "Gunakan untuk PO"}
                    </Button>
                    <Button appearance="subtle" icon={<Edit20Regular />} onClick={() => openEditDialog(quotation)}>Edit</Button>
                    <Button appearance="subtle" icon={<Delete20Regular />} className="text-red-700 dark:text-red-300" onClick={() => setQuotationToDelete(quotation)}>Hapus</Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        {!displayedQuotations.length ? (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--app-border)] px-5 py-10 text-center">
            <p className="text-sm font-semibold">Belum ada penawaran untuk {selectedProduct?.name ?? "bahan ini"}</p>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">Catat penawaran dari supplier agar harga dan syaratnya dapat dibandingkan.</p>
          </div>
        ) : null}
      </SectionPanel>

      <Dialog open={quotationDialogOpen} onOpenChange={(_, data) => setQuotationDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editingQuotationId ? "Edit penawaran supplier" : "Tambah penawaran supplier"}</DialogTitle>
            <DialogContent className="space-y-4">
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-xs leading-5 text-[var(--app-text-muted)]">
                Penawaran akan dibandingkan untuk <strong className="text-[var(--app-text)]">{selectedProduct?.name ?? "Barang/Bahan"}</strong>. Termin disalin otomatis dari master supplier saat penawaran disimpan.
              </div>
              <Field label="Supplier" required>
                <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                  {suppliers.filter((supplier) => supplier.isActive).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.code} — {supplier.name}</option>)}
                </Select>
              </Field>
              <Field label="Nomor referensi penawaran" required hint="Nomor surat, email, WhatsApp, atau referensi internal yang dapat ditelusuri.">
                <Input value={referenceNumber} placeholder="Contoh: PNW-SUP-260828-015" onChange={(_, data) => setReferenceNumber(data.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`Harga / ${selectedProduct?.purchaseUnit ?? "satuan"}`} required><Input type="number" min="1" value={unitPrice} contentBefore="Rp" onChange={(_, data) => setUnitPrice(data.value)} /></Field>
                <Field label="Minimum pembelian" required><Input type="number" min="0.0001" step="any" value={minimumOrderQuantity} contentAfter={selectedProduct?.purchaseUnit ?? "Unit"} onChange={(_, data) => setMinimumOrderQuantity(data.value)} /></Field>
                <Field label="Estimasi pengiriman" required><Input type="number" min="0" step="1" value={leadTimeDays} contentAfter="hari" onChange={(_, data) => setLeadTimeDays(data.value)} /></Field>
                <Field label="Termin dari master"><Input value={`${selectedSupplier?.paymentTermsDays ?? 0} hari`} readOnly /></Field>
                <Field label="Tanggal penawaran" required><Input type="date" value={quotedAt} onChange={(_, data) => setQuotedAt(data.value)} /></Field>
                <Field label="Berlaku sampai"><Input type="date" value={validUntil} onChange={(_, data) => setValidUntil(data.value)} /></Field>
              </div>
              <Field label="Catatan"><Textarea resize="vertical" value={notes} placeholder="Ongkir, syarat pembayaran, ketersediaan, atau catatan lain" onChange={(_, data) => setNotes(data.value)} /></Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setQuotationDialogOpen(false)}>Batal</Button>
              <Button appearance="primary" disabled={formInvalid} onClick={() => {
                try {
                  const draft = {
                    referenceNumber,
                    supplierId,
                    productId,
                    unitPrice: Number(unitPrice),
                    minimumOrderQuantity: Number(minimumOrderQuantity),
                    leadTimeDays: Number(leadTimeDays),
                    quotedAt,
                    validUntil: validUntil || undefined,
                    notes,
                  };
                  const quotation = editingQuotationId
                    ? updateSupplierQuotation(editingQuotationId, draft)
                    : addSupplierQuotation(draft);
                  setQuotationDialogOpen(false);
                  resetForm();
                  setEditingQuotationId(null);
                  toast(editingQuotationId ? "Penawaran diperbarui" : "Penawaran ditambahkan", `${quotation.referenceNumber} · ${quotation.supplierNameSnapshot}`);
                } catch (error) {
                  toast("Penawaran tidak dapat disimpan", error instanceof Error ? error.message : "Periksa kembali data penawaran.");
                }
              }}>{editingQuotationId ? "Simpan perubahan" : "Simpan penawaran"}</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={Boolean(quotationToDelete)} onOpenChange={(_, data) => { if (!data.open) setQuotationToDelete(null); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Hapus penawaran supplier?</DialogTitle>
            <DialogContent>
              <p className="text-sm leading-6">
                Penawaran <strong>{quotationToDelete?.referenceNumber}</strong> dari <strong>{quotationToDelete?.supplierNameSnapshot}</strong> akan dihapus dari perbandingan. Master Supplier dan purchase order yang pernah dibuat tidak akan terpengaruh.
              </p>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setQuotationToDelete(null)}>Batal</Button>
              <Button appearance="primary" className="bg-red-700 hover:bg-red-800" onClick={() => {
                if (!quotationToDelete) return;
                try {
                  const reference = quotationToDelete.referenceNumber;
                  deleteSupplierQuotation(quotationToDelete.id);
                  setQuotationToDelete(null);
                  toast("Penawaran dihapus", `${reference} telah dikeluarkan dari perbandingan.`);
                } catch (error) {
                  toast("Penawaran tidak dapat dihapus", error instanceof Error ? error.message : "Coba kembali beberapa saat lagi.");
                }
              }}>Hapus penawaran</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
