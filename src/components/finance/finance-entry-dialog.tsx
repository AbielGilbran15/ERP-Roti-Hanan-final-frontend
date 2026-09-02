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
import { useEffect, useMemo, useState } from "react";
import { useAppToast } from "@/components/ui/app-toast";
import { formatCurrency } from "@/lib/format";
import { useERPStore } from "@/store/use-erp-store";

export type FinanceEntryKind = "cash-in" | "cash-out" | "receivable" | "payable" | "expense" | "hpp";

const entryLabels: Record<FinanceEntryKind, string> = {
  "cash-in": "Kas / bank masuk",
  "cash-out": "Kas / bank keluar",
  receivable: "Piutang usaha",
  payable: "Utang usaha",
  expense: "Biaya bulan ini",
  hpp: "Koreksi HPP manual",
};

export function FinanceEntryDialog({
  open,
  initialKind,
  onOpenChange,
}: {
  open: boolean;
  initialKind: FinanceEntryKind;
  onOpenChange: (open: boolean) => void;
}) {
  const accounts = useERPStore((state) => state.cashAccounts);
  const products = useERPStore((state) => state.products);
  const addCashTransaction = useERPStore((state) => state.addCashTransaction);
  const addInvoice = useERPStore((state) => state.addInvoice);
  const addExpense = useERPStore((state) => state.addExpense);
  const addCostOfGoodsSold = useERPStore((state) => state.addCostOfGoodsSold);
  const toast = useAppToast();
  const [kind, setKind] = useState<FinanceEntryKind>(initialKind);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [party, setParty] = useState("");
  const [source, setSource] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [department, setDepartment] = useState("Produksi");
  const [category, setCategory] = useState("Operasional");
  const [hppProductId, setHppProductId] = useState("");
  const [hppQuantity, setHppQuantity] = useState("");
  const [hppUnitCost, setHppUnitCost] = useState("");
  const [description, setDescription] = useState("");
  const finishedProducts = useMemo(
    () => products.filter((product) => product.type === "Produk Jadi" && product.isActive),
    [products],
  );
  const selectedHppProduct = finishedProducts.find((product) => product.id === hppProductId);
  const hppTotal = Number(hppQuantity) * Number(hppUnitCost);

  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setAccountId((current) => current || accounts[0]?.id || "");
    const selected = finishedProducts.find((product) => product.id === hppProductId) ?? finishedProducts[0];
    setHppProductId(selected?.id ?? "");
    setHppUnitCost(selected?.cost ? String(selected.cost) : "");
  }, [accounts, finishedProducts, hppProductId, initialKind, open]);

  const reset = () => {
    setAmount("");
    setParty("");
    setSource("");
    setDueDate("");
    setHppQuantity("");
    setHppUnitCost("");
    setDescription("");
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const save = () => {
    try {
      const numericAmount = Number(amount);
      if (kind === "cash-in" || kind === "cash-out") {
        addCashTransaction(accountId, kind === "cash-in" ? "Masuk" : "Keluar", description, numericAmount);
        toast("Mutasi kas tersimpan", `${entryLabels[kind]} sebesar ${numericAmount.toLocaleString("id-ID")}.`);
      } else if (kind === "receivable" || kind === "payable") {
        addInvoice(kind === "receivable" ? "Piutang" : "Utang", party, source, dueDate, numericAmount);
        toast(`${kind === "receivable" ? "Piutang" : "Utang"} tersimpan`, `${party} · ${numericAmount.toLocaleString("id-ID")}.`);
      } else if (kind === "expense") {
        addExpense(department, category, party, numericAmount);
        toast("Biaya dicatat", "Biaya langsung berstatus Disetujui dan siap dibayar oleh Staff Finance berwenang.");
      } else {
        const cost = addCostOfGoodsSold(hppProductId, Number(hppQuantity), Number(hppUnitCost), description);
        toast("Koreksi HPP dicatat", `${cost.productNameSnapshot} · ${formatCurrency(cost.amount)}.`);
      }
      close();
    } catch (error) {
      toast("Data keuangan tidak dapat disimpan", error instanceof Error ? error.message : "Periksa kembali data yang diinput.", "error");
    }
  };

  const needsAccount = kind === "cash-in" || kind === "cash-out";
  const needsInvoice = kind === "receivable" || kind === "payable";
  const needsExpense = kind === "expense";
  const needsHpp = kind === "hpp";
  const canSave = (needsHpp || Number(amount) > 0)
    && (!needsAccount || Boolean(accountId && description.trim()))
    && (!needsInvoice || Boolean(party.trim() && source.trim() && dueDate))
    && (!needsExpense || Boolean(party.trim()))
    && (!needsHpp || Boolean(hppProductId) && Number(hppQuantity) > 0 && Number(hppUnitCost) > 0 && Boolean(description.trim()));

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open) close(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Catat data keuangan</DialogTitle>
          <DialogContent className="space-y-4">
            <Field label="Jenis pencatatan">
              <Select value={kind} onChange={(event) => setKind(event.target.value as FinanceEntryKind)}>
                {Object.entries(entryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>

            {needsAccount ? (
              <>
                <Field label="Akun kas / bank">
                  <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </Select>
                </Field>
                <Field label="Keterangan">
                  <Textarea value={description} onChange={(_, data) => setDescription(data.value)} placeholder="Contoh: Setoran penjualan tunai" />
                </Field>
              </>
            ) : null}

            {needsInvoice ? (
              <>
                <Field label={kind === "receivable" ? "Nama pelanggan / agen" : "Nama supplier / pihak"}>
                  <Input value={party} onChange={(_, data) => setParty(data.value)} />
                </Field>
                <Field label="Referensi sumber">
                  <Input value={source} onChange={(_, data) => setSource(data.value)} placeholder={kind === "receivable" ? "Nomor pesanan / invoice" : "Nomor PO / tagihan"} />
                </Field>
                <Field label="Tanggal jatuh tempo">
                  <Input type="date" value={dueDate} onChange={(_, data) => setDueDate(data.value)} />
                </Field>
              </>
            ) : null}

            {needsExpense ? (
              <>
                <Field label="Departemen">
                  <Select value={department} onChange={(event) => setDepartment(event.target.value)}>
                    <option>Produksi</option><option>Gudang</option><option>Penjualan</option><option>Purchasing</option><option>HR & Finance</option>
                  </Select>
                </Field>
                <Field label="Kategori biaya">
                  <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option>Operasional</option><option>Produksi</option><option>Perawatan</option><option>Distribusi</option><option>Utilitas</option>
                  </Select>
                </Field>
                <Field label="Penerima">
                  <Input value={party} onChange={(_, data) => setParty(data.value)} placeholder="Nama vendor atau penerima" />
                </Field>
                <p className="rounded-lg bg-[var(--app-surface-2)] p-3 text-xs text-[var(--app-text-muted)]">Biaya yang disimpan langsung berstatus Disetujui dan dapat dilanjutkan ke pembayaran.</p>
              </>
            ) : null}

            {needsHpp ? (
              <>
                <p className="rounded-lg bg-[var(--app-surface-2)] p-3 text-xs leading-5 text-[var(--app-text-muted)]">HPP penjualan normal dibuat otomatis saat transaksi selesai. Formulir ini hanya untuk koreksi manual dan dapat menambah HPP di luar transaksi penjualan.</p>
                <Field label="Produk jadi">
                  <Select value={hppProductId} onChange={(event) => {
                    const product = finishedProducts.find((item) => item.id === event.target.value);
                    setHppProductId(event.target.value);
                    setHppUnitCost(product?.cost ? String(product.cost) : "");
                  }}>
                    {finishedProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </Select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`Jumlah terjual${selectedHppProduct?.salesUnit ? ` (${selectedHppProduct.salesUnit})` : ""}`}>
                    <Input type="number" min="1" value={hppQuantity} onChange={(_, data) => setHppQuantity(data.value)} />
                  </Field>
                  <Field label="HPP per unit">
                    <Input type="number" min="1" value={hppUnitCost} onChange={(_, data) => setHppUnitCost(data.value)} contentBefore="Rp" />
                  </Field>
                </div>
                <div className="rounded-lg bg-[var(--app-surface-2)] p-3">
                  <p className="text-xs text-[var(--app-text-muted)]">Total HPP penjualan</p>
                  <p className="tabular mt-1 text-base font-semibold">{formatCurrency(Number.isFinite(hppTotal) ? hppTotal : 0)}</p>
                </div>
                <Field label="Alasan koreksi" required>
                  <Input value={description} onChange={(_, data) => setDescription(data.value)} placeholder="Contoh: Koreksi selisih HPP setelah tutup buku" />
                </Field>
              </>
            ) : null}

            {!needsHpp ? (
              <Field label="Nilai" hint="Masukkan angka tanpa tanda titik atau koma.">
                <Input type="number" min="1" value={amount} onChange={(_, data) => setAmount(data.value)} contentBefore="Rp" />
              </Field>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={close}>Batal</Button>
            <Button appearance="primary" disabled={!canSave} onClick={save}>Simpan</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
