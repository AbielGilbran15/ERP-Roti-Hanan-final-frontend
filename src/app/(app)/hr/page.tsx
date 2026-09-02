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
  CalendarClock24Regular,
  Clock24Regular,
  Money24Regular,
  People24Regular,
} from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { useAppToast } from "@/components/ui/app-toast";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { Employee, Payroll } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";
import { useMetricSection } from "@/hooks/use-metric-section";

const hrMetricSections = {
  "hr-employees": "employees",
  "hr-attendance": "attendance",
  "hr-payroll": "payroll",
  "hr-training": "training",
} as const;

const trainingRecords = [
  { employee: "Aulia Rahman", topic: "Keselamatan oven dan gas", dueDate: "2026-08-29", status: "Dijadwalkan" },
  { employee: "Dedi Supriadi", topic: "GMP area produksi", dueDate: "2026-08-24", status: "Menunggu" },
  { employee: "Fikri Ramadhan", topic: "Kalibrasi alat ukur", dueDate: "2026-08-20", status: "Selesai" },
];

export default function HRPage() {
  const [tab, setTab] = useState("employees");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Produksi");
  const [jobTitle, setJobTitle] = useState("");
  const [employmentType, setEmploymentType] = useState<Employee["employmentType"]>("Kontrak");
  const [basePay, setBasePay] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [payrollPaymentOpen, setPayrollPaymentOpen] = useState(false);
  const [payrollAccountId, setPayrollAccountId] = useState("");
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const employees = useERPStore((state) => state.employees);
  const payrolls = useERPStore((state) => state.payrolls);
  const cashAccounts = useERPStore((state) => state.cashAccounts);
  const addEmployee = useERPStore((state) => state.addEmployee);
  const runPayroll = useERPStore((state) => state.runPayroll);
  const payPayroll = useERPStore((state) => state.payPayroll);
  const lockPayrollPeriod = useERPStore((state) => state.lockPayrollPeriod);
  const toast = useAppToast();
  useMetricSection(hrMetricSections, setTab);

  const attendanceIssues = employees.filter((employee) => employee.attendanceStatus !== "Hadir").length;
  const totalOvertime = employees.reduce((sum, employee) => sum + employee.overtimeHours, 0);
  const payrollTotal = payrolls.reduce((sum, payroll) => sum + payroll.netPay, 0);
  const payrollPeriod = payrolls[0]?.period ?? "Periode payroll";
  const selectedPayslip = payrolls.find((item) => item.id === selectedPayslipId);
  const selectedPayslipEmployee = employees.find((item) => item.id === selectedPayslip?.employeeId);

  const downloadPayslip = (payroll: Payroll) => {
    const employee = employees.find((item) => item.id === payroll.employeeId);
    const content = [
      "ROTI HANAN — SLIP GAJI",
      `Nomor: ${payroll.payslipNumber ?? payroll.id}`,
      `Periode: ${payroll.period}`,
      `Karyawan: ${employee?.name ?? payroll.employeeId}`,
      `NIK: ${employee?.number ?? "-"}`,
      `Bruto: ${formatCurrency(payroll.grossPay)}`,
      `Potongan: ${formatCurrency(payroll.deductions)}`,
      `Dibayarkan: ${formatCurrency(payroll.netPay)}`,
      `Tanggal bayar: ${payroll.paidAt ? formatDate(payroll.paidAt) : "-"}`,
      `Status: ${payroll.status}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payroll.payslipNumber ?? payroll.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const employeeColumns = useMemo<ColumnDef<Employee>[]>(
    () => [
      { header: "NIK", accessorKey: "number", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Nama", accessorKey: "name", cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-[var(--app-text-muted)]">{row.original.jobTitle}</p></div> },
      { header: "Departemen", accessorKey: "department" },
      { header: "Status kerja", accessorKey: "employmentType", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      { header: "Gaji pokok", accessorKey: "basePay", cell: ({ getValue }) => <span className="tabular">{Number(getValue()) ? formatCurrency(Number(getValue())) : "-"}</span> },
      { header: "Kontrak berakhir", accessorKey: "contractEnd", cell: ({ getValue }) => getValue() ? formatDate(String(getValue())) : "-" },
    ],
    [],
  );

  const payrollColumns = useMemo<ColumnDef<Payroll>[]>(
    () => [
      { header: "Karyawan", accessorKey: "employeeId", cell: ({ getValue }) => employees.find((employee) => employee.id === getValue())?.name ?? String(getValue()) },
      { header: "Periode", accessorKey: "period" },
      { header: "Bruto", accessorKey: "grossPay", cell: ({ getValue }) => <span className="tabular">{formatCurrency(Number(getValue()))}</span> },
      { header: "Potongan", accessorKey: "deductions", cell: ({ getValue }) => <span className="tabular text-red-700 dark:text-red-300">{formatCurrency(Number(getValue()))}</span> },
      { header: "Dibayarkan", accessorKey: "netPay", cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      { id: "action", header: "Slip", cell: ({ row }) => row.original.payslipNumber ? <Button size="small" appearance="subtle" onClick={() => setSelectedPayslipId(row.original.id)}>Lihat slip</Button> : <span className="text-xs text-[var(--app-text-muted)]">Belum tersedia</span> },
    ],
    [employees],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="HR & Payroll"
        description="Kelola data karyawan, kehadiran, lembur, kontrak, pelatihan, dan penggajian."
        actions={<Button appearance="primary" icon={<Add20Regular />} onClick={() => setDialogOpen(true)}>Tambah karyawan</Button>}
      />

      <MetricStrip items={[
        { label: "Karyawan aktif", value: String(employees.length), detail: `${employees.filter((item) => item.employmentType === "Tetap").length} karyawan tetap`, trend: "neutral", icon: <People24Regular />, onClick: () => setTab("employees"), targetId: "hr-employees" },
        { label: "Hadir hari ini", value: `${employees.filter((item) => item.attendanceStatus === "Hadir").length}/${employees.length}`, detail: `${attendanceIssues} perlu ditinjau`, trend: attendanceIssues ? "down" : "up", icon: <Clock24Regular />, onClick: () => setTab("attendance"), targetId: "hr-attendance" },
        { label: "Lembur hari ini", value: `${formatNumber(totalOvertime, 1)} jam`, detail: "Akumulasi seluruh bagian", trend: "neutral", icon: <CalendarClock24Regular />, onClick: () => setTab("attendance"), targetId: "hr-attendance" },
        { label: "Payroll Agustus", value: formatCurrency(payrollTotal), detail: payrolls.some((item) => item.status === "Draft") ? "Belum diajukan" : "Sudah diajukan", trend: "neutral", icon: <Money24Regular />, onClick: () => setTab("payroll"), targetId: "hr-payroll" },
      ]} />

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))} className="overflow-x-auto">
        <Tab value="employees">Karyawan</Tab>
        <Tab value="attendance">Kehadiran</Tab>
        <Tab value="payroll">Payroll</Tab>
        <Tab value="training">Pelatihan</Tab>
      </TabList>

      {tab === "employees" ? <SectionPanel id="hr-employees" title="Data karyawan" description="Data induk yang menjadi sumber kehadiran, kontrak, payroll, dan pelatihan." noPadding><DataTable data={employees} columns={employeeColumns} searchPlaceholder="Cari nama, NIK, bagian, atau jabatan..." /></SectionPanel> : null}

      {tab === "attendance" ? (
        <SectionPanel id="hr-attendance" title="Kehadiran hari ini" description={`Ringkasan absensi dan lembur tanggal ${formatDate(new Date().toISOString(), "dd MMMM yyyy")}.`} noPadding>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[var(--app-surface-2)] text-[11px] uppercase tracking-[0.08em] text-[var(--app-text-muted)]"><tr><th className="px-4 py-2.5">Karyawan</th><th className="px-4 py-2.5">Departemen</th><th className="px-4 py-2.5">Masuk</th><th className="px-4 py-2.5">Pulang</th><th className="px-4 py-2.5">Lembur</th><th className="px-4 py-2.5">Kondisi</th></tr></thead><tbody>{employees.map((employee, index) => <tr key={employee.id} className="interactive-row border-b border-[var(--app-border)] last:border-0"><td className="px-4 py-3"><p className="font-medium">{employee.name}</p><p className="text-xs text-[var(--app-text-muted)]">{employee.jobTitle}</p></td><td className="px-4 py-3">{employee.department}</td><td className="tabular px-4 py-3">{employee.attendanceStatus === "Cuti" ? "-" : employee.attendanceStatus === "Terlambat" ? "07:18" : `0${6 + (index % 2)}:${index % 2 ? "02" : "48"}`}</td><td className="tabular px-4 py-3">{employee.attendanceStatus === "Cuti" ? "-" : "Berjalan"}</td><td className="tabular px-4 py-3">{formatNumber(employee.overtimeHours, 1)} jam</td><td className="px-4 py-3"><StatusBadge status={employee.attendanceStatus} /></td></tr>)}</tbody></table></div>
        </SectionPanel>
      ) : null}

      {tab === "payroll" ? (
        <SectionPanel
          id="hr-payroll"
          title={`Payroll ${payrollPeriod}`}
          description="Nilai dihitung dari gaji pokok, lembur, dan potongan kehadiran."
          action={<div className="flex flex-wrap gap-2">
            <Button appearance="primary" disabled={!payrolls.some((item) => item.status === "Draft")} onClick={() => { runPayroll(); toast("Payroll diproses", "Seluruh slip Draft kini berstatus Disetujui dan siap dibayar."); }}>Proses payroll</Button>
            <Button disabled={!payrolls.length || !payrolls.every((item) => item.status === "Disetujui")} onClick={() => { setPayrollAccountId(cashAccounts.find((item) => item.kind === "Bank")?.id ?? cashAccounts[0]?.id ?? ""); setPayrollPaymentOpen(true); }}>Bayar payroll</Button>
            <Button disabled={!payrolls.length || !payrolls.every((item) => item.status === "Dibayar")} onClick={() => { try { lockPayrollPeriod(payrollPeriod); toast("Periode payroll dikunci", `${payrollPeriod} tidak dapat diubah atau direversal.`); } catch (error) { toast("Payroll belum dapat dikunci", error instanceof Error ? error.message : "Periksa status pembayaran.", "error"); } }}>Kunci periode</Button>
          </div>}
          noPadding
        >
          <DataTable data={payrolls} columns={payrollColumns} searchPlaceholder="Cari karyawan atau status payroll..." />
        </SectionPanel>
      ) : null}

      {tab === "training" ? (
        <SectionPanel id="hr-training" title="Pelatihan & kepatuhan" description="Pantau kebutuhan kompetensi dan pelatihan wajib.">
          <div className="grid gap-3 lg:grid-cols-3">{trainingRecords.map((record) => <article key={`${record.employee}-${record.topic}`} className="rounded-xl border border-[var(--app-border)] p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{record.topic}</p><StatusBadge status={record.status} /></div><p className="mt-4 text-sm">{record.employee}</p><p className="mt-1 text-xs text-[var(--app-text-muted)]">Batas {formatDate(record.dueDate)}</p></article>)}</div>
        </SectionPanel>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface><DialogBody><DialogTitle>Tambah karyawan</DialogTitle><DialogContent className="space-y-4">
          <Field label="Nama lengkap"><Input value={name} onChange={(_, data) => setName(data.value)} /></Field>
          <Field label="Status kerja"><Select value={employmentType} onChange={(event) => setEmploymentType(event.target.value as Employee["employmentType"])}><option>Tetap</option><option>Kontrak</option><option>Harian</option></Select></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Departemen"><Select value={department} onChange={(event) => setDepartment(event.target.value)}><option>Produksi</option><option>Gudang</option><option>Penjualan</option><option>Distribusi</option><option>HR & Finance</option></Select></Field><Field label="Jabatan"><Input value={jobTitle} onChange={(_, data) => setJobTitle(data.value)} /></Field></div>
          <Field label="Gaji pokok"><Input type="number" min="0" value={basePay} onChange={(_, data) => setBasePay(data.value)} /></Field>
          {employmentType === "Kontrak" ? <Field label="Kontrak berakhir"><Input type="date" value={contractEnd} onChange={(_, data) => setContractEnd(data.value)} /></Field> : null}
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setDialogOpen(false)}>Batal</Button><Button appearance="primary" disabled={!name.trim() || !jobTitle.trim() || Number(basePay) < 0} onClick={() => { addEmployee({ name: name.trim(), department, jobTitle: jobTitle.trim(), employmentType, basePay: Number(basePay) || 0, contractEnd: employmentType === "Kontrak" ? contractEnd || undefined : undefined }); setDialogOpen(false); setName(""); setJobTitle(""); setBasePay(""); setContractEnd(""); toast("Karyawan ditambahkan", "Data karyawan baru siap digunakan pada periode berikutnya."); }}>Simpan karyawan</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>

      <Dialog open={payrollPaymentOpen} onOpenChange={(_, data) => setPayrollPaymentOpen(data.open)}>
        <DialogSurface><DialogBody><DialogTitle>Bayar payroll {payrollPeriod}</DialogTitle><DialogContent className="space-y-4">
          <div className="rounded-lg bg-[var(--app-surface-2)] p-4"><p className="text-xs text-[var(--app-text-muted)]">Total {payrolls.length} slip</p><p className="tabular mt-1 text-xl font-semibold">{formatCurrency(payrollTotal)}</p></div>
          <Field label="Bayar dari akun"><Select value={payrollAccountId} onChange={(event) => setPayrollAccountId(event.target.value)}>{cashAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatCurrency(account.balance)}</option>)}</Select></Field>
          <p className="text-xs text-[var(--app-text-muted)]">Satu transaksi kas keluar akan mengikat seluruh slip pada periode ini.</p>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setPayrollPaymentOpen(false)}>Batal</Button><Button appearance="primary" disabled={!payrollAccountId} onClick={() => { try { payPayroll(payrollPeriod, payrollAccountId); setPayrollPaymentOpen(false); toast("Payroll dibayar", "Transaksi kas dan seluruh slip telah dibuat."); } catch (error) { toast("Payroll belum dapat dibayar", error instanceof Error ? error.message : "Periksa saldo akun.", "error"); } }}>Bayar payroll</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>

      <Dialog open={Boolean(selectedPayslip)} onOpenChange={(_, data) => !data.open && setSelectedPayslipId(null)}>
        <DialogSurface><DialogBody><DialogTitle>Slip gaji</DialogTitle><DialogContent className="space-y-3">
          <div className="rounded-lg border border-[var(--app-border)] p-4 text-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">Roti Hanan</p><p className="mt-1 font-mono text-xs text-[var(--app-text-muted)]">{selectedPayslip?.payslipNumber}</p></div><StatusBadge status={selectedPayslip?.status ?? ""} /></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-[var(--app-text-muted)]">Karyawan</p><p className="font-medium">{selectedPayslipEmployee?.name}</p><p className="text-xs">{selectedPayslipEmployee?.number}</p></div><div><p className="text-xs text-[var(--app-text-muted)]">Periode</p><p className="font-medium">{selectedPayslip?.period}</p></div></div>
            <dl className="mt-4 space-y-2 border-t border-[var(--app-border)] pt-3"><div className="flex justify-between"><dt>Bruto</dt><dd className="tabular">{formatCurrency(selectedPayslip?.grossPay ?? 0)}</dd></div><div className="flex justify-between"><dt>Potongan</dt><dd className="tabular text-red-700">{formatCurrency(selectedPayslip?.deductions ?? 0)}</dd></div><div className="flex justify-between border-t border-[var(--app-border)] pt-2 font-semibold"><dt>Dibayarkan</dt><dd className="tabular">{formatCurrency(selectedPayslip?.netPay ?? 0)}</dd></div></dl>
          </div>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setSelectedPayslipId(null)}>Tutup</Button><Button appearance="primary" disabled={!selectedPayslip} onClick={() => selectedPayslip && downloadPayslip(selectedPayslip)}>Unduh slip</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>
    </div>
  );
}
