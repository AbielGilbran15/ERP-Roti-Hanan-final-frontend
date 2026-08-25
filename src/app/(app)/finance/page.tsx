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
  ArrowTrending24Regular,
  BuildingBank24Regular,
  Money24Regular,
  ReceiptMoney24Regular,
} from "@fluentui/react-icons";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ChartLoading } from "@/components/charts/chart-loading";
import { useAppToast } from "@/components/ui/app-toast";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense, Invoice } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

const FinanceChart = dynamic(
  () => import("@/components/charts/finance-chart").then((module) => module.FinanceChart),
  { ssr: false, loading: () => <ChartLoading /> },
);

const journalEntries = [
  { id: "JRN-260823-041", date: "2026-08-23", account: "Kas Pusat", description: "Penjualan tunai pusat", debit: 5420000, credit: 0 },
  { id: "JRN-260823-042", date: "2026-08-23", account: "Pendapatan Penjualan", description: "Penjualan tunai pusat", debit: 0, credit: 5420000 },
  { id: "JRN-260823-043", date: "2026-08-23", account: "Beban Gas Produksi", description: "Pembayaran gas produksi", debit: 2850000, credit: 0 },
  { id: "JRN-260823-044", date: "2026-08-23", account: "Bank BCA Operasional", description: "Pembayaran gas produksi", debit: 0, credit: 2850000 },
];

export default function FinancePage() {
  const [tab, setTab] = useState("summary");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [department, setDepartment] = useState("Produksi");
  const [category, setCategory] = useState("Operasional");
  const [payee, setPayee] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const invoices = useERPStore((state) => state.invoices);
  const expenses = useERPStore((state) => state.expenses);
  const addExpense = useERPStore((state) => state.addExpense);
  const payInvoice = useERPStore((state) => state.payInvoice);
  const toast = useAppToast();

  const receivables = invoices.filter((item) => item.type === "Piutang").reduce((sum, item) => sum + item.total - item.paid, 0);
  const payables = invoices.filter((item) => item.type === "Utang").reduce((sum, item) => sum + item.total - item.paid, 0);
  const monthExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

  const invoiceColumns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      { header: "Tagihan", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Jenis", accessorKey: "type" },
      { header: "Pihak", accessorKey: "party" },
      { header: "Jatuh tempo", accessorKey: "dueDate", cell: ({ getValue }) => formatDate(String(getValue())) },
      { header: "Sisa", accessorFn: (row) => row.total - row.paid, cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      {
        id: "action",
        header: "Tindakan",
        cell: ({ row }) => row.original.status !== "Lunas" ? (
          <Button size="small" appearance="primary" onClick={() => {
            setPaymentInvoice(row.original);
            setPaymentAmount(String(row.original.total - row.original.paid));
          }}>
            Catat bayar
          </Button>
        ) : null,
      },
    ],
    [],
  );

  const expenseColumns = useMemo<ColumnDef<Expense>[]>(
    () => [
      { header: "Nomor", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Tanggal", accessorKey: "date", cell: ({ getValue }) => formatDate(String(getValue())) },
      { header: "Departemen", accessorKey: "department" },
      { header: "Kategori", accessorKey: "category" },
      { header: "Penerima", accessorKey: "payee" },
      { header: "Nilai", accessorKey: "amount", cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Keuangan & Kas"
        description="Pantau posisi kas, tagihan, biaya, dan catatan akuntansi pusat Bandung."
        actions={<Button appearance="primary" icon={<Add20Regular />} onClick={() => setExpenseOpen(true)}>Catat biaya</Button>}
      />

      <MetricStrip items={[
        { label: "Kas & bank", value: formatCurrency(184350000), detail: "Saldo gabungan hari ini", trend: "neutral", icon: <BuildingBank24Regular />, onClick: () => setTab("summary") },
        { label: "Piutang usaha", value: formatCurrency(receivables), detail: "Sisa yang perlu ditagih", trend: receivables ? "down" : "neutral", icon: <ReceiptMoney24Regular />, onClick: () => setTab("invoices") },
        { label: "Utang usaha", value: formatCurrency(payables), detail: "Belum dibayar ke supplier", trend: "neutral", icon: <Money24Regular />, onClick: () => setTab("invoices") },
        { label: "Biaya bulan ini", value: formatCurrency(monthExpenses), detail: "Gabungan seluruh departemen", trend: "neutral", icon: <ArrowTrending24Regular />, onClick: () => setTab("expenses") },
      ]} />

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} className="overflow-x-auto">
        <Tab value="summary">Ringkasan</Tab>
        <Tab value="invoices">Utang & piutang</Tab>
        <Tab value="expenses">Biaya</Tab>
        <Tab value="journal">Jurnal</Tab>
      </TabList>

      {tab === "summary" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
          <SectionPanel title="Arus kas empat minggu" description="Perbandingan kas masuk dan kas keluar operasional.">
            <FinanceChart />
          </SectionPanel>
          <SectionPanel title="Perlu perhatian" description="Prioritas keuangan hari ini.">
            <div className="space-y-3">
              {[
                { title: "Piutang CV Mitra Niaga", detail: "Terlambat 2 hari", value: formatCurrency(12400000), status: "Jatuh Tempo" },
                { title: "Tagihan tepung", detail: "Jatuh tempo 26 Agustus", value: formatCurrency(6875000), status: "Belum Bayar" },
                { title: "Biaya perlengkapan POS", detail: "Menunggu keputusan Owner", value: formatCurrency(780000), status: "Menunggu" },
              ].map((item) => (
                <button key={item.title} type="button" className="focus-ring w-full rounded-xl border border-[var(--app-border)] p-3.5 text-left transition-colors hover:bg-[var(--app-surface-2)]" onClick={() => setTab(item.title.includes("Biaya") ? "expenses" : "invoices")}>
                  <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{item.title}</p><StatusBadge status={item.status} /></div>
                  <p className="mt-2 text-xs text-[var(--app-text-muted)]">{item.detail}</p>
                  <p className="tabular mt-1 text-sm font-semibold">{item.value}</p>
                </button>
              ))}
            </div>
          </SectionPanel>
        </div>
      ) : null}

      {tab === "invoices" ? <SectionPanel noPadding><DataTable data={invoices} columns={invoiceColumns} searchPlaceholder="Cari nomor, pihak, atau sumber..." /></SectionPanel> : null}
      {tab === "expenses" ? <SectionPanel noPadding><DataTable data={expenses} columns={expenseColumns} searchPlaceholder="Cari biaya, penerima, atau departemen..." /></SectionPanel> : null}
      {tab === "journal" ? (
        <SectionPanel title="Jurnal umum" description="Pencatatan debit dan kredit dari transaksi modul terkait." noPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[var(--app-surface-2)] text-[11px] uppercase tracking-[0.08em] text-[var(--app-text-muted)]"><tr><th className="px-4 py-2.5">Nomor</th><th className="px-4 py-2.5">Tanggal</th><th className="px-4 py-2.5">Akun</th><th className="px-4 py-2.5">Keterangan</th><th className="px-4 py-2.5 text-right">Debit</th><th className="px-4 py-2.5 text-right">Kredit</th></tr></thead>
              <tbody>{journalEntries.map((entry) => <tr key={entry.id} className="interactive-row border-b border-[var(--app-border)] last:border-0"><td className="px-4 py-3 font-mono text-xs font-semibold">{entry.id}</td><td className="px-4 py-3">{formatDate(entry.date)}</td><td className="px-4 py-3">{entry.account}</td><td className="px-4 py-3 text-[var(--app-text-muted)]">{entry.description}</td><td className="tabular px-4 py-3 text-right">{entry.debit ? formatCurrency(entry.debit) : "-"}</td><td className="tabular px-4 py-3 text-right">{entry.credit ? formatCurrency(entry.credit) : "-"}</td></tr>)}</tbody>
              <tfoot className="bg-[var(--app-surface-2)] font-semibold"><tr><td colSpan={4} className="px-4 py-3">Total seimbang</td><td className="tabular px-4 py-3 text-right">{formatCurrency(journalEntries.reduce((sum, item) => sum + item.debit, 0))}</td><td className="tabular px-4 py-3 text-right">{formatCurrency(journalEntries.reduce((sum, item) => sum + item.credit, 0))}</td></tr></tfoot>
            </table>
          </div>
        </SectionPanel>
      ) : null}

      <Dialog open={expenseOpen} onOpenChange={(_, data) => setExpenseOpen(data.open)}>
        <DialogSurface><DialogBody><DialogTitle>Catat biaya baru</DialogTitle><DialogContent className="space-y-4">
          <Field label="Departemen"><Select value={department} onChange={(event) => setDepartment(event.target.value)}><option>Produksi</option><option>Gudang</option><option>Penjualan</option><option>Purchasing</option><option>HR & Finance</option></Select></Field>
          <Field label="Kategori"><Select value={category} onChange={(event) => setCategory(event.target.value)}><option>Operasional</option><option>Produksi</option><option>Perawatan</option><option>Distribusi</option><option>Utilitas</option></Select></Field>
          <Field label="Penerima"><Input value={payee} onChange={(_, data) => setPayee(data.value)} placeholder="Nama vendor atau penerima" /></Field>
          <Field label="Nilai"><Input type="number" min="1" value={expenseAmount} onChange={(_, data) => setExpenseAmount(data.value)} /></Field>
          <p className="rounded-lg bg-[var(--app-surface-2)] p-3 text-xs text-[var(--app-text-muted)]">Biaya di atas Rp500.000 otomatis dikirim ke antrean persetujuan Owner.</p>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setExpenseOpen(false)}>Batal</Button><Button appearance="primary" disabled={!payee.trim() || Number(expenseAmount) <= 0} onClick={() => { addExpense(department, category, payee.trim(), Number(expenseAmount)); setExpenseOpen(false); setPayee(""); setExpenseAmount(""); toast("Biaya dicatat", Number(expenseAmount) > 500000 ? "Permintaan persetujuan telah dibuat." : "Biaya langsung berstatus disetujui."); }}>Simpan</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>

      <Dialog open={Boolean(paymentInvoice)} onOpenChange={(_, data) => { if (!data.open) setPaymentInvoice(null); }}>
        <DialogSurface><DialogBody><DialogTitle>Catat pembayaran</DialogTitle><DialogContent className="space-y-4">
          <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm"><p className="font-medium">{paymentInvoice?.party}</p><p className="mt-1 font-mono text-xs text-[var(--app-text-muted)]">{paymentInvoice?.number}</p></div>
          <Field label="Jumlah pembayaran"><Input type="number" min="1" max={paymentInvoice ? paymentInvoice.total - paymentInvoice.paid : undefined} value={paymentAmount} onChange={(_, data) => setPaymentAmount(data.value)} /></Field>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setPaymentInvoice(null)}>Batal</Button><Button appearance="primary" disabled={!paymentInvoice || Number(paymentAmount) <= 0 || Number(paymentAmount) > (paymentInvoice.total - paymentInvoice.paid)} onClick={() => { if (!paymentInvoice) return; payInvoice(paymentInvoice.id, Number(paymentAmount)); toast("Pembayaran dicatat", `${paymentInvoice.number} telah diperbarui.`); setPaymentInvoice(null); }}>Simpan pembayaran</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>
    </div>
  );
}
