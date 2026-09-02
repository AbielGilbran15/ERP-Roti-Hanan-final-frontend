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
import { Add20Regular, Delete20Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { useAppToast } from "@/components/ui/app-toast";
import { formatNumber } from "@/lib/format";
import type { ProductionOrder } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

type OutputLine = {
  key: string;
  productId: string;
  goodQty: string;
  failedQty: string;
  failureReason: string;
};

const createLine = (productId = ""): OutputLine => ({
  key: `${Date.now()}-${Math.random()}`,
  productId,
  goodQty: "",
  failedQty: "0",
  failureReason: "",
});

export function ProductionResultDialog({ order, onClose }: { order?: ProductionOrder; onClose: () => void }) {
  const toast = useAppToast();
  const products = useERPStore((state) => state.products);
  const finalizeProduction = useERPStore((state) => state.finalizeProduction);
  const finishedProducts = useMemo(
    () => products.filter((product) => product.type === "Produk Jadi" && product.isActive),
    [products],
  );
  const [outputs, setOutputs] = useState<OutputLine[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!order) return;
    setOutputs([createLine(finishedProducts[0]?.id)]);
    setNotes("");
  }, [finishedProducts, order]);

  const parsedOutputs = outputs.map((line) => ({
    productId: line.productId,
    goodQty: Number(line.goodQty),
    failedQty: Number(line.failedQty),
    failureReason: line.failureReason,
  }));
  const duplicateProducts = new Set(parsedOutputs.map((line) => line.productId)).size !== parsedOutputs.length;
  const invalid = !parsedOutputs.length || duplicateProducts || parsedOutputs.some((line) =>
    !line.productId
    || !Number.isInteger(line.goodQty)
    || !Number.isInteger(line.failedQty)
    || line.goodQty < 0
    || line.failedQty < 0
    || line.goodQty + line.failedQty <= 0
    || (line.failedQty > 0 && !line.failureReason.trim()),
  );
  const totalGood = parsedOutputs.reduce((sum, line) => sum + (Number.isFinite(line.goodQty) ? line.goodQty : 0), 0);
  const totalFailed = parsedOutputs.reduce((sum, line) => sum + (Number.isFinite(line.failedQty) ? line.failedQty : 0), 0);

  const updateLine = (key: string, patch: Partial<OutputLine>) => {
    setOutputs((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  };

  return (
    <Dialog open={Boolean(order)} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className="erp-dialog--wide">
        <DialogBody>
          <DialogTitle>Selesaikan produksi · {order?.batchNumber}</DialogTitle>
          <DialogContent className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              Catat satu atau beberapa Barang Jadi. Jumlah berhasil langsung masuk Gudang Produk Jadi dan otomatis dialokasikan ke pesanan yang kekurangan stok berdasarkan tanggal kebutuhan terdekat, lalu pesanan terlama.
            </div>

            <div className="space-y-3">
              {outputs.map((line, index) => {
                const product = finishedProducts.find((item) => item.id === line.productId);
                const failed = Number(line.failedQty);
                return (
                  <div key={line.key} className="rounded-xl border border-[var(--app-border)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Hasil produk {index + 1}</p>
                      <Button appearance="subtle" size="small" icon={<Delete20Regular />} disabled={outputs.length === 1} onClick={() => setOutputs((current) => current.filter((item) => item.key !== line.key))}>Hapus</Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Barang Jadi" required>
                        <Select value={line.productId} onChange={(event) => updateLine(line.key, { productId: event.target.value })}>
                          <option value="">Pilih produk</option>
                          {finishedProducts.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
                        </Select>
                      </Field>
                      <Field label="Jumlah berhasil" required><Input type="number" min="0" step="1" value={line.goodQty} onChange={(_, data) => updateLine(line.key, { goodQty: data.value })} contentAfter={product?.stockUnit || "unit"} /></Field>
                      <Field label="Jumlah gagal / waste" required><Input type="number" min="0" step="1" value={line.failedQty} onChange={(_, data) => updateLine(line.key, { failedQty: data.value })} contentAfter={product?.stockUnit || "unit"} /></Field>
                    </div>
                    {failed > 0 ? <Field className="mt-3" label="Alasan gagal / waste" required><Input value={line.failureReason} onChange={(_, data) => updateLine(line.key, { failureReason: data.value })} placeholder="Contoh: bentuk tidak sesuai saat keluar oven" /></Field> : null}
                  </div>
                );
              })}
              <Button appearance="secondary" icon={<Add20Regular />} disabled={outputs.length >= finishedProducts.length} onClick={() => setOutputs((current) => [...current, createLine(finishedProducts.find((product) => !current.some((line) => line.productId === product.id))?.id)])}>Tambah hasil produk</Button>
            </div>

            {duplicateProducts ? <p className="rounded-lg bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/30 dark:text-red-200">Satu SKU Barang Jadi hanya boleh dicatat sekali dalam batch yang sama.</p> : null}

            <div className="rounded-xl bg-[var(--app-surface-2)] p-4">
              <p className="text-xs font-medium text-[var(--app-text-muted)]">Ringkasan hasil batch</p>
              <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
                <p className="tabular text-xl font-semibold">{formatNumber(totalGood)} <span className="text-sm font-normal text-[var(--app-text-muted)]">berhasil</span></p>
                <p className="tabular text-xl font-semibold text-red-700 dark:text-red-300">{formatNumber(totalFailed)} <span className="text-sm font-normal">gagal/waste</span></p>
              </div>
            </div>

            <Field label="Catatan laporan produksi"><Textarea resize="vertical" value={notes} onChange={(_, data) => setNotes(data.value)} placeholder="Kendala proses atau informasi penting dari batch" /></Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>Batal</Button>
            <Button
              appearance="primary"
              disabled={!order || invalid}
              onClick={() => {
                if (!order) return;
                try {
                  finalizeProduction(order.id, { outputs: parsedOutputs, notes });
                  onClose();
                  toast("Batch produksi selesai", `${formatNumber(totalGood)} berhasil masuk Gudang Produk Jadi; ${formatNumber(totalFailed)} tercatat sebagai waste.`);
                } catch (error) {
                  toast("Produksi tidak dapat difinalkan", error instanceof Error ? error.message : "Periksa kembali hasil produksi.", "error");
                }
              }}
            >
              Finalisasi batch
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
