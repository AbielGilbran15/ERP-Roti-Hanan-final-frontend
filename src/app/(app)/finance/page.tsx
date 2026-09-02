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
  BuildingFactory24Regular,
  Money24Regular,
  ReceiptMoney24Regular,
} from "@fluentui/react-icons";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ChartLoading } from "@/components/charts/chart-loading";
import { FinanceEntryDialog, type FinanceEntryKind } from "@/components/finance/finance-entry-dialog";
import { useAppToast } from "@/components/ui/app-toast";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { localDateKey } from "@/lib/date";
import { calculateMonthlyOperatingProfit } from "@/lib/finance";
import { useMetricSection } from "@/hooks/use-metric-section";
import type { CashTransaction, CostOfGoodsSold, Expense, Invoice, SalesReturn } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

const financeMetricSections = {
  "finance-summary": "summary",
  "finance-profit": "summary",
  "finance-cash": "cash",
  "finance-invoices": "invoices",
  "finance-returns": "returns",
  "finance-costs": "costs",
  "finance-journal": "journal",
} as const;

const FinanceChart = dynamic(
  () => import("@/components/charts/finance-chart").then((module) => module.FinanceChart),
  { ssr: false, loading: () => <ChartLoading /> },
);

type JournalRow = {
  id: string;
  date: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
};

export default function FinancePage() {
  const [tab, setTab] = useState("summary");
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryKind, setEntryKind] = useState<FinanceEntryKind>("cash-in");
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentExpense, setPaymentExpense] = useState<Expense | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [refundReturn, setRefundReturn] = useState<SalesReturn | null>(null);
  const [reversalTransaction, setReversalTransaction] = useState<CashTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountKind, setAccountKind] = useState<"Kas" | "Bank">("Kas");
  const invoices = useERPStore((state) => state.invoices);
  const sales = useERPStore((state) => state.sales);
  const expenses = useERPStore((state) => state.expenses);
  const cashAccounts = useERPStore((state) => state.cashAccounts);
  const cashTransactions = useERPStore((state) => state.cashTransactions);
  const salesReturns = useERPStore((state) => state.salesReturns);
  const costOfGoodsSold = useERPStore((state) => state.costOfGoodsSold);
  const payrolls = useERPStore((state) => state.payrolls);
  const payInvoice = useERPStore((state) => state.payInvoice);
  const payExpense = useERPStore((state) => state.payExpense);
  const refundSalesReturn = useERPStore((state) => state.refundSalesReturn);
  const reverseCashTransaction = useERPStore((state) => state.reverseCashTransaction);
  const addCashAccount = useERPStore((state) => state.addCashAccount);
  const [paymentAccountId, setPaymentAccountId] = useState(cashAccounts[0]?.id ?? "");
  const toast = useAppToast();

  useMetricSection(financeMetricSections, setTab);

  const monthKey = localDateKey().slice(0, 7);
  const cashTotal = cashAccounts.reduce((sum, item) => sum + item.balance, 0);
  const receivables = invoices.filter((item) => item.type === "Piutang").reduce((sum, item) => sum + item.total - item.paid, 0);
  const payables = invoices.filter((item) => item.type === "Utang").reduce((sum, item) => sum + item.total - item.paid, 0);
  const monthExpenses = expenses.filter((item) => item.date.startsWith(monthKey)).reduce((sum, item) => sum + item.amount, 0);
  const currentPayrollPeriod = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());
  const profitBreakdown = calculateMonthlyOperatingProfit({
    monthKey,
    payrollPeriod: currentPayrollPeriod,
    sales,
    salesReturns,
    costOfGoodsSold,
    expenses,
    payrolls,
  });
  const {
    grossRevenue: monthGrossRevenue,
    returns: monthReturns,
    netRevenue: monthNetRevenue,
    hpp: monthHpp,
    postedExpenses: monthPostedExpenses,
    payroll: monthPayroll,
    profit: companyProfit,
  } = profitBreakdown;
  const monthCashIn = cashTransactions.filter((item) => item.date.startsWith(monthKey) && item.direction === "Masuk").reduce((sum, item) => sum + item.amount, 0);
  const monthCashOut = cashTransactions.filter((item) => item.date.startsWith(monthKey) && item.direction === "Keluar").reduce((sum, item) => sum + item.amount, 0);

  const openEntry = (kind: FinanceEntryKind) => {
    setEntryKind(kind);
    setEntryOpen(true);
  };

  const openPayment = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount(String(invoice.total - invoice.paid));
    setPaymentAccountId(cashAccounts[0]?.id ?? "");
  };

  const openExpensePayment = (expense: Expense) => {
    setPaymentExpense(expense);
    setPaymentAccountId(cashAccounts[0]?.id ?? "");
  };

  const invoiceColumns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      { header: "Tagihan", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Jenis", accessorKey: "type" },
      { header: "Pihak", accessorKey: "party" },
      { header: "Jatuh tempo", accessorKey: "dueDate", cell: ({ getValue }) => formatDate(String(getValue())) },
      { header: "Total", accessorKey: "total", cell: ({ getValue }) => <span className="tabular">{formatCurrency(Number(getValue()))}</span> },
      { header: "Sisa", accessorFn: (row) => row.total - row.paid, cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      { id: "action", header: "Tindakan", cell: ({ row }) => row.original.status !== "Lunas" ? <Button size="small" appearance="primary" onClick={() => openPayment(row.original)}>Catat bayar</Button> : null },
    ],
    [cashAccounts],
  );

  const expenseColumns = useMemo<ColumnDef<Expense>[]>(
    () => [
      { header: "Nomor", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Tanggal", accessorKey: "date", cell: ({ getValue }) => formatDate(String(getValue())) },
      { header: "Departemen", accessorKey: "department" },
      { header: "Kategori", accessorKey: "category" },
      { header: "Penerima", accessorKey: "payee" },
      { header: "Nilai", accessorKey: "amount", cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: "action", header: "Tindakan", cell: ({ row }) => row.original.status === "Disetujui" ? <Button size="small" appearance="primary" onClick={() => openExpensePayment(row.original)}>Bayar biaya</Button> : row.original.status === "Dibayar" ? <span className="text-xs text-[var(--app-text-muted)]">Sudah dibayar</span> : null },
    ],
    [cashAccounts],
  );

  const cashColumns = useMemo<ColumnDef<CashTransaction>[]>(
    () => [
      { header: "Nomor", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Tanggal", accessorKey: "date", cell: ({ getValue }) => formatDate(String(getValue())) },
      { header: "Akun", accessorFn: (row) => cashAccounts.find((account) => account.id === row.accountId)?.name ?? "Akun tidak ditemukan" },
      { header: "Arah", accessorKey: "direction", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      { header: "Keterangan", accessorKey: "description" },
      { header: "Sumber", accessorKey: "source", cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
      { header: "Nilai", accessorKey: "amount", cell: ({ row, getValue }) => <span className={`tabular font-semibold ${row.original.direction === "Masuk" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{row.original.direction === "Masuk" ? "+" : "-"}{formatCurrency(Number(getValue()))}</span> },
      { header: "Status", accessorFn: (row) => row.status ?? "Aktif", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      { id: "action", header: "Tindakan", cell: ({ row }) => (row.original.status ?? "Aktif") === "Aktif" && !row.original.reversesTransactionId ? <Button size="small" appearance="subtle" onClick={() => { setReversalTransaction(row.original); setReversalReason(""); }}>Reversal</Button> : null },
    ],
    [cashAccounts],
  );

  const returnColumns = useMemo<ColumnDef<SalesReturn>[]>(() => [
    { header: "Retur", accessorKey: "number", cell: ({ row }) => <div><p className="font-mono text-xs font-semibold">{row.original.number}</p><p className="mt-0.5 font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.saleNumber}</p></div> },
    { header: "Tanggal", accessorKey: "createdAt", cell: ({ getValue }) => formatDate(String(getValue())) },
    { header: "Barang", accessorFn: (row) => row.items.reduce((sum, item) => sum + item.quantity, 0), cell: ({ row }) => `${row.original.items.length} jenis · ${row.original.items.reduce((sum, item) => sum + item.quantity, 0)} unit` },
    { header: "Nilai retur", accessorKey: "returnValue", cell: ({ getValue }) => <span className="tabular">{formatCurrency(Number(getValue()))}</span> },
    { header: "Refund", accessorKey: "refundAmount", cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span> },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { id: "action", header: "Tindakan", cell: ({ row }) => row.original.status === "Menunggu Refund" ? <Button size="small" appearance="primary" onClick={() => { setRefundReturn(row.original); setPaymentAccountId(cashAccounts[0]?.id ?? ""); }}>Bayar refund</Button> : null },
  ], [cashAccounts]);

  const hppColumns = useMemo<ColumnDef<CostOfGoodsSold>[]>(
    () => [
      { header: "Nomor", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Tanggal", accessorKey: "date", cell: ({ getValue }) => formatDate(String(getValue())) },
      { header: "Sumber", accessorKey: "source", cell: ({ row }) => <div><StatusBadge status={row.original.source ?? "Data lama"} />{row.original.reference ? <p className="mt-1 font-mono text-[11px] text-[var(--app-text-muted)]">{row.original.reference}</p> : null}</div> },
      { header: "Produk jadi", accessorKey: "productNameSnapshot" },
      { header: "Jumlah", accessorKey: "quantity", cell: ({ getValue }) => <span className="tabular">{Number(getValue()).toLocaleString("id-ID")}</span> },
      { header: "HPP / unit", accessorKey: "unitCost", cell: ({ getValue }) => <span className="tabular">{formatCurrency(Number(getValue()))}</span> },
      { header: "Total HPP", accessorKey: "amount", cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span> },
    ],
    [],
  );

  const journalEntries = useMemo<JournalRow[]>(() => {
    const cashRows: JournalRow[] = cashTransactions.flatMap((transaction) => {
      const account = cashAccounts.find((item) => item.id === transaction.accountId)?.name ?? "Kas / Bank";
      const counterpart = transaction.direction === "Masuk" ? "Penerimaan / akun lawan" : "Pembayaran / akun lawan";
      return transaction.direction === "Masuk"
        ? [
            { id: `${transaction.id}-debit`, date: transaction.date, account, description: transaction.description, debit: transaction.amount, credit: 0 },
            { id: `${transaction.id}-credit`, date: transaction.date, account: counterpart, description: transaction.description, debit: 0, credit: transaction.amount },
          ]
        : [
            { id: `${transaction.id}-debit`, date: transaction.date, account: counterpart, description: transaction.description, debit: transaction.amount, credit: 0 },
            { id: `${transaction.id}-credit`, date: transaction.date, account, description: transaction.description, debit: 0, credit: transaction.amount },
          ];
    });
    const hppRows: JournalRow[] = costOfGoodsSold.flatMap((cost) => cost.amount >= 0
      ? [
          { id: `${cost.id}-debit`, date: cost.date, account: `HPP - ${cost.productNameSnapshot}`, description: cost.description ?? `HPP penjualan ${cost.productNameSnapshot}`, debit: cost.amount, credit: 0 },
          { id: `${cost.id}-credit`, date: cost.date, account: "Persediaan produk jadi", description: cost.description ?? `HPP penjualan ${cost.productNameSnapshot}`, debit: 0, credit: cost.amount },
        ]
      : [
          { id: `${cost.id}-debit`, date: cost.date, account: "Persediaan produk jadi", description: cost.description ?? `Pembalik HPP ${cost.productNameSnapshot}`, debit: Math.abs(cost.amount), credit: 0 },
          { id: `${cost.id}-credit`, date: cost.date, account: `HPP - ${cost.productNameSnapshot}`, description: cost.description ?? `Pembalik HPP ${cost.productNameSnapshot}`, debit: 0, credit: Math.abs(cost.amount) },
        ]);
    return [...cashRows, ...hppRows].sort((a, b) => b.date.localeCompare(a.date));
  }, [cashAccounts, cashTransactions, costOfGoodsSold]);

  const attentionItems = [
    ...invoices.filter((item) => item.status !== "Lunas").sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 2).map((item) => ({ id: item.id, title: `${item.type} · ${item.party}`, detail: `Jatuh tempo ${formatDate(item.dueDate)}`, value: formatCurrency(item.total - item.paid), status: item.status, target: "invoices" })),
    ...expenses.filter((item) => item.status === "Disetujui").slice(0, 1).map((item) => ({ id: item.id, title: `Biaya siap dibayar · ${item.payee}`, detail: `${item.department} · ${item.category}`, value: formatCurrency(item.amount), status: item.status, target: "costs" })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Keuangan & Kas"
        description="Kelola saldo kas dan bank, utang-piutang, biaya, HPP, serta jejak jurnal pusat Bandung. Akses khusus Owner dan Admin HR/Finance."
        actions={<Button appearance="primary" icon={<Add20Regular />} onClick={() => openEntry("cash-in")}>Catat transaksi</Button>}
      />

      <MetricStrip
        className="finance-metric-strip"
        items={[
          { label: "Profit perusahaan", value: formatCurrency(companyProfit), detail: "Pendapatan bersih − HPP − biaya − payroll", trend: companyProfit >= 0 ? "up" : "down", icon: <ArrowTrending24Regular />, onClick: () => setTab("summary"), targetId: "finance-profit", actionLabel: "Buka rincian profit perusahaan" },
          { label: "Kas & bank", value: formatCurrency(cashTotal), detail: `${cashAccounts.length} akun aktif`, trend: "neutral", icon: <BuildingBank24Regular />, onClick: () => setTab("cash"), targetId: "finance-cash", actionLabel: "Buka kas dan bank" },
          { label: "Piutang usaha", value: formatCurrency(receivables), detail: "Sisa yang perlu ditagih", trend: receivables ? "down" : "neutral", icon: <ReceiptMoney24Regular />, onClick: () => setTab("invoices"), targetId: "finance-invoices", actionLabel: "Buka piutang usaha" },
          { label: "Utang usaha", value: formatCurrency(payables), detail: "Belum dibayar ke supplier", trend: payables ? "down" : "neutral", icon: <Money24Regular />, onClick: () => setTab("invoices"), targetId: "finance-invoices", actionLabel: "Buka utang usaha" },
          { label: "Biaya bulan ini", value: formatCurrency(monthExpenses), detail: "Seluruh biaya yang dicatat", trend: "neutral", icon: <Money24Regular />, onClick: () => setTab("costs"), targetId: "finance-costs", actionLabel: "Buka biaya bulan ini" },
          { label: "HPP bulan ini", value: formatCurrency(monthHpp), detail: "Penjualan produk jadi", trend: "neutral", icon: <BuildingFactory24Regular />, onClick: () => setTab("costs"), targetId: "finance-costs", actionLabel: "Buka HPP bulan ini" },
        ]}
      />

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} className="overflow-x-auto">
        <Tab value="summary">Ringkasan</Tab><Tab value="cash">Kas & bank</Tab><Tab value="invoices">Utang & piutang</Tab><Tab value="returns">Retur & refund</Tab><Tab value="costs">Biaya & HPP</Tab><Tab value="journal">Jurnal</Tab>
      </TabList>

      {tab === "summary" ? (
        <div id="finance-summary" className="scroll-mt-24 space-y-5">
          <SectionPanel id="finance-profit" title="Profit perusahaan bulan berjalan" description="Profit operasional dihitung dari transaksi yang sudah selesai dan biaya yang sudah disetujui atau dibayar.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                { label: "Penjualan selesai", value: monthGrossRevenue, tone: "text-[var(--app-text)]" },
                { label: "Retur penjualan", value: -monthReturns, tone: "text-red-700 dark:text-red-300" },
                { label: "Pendapatan bersih", value: monthNetRevenue, tone: "text-[var(--app-text)]" },
                { label: "HPP + biaya", value: -(monthHpp + monthPostedExpenses), tone: "text-red-700 dark:text-red-300" },
                { label: "Payroll terposting", value: -monthPayroll, tone: "text-red-700 dark:text-red-300" },
                { label: "Profit operasional", value: companyProfit, tone: companyProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300" },
              ].map((item) => <div key={item.label} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)]/45 p-4"><p className="text-xs text-[var(--app-text-muted)]">{item.label}</p><p className={`tabular mt-2 text-lg font-semibold ${item.tone}`}>{formatCurrency(item.value)}</p></div>)}
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--app-text-muted)]">Rumus: penjualan selesai − nilai retur − HPP − biaya berstatus Disetujui/Dibayar − payroll periode berjalan berstatus Disetujui/Dibayar/Dikunci. Angka mengikuti data yang sudah diposting di aplikasi; payroll Draft belum dihitung.</p>
          </SectionPanel>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
          <SectionPanel title="Arus kas bulan berjalan" description={`Kas masuk ${formatCurrency(monthCashIn)} · kas keluar ${formatCurrency(monthCashOut)}.`}><FinanceChart transactions={cashTransactions} /></SectionPanel>
          <SectionPanel title="Perlu perhatian" description="Tagihan dan biaya yang paling dekat dengan tindakan.">
            <div className="space-y-3">
              {attentionItems.length ? attentionItems.map((item) => (
                <button key={item.id} type="button" className="focus-ring w-full rounded-xl border border-[var(--app-border)] p-3.5 text-left transition-colors hover:bg-[var(--app-surface-2)]" onClick={() => setTab(item.target)}>
                  <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{item.title}</p><StatusBadge status={item.status} /></div><p className="mt-2 text-xs text-[var(--app-text-muted)]">{item.detail}</p><p className="tabular mt-1 text-sm font-semibold">{item.value}</p>
                </button>
              )) : <p className="text-sm text-[var(--app-text-muted)]">Tidak ada transaksi yang memerlukan perhatian.</p>}
            </div>
          </SectionPanel>
          </div>
        </div>
      ) : null}

      {tab === "cash" ? (
        <div className="space-y-5">
          <SectionPanel id="finance-cash" title="Saldo akun" description="Saldo berubah otomatis ketika mutasi atau pembayaran invoice diposting." action={<div className="flex flex-wrap gap-2"><Button size="small" icon={<Add20Regular />} onClick={() => { setAccountName(""); setAccountKind("Kas"); setAccountDialogOpen(true); }}>Tambah akun</Button><Button size="small" onClick={() => openEntry("cash-in")}>Kas masuk</Button><Button size="small" onClick={() => openEntry("cash-out")}>Kas keluar</Button></div>}>
            <div className="grid gap-3 md:grid-cols-3">
              {cashAccounts.map((account) => <div key={account.id} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{account.name}</p><StatusBadge status={account.kind} /></div><p className="tabular mt-4 text-xl font-semibold">{formatCurrency(account.balance)}</p><p className="mt-1 text-xs text-[var(--app-text-muted)]">Diperbarui {formatDate(account.updatedAt)}</p></div>)}
            </div>
          </SectionPanel>
          <SectionPanel title="Mutasi kas dan bank" description="Penerimaan dan pembayaran tersimpan sebagai ledger yang tidak dihapus." noPadding><DataTable data={cashTransactions} columns={cashColumns} searchPlaceholder="Cari akun, sumber, atau keterangan..." /></SectionPanel>
        </div>
      ) : null}

      {tab === "invoices" ? (
        <SectionPanel id="finance-invoices" title="Utang dan piutang usaha" description="Catat tagihan baru atau alokasikan pembayaran ke akun kas/bank." action={<div className="flex flex-wrap gap-2"><Button size="small" onClick={() => openEntry("receivable")}>Tambah piutang</Button><Button size="small" onClick={() => openEntry("payable")}>Tambah utang</Button></div>} noPadding>
          <DataTable data={invoices} columns={invoiceColumns} searchPlaceholder="Cari nomor, pihak, atau sumber..." />
        </SectionPanel>
      ) : null}

      {tab === "returns" ? <SectionPanel id="finance-returns" title="Retur dan refund penjualan" description="Barang retur telah diposting oleh Gudang; refund dibayar dari akun kas/bank dan tercatat pada ledger." noPadding><DataTable data={salesReturns} columns={returnColumns} searchPlaceholder="Cari nomor retur atau transaksi asal..." emptyTitle="Belum ada retur" emptyDescription="Retur yang diterima dari modul pemenuhan akan tampil di sini." /></SectionPanel> : null}

      {tab === "costs" ? (
        <div id="finance-costs" className="scroll-mt-24 space-y-5">
          <SectionPanel title="Harga pokok penjualan" description="HPP dibuat otomatis saat transaksi berstatus Selesai: jumlah terjual × HPP per unit pada Master Barang Jadi. Retur membuat pembalik HPP otomatis." action={<Button size="small" onClick={() => openEntry("hpp")}>Koreksi HPP manual</Button>} noPadding>
            <div className="border-b border-[var(--app-border)] bg-[var(--app-surface-2)]/45 px-4 py-3 text-xs leading-5 text-[var(--app-text-muted)] md:px-5">Input manual hanya digunakan untuk koreksi akuntansi dengan alasan yang jelas. Penjualan normal tidak perlu diinput ulang karena sudah terhubung langsung ke transaksi asal.</div>
            <DataTable data={costOfGoodsSold} columns={hppColumns} searchPlaceholder="Cari transaksi, produk jadi, atau nomor HPP..." />
          </SectionPanel>
          <SectionPanel title="Biaya operasional" description="Staff Finance berwenang dapat mencatat biaya dan langsung melanjutkan pembayaran." action={<Button size="small" onClick={() => openEntry("expense")}>Tambah biaya</Button>} noPadding><DataTable data={expenses} columns={expenseColumns} searchPlaceholder="Cari biaya, penerima, atau departemen..." /></SectionPanel>
        </div>
      ) : null}

      {tab === "journal" ? (
        <SectionPanel id="finance-journal" title="Jurnal umum" description="Pasangan debit-kredit dibentuk dari mutasi kas/bank dan pencatatan HPP." noPadding>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[var(--app-surface-2)] text-[11px] uppercase tracking-[0.08em] text-[var(--app-text-muted)]"><tr><th className="px-4 py-2.5">Nomor</th><th className="px-4 py-2.5">Tanggal</th><th className="px-4 py-2.5">Akun</th><th className="px-4 py-2.5">Keterangan</th><th className="px-4 py-2.5 text-right">Debit</th><th className="px-4 py-2.5 text-right">Kredit</th></tr></thead>
            <tbody>{journalEntries.map((entry) => <tr key={entry.id} className="interactive-row border-b border-[var(--app-border)] last:border-0"><td className="px-4 py-3 font-mono text-xs font-semibold">{entry.id}</td><td className="px-4 py-3">{formatDate(entry.date)}</td><td className="px-4 py-3">{entry.account}</td><td className="px-4 py-3 text-[var(--app-text-muted)]">{entry.description}</td><td className="tabular px-4 py-3 text-right">{entry.debit ? formatCurrency(entry.debit) : "-"}</td><td className="tabular px-4 py-3 text-right">{entry.credit ? formatCurrency(entry.credit) : "-"}</td></tr>)}</tbody>
            <tfoot className="bg-[var(--app-surface-2)] font-semibold"><tr><td colSpan={4} className="px-4 py-3">Total seimbang</td><td className="tabular px-4 py-3 text-right">{formatCurrency(journalEntries.reduce((sum, item) => sum + item.debit, 0))}</td><td className="tabular px-4 py-3 text-right">{formatCurrency(journalEntries.reduce((sum, item) => sum + item.credit, 0))}</td></tr></tfoot>
          </table></div>
        </SectionPanel>
      ) : null}

      <FinanceEntryDialog open={entryOpen} initialKind={entryKind} onOpenChange={setEntryOpen} />

      <Dialog open={accountDialogOpen} onOpenChange={(_, data) => setAccountDialogOpen(data.open)}>
        <DialogSurface><DialogBody><DialogTitle>Tambah akun kas atau bank</DialogTitle><DialogContent className="space-y-4">
          <Field label="Nama kas atau bank" required><Input autoFocus value={accountName} onChange={(_, data) => setAccountName(data.value)} placeholder="Contoh: Kas Cabang Cimahi" /></Field>
          <Field label="Jenis akun" required><Select value={accountKind} onChange={(event) => setAccountKind(event.target.value as "Kas" | "Bank")}><option value="Kas">Kas</option><option value="Bank">Bank</option></Select></Field>
          <p className="text-xs text-[var(--app-text-muted)]">Akun baru dibuat dengan saldo awal Rp 0. Tambahkan saldo melalui Kas masuk agar tercatat pada mutasi.</p>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setAccountDialogOpen(false)}>Batal</Button><Button appearance="primary" disabled={!accountName.trim()} onClick={() => {
          try { const account = addCashAccount(accountName, accountKind); toast("Akun ditambahkan", `${account.name} siap digunakan untuk transaksi.`); setAccountDialogOpen(false); }
          catch (error) { toast("Akun belum dapat ditambahkan", error instanceof Error ? error.message : "Periksa nama dan jenis akun.", "error"); }
        }}>Simpan akun</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>

      <Dialog open={Boolean(paymentInvoice)} onOpenChange={(_, data) => { if (!data.open) setPaymentInvoice(null); }}>
        <DialogSurface><DialogBody><DialogTitle>Catat pembayaran {paymentInvoice?.type.toLowerCase()}</DialogTitle><DialogContent className="space-y-4">
          <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm"><p className="font-medium">{paymentInvoice?.party}</p><p className="mt-1 font-mono text-xs text-[var(--app-text-muted)]">{paymentInvoice?.number}</p></div>
          <Field label={paymentInvoice?.type === "Piutang" ? "Terima ke akun" : "Bayar dari akun"}><Select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)}>{cashAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatCurrency(account.balance)}</option>)}</Select></Field>
          <Field label="Jumlah pembayaran"><Input type="number" min="1" max={paymentInvoice ? paymentInvoice.total - paymentInvoice.paid : undefined} value={paymentAmount} onChange={(_, data) => setPaymentAmount(data.value)} contentBefore="Rp" /></Field>
          <p className="text-xs text-[var(--app-text-muted)]">Pembayaran piutang menambah saldo akun. Pembayaran utang mengurangi saldo akun.</p>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setPaymentInvoice(null)}>Batal</Button><Button appearance="primary" disabled={!paymentInvoice || !paymentAccountId || Number(paymentAmount) <= 0 || Number(paymentAmount) > (paymentInvoice.total - paymentInvoice.paid)} onClick={() => {
          if (!paymentInvoice) return;
          try { payInvoice(paymentInvoice.id, Number(paymentAmount), paymentAccountId); toast("Pembayaran dicatat", `${paymentInvoice.number} dan saldo kas/bank telah diperbarui.`); setPaymentInvoice(null); }
          catch (error) { toast("Pembayaran tidak dapat dicatat", error instanceof Error ? error.message : "Periksa saldo dan nilai pembayaran.", "error"); }
        }}>Simpan pembayaran</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>

      <Dialog open={Boolean(paymentExpense)} onOpenChange={(_, data) => { if (!data.open) setPaymentExpense(null); }}>
        <DialogSurface><DialogBody><DialogTitle>Bayar biaya operasional</DialogTitle><DialogContent className="space-y-4">
          <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm"><p className="font-medium">{paymentExpense?.category} · {paymentExpense?.payee}</p><p className="mt-1 font-mono text-xs text-[var(--app-text-muted)]">{paymentExpense?.number} · {formatCurrency(paymentExpense?.amount ?? 0)}</p></div>
          <Field label="Bayar dari akun"><Select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)}>{cashAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatCurrency(account.balance)}</option>)}</Select></Field>
          <p className="text-xs text-[var(--app-text-muted)]">Pembayaran akan membuat mutasi kas/bank keluar dan mengunci biaya sebagai Dibayar.</p>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setPaymentExpense(null)}>Batal</Button><Button appearance="primary" disabled={!paymentExpense || !paymentAccountId} onClick={() => { if (!paymentExpense) return; try { payExpense(paymentExpense.id, paymentAccountId); toast("Biaya dibayar", `${paymentExpense.number} dan saldo kas/bank telah diperbarui.`); setPaymentExpense(null); } catch (error) { toast("Biaya belum dapat dibayar", error instanceof Error ? error.message : "Periksa saldo akun.", "error"); } }}>Bayar</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>

      <Dialog open={Boolean(refundReturn)} onOpenChange={(_, data) => { if (!data.open) setRefundReturn(null); }}>
        <DialogSurface><DialogBody><DialogTitle>Bayar refund penjualan</DialogTitle><DialogContent className="space-y-4">
          <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm"><p className="font-mono font-semibold">{refundReturn?.number}</p><p className="mt-1">Refund {formatCurrency(refundReturn?.refundAmount ?? 0)}</p></div>
          <Field label="Bayar dari akun"><Select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)}>{cashAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatCurrency(account.balance)}</option>)}</Select></Field>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setRefundReturn(null)}>Batal</Button><Button appearance="primary" disabled={!refundReturn || !paymentAccountId} onClick={() => { if (!refundReturn) return; try { refundSalesReturn(refundReturn.id, paymentAccountId); toast("Refund dibayar", `${refundReturn.number} telah selesai.`); setRefundReturn(null); } catch (error) { toast("Refund belum dapat dibayar", error instanceof Error ? error.message : "Periksa saldo akun.", "error"); } }}>Bayar refund</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>

      <Dialog open={Boolean(reversalTransaction)} onOpenChange={(_, data) => { if (!data.open) setReversalTransaction(null); }}>
        <DialogSurface><DialogBody><DialogTitle>Balik transaksi kas/bank</DialogTitle><DialogContent className="space-y-4">
          <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-sm"><p className="font-mono font-semibold">{reversalTransaction?.number}</p><p className="mt-1">{reversalTransaction?.description} · {formatCurrency(reversalTransaction?.amount ?? 0)}</p></div>
          <Field label="Alasan reversal" required><Input value={reversalReason} onChange={(_, data) => setReversalReason(data.value)} placeholder="Contoh: salah akun pembayaran" /></Field>
          <p className="text-xs text-[var(--app-text-muted)]">Transaksi asal tidak dihapus. Sistem membuat transaksi pembalik dan memulihkan dokumen sumber jika relevan.</p>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setReversalTransaction(null)}>Batal</Button><Button appearance="primary" disabled={!reversalTransaction || !reversalReason.trim()} onClick={() => { if (!reversalTransaction) return; try { const reversal = reverseCashTransaction(reversalTransaction.id, reversalReason); toast("Reversal diposting", `${reversal.number} dibuat tanpa menghapus transaksi asal.`); setReversalTransaction(null); } catch (error) { toast("Transaksi belum dapat dibalik", error instanceof Error ? error.message : "Periksa transaksi dan saldo akun.", "error"); } }}>Posting reversal</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>
    </div>
  );
}
