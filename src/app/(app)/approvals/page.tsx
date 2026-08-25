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
  Tab,
  TabList,
  Textarea,
} from "@fluentui/react-components";
import {
  CheckmarkCircle24Regular,
  Clock24Regular,
  DismissCircle24Regular,
  Money24Regular,
} from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { useAppToast } from "@/components/ui/app-toast";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Approval } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

export default function ApprovalsPage() {
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<Approval | null>(null);
  const [decision, setDecision] = useState<"Disetujui" | "Ditolak">("Disetujui");
  const [note, setNote] = useState("");
  const approvals = useERPStore((state) => state.approvals);
  const decideApproval = useERPStore((state) => state.decideApproval);
  const toast = useAppToast();
  const pending = approvals.filter((item) => item.status === "Menunggu");
  const history = approvals.filter((item) => item.status !== "Menunggu");

  const columns = useMemo<ColumnDef<Approval>[]>(
    () => [
      { header: "Referensi", accessorKey: "reference", cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{String(getValue())}</span> },
      { header: "Permintaan", accessorKey: "title", cell: ({ row }) => <div className="max-w-[280px]"><p className="font-medium">{row.original.title}</p><p className="mt-0.5 text-xs text-[var(--app-text-muted)]">{row.original.type} oleh {row.original.requester}</p></div> },
      { header: "Konteks", accessorKey: "context" },
      { header: "Diajukan", accessorKey: "requestedAt", cell: ({ getValue }) => formatDateTime(String(getValue())) },
      { header: "Nilai", accessorKey: "amount", cell: ({ getValue }) => <span className="tabular font-semibold">{formatCurrency(Number(getValue()))}</span> },
      { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      {
        id: "action",
        header: "Tindakan",
        cell: ({ row }) => row.original.status === "Menunggu" ? (
          <div className="flex gap-1.5">
            <Button size="small" appearance="primary" onClick={() => { setSelected(row.original); setDecision("Disetujui"); setNote(""); }}>Setujui</Button>
            <Button size="small" appearance="secondary" onClick={() => { setSelected(row.original); setDecision("Ditolak"); setNote(""); }}>Tolak</Button>
          </div>
        ) : null,
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Persetujuan Owner" description="Periksa permintaan lintas modul sebelum transaksi dilanjutkan." />
      <MetricStrip items={[
        { label: "Menunggu keputusan", value: String(pending.length), detail: pending.length ? "Perlu diperiksa hari ini" : "Tidak ada antrean", trend: pending.length ? "down" : "up", icon: <Clock24Regular />, onClick: () => setTab("pending") },
        { label: "Nilai menunggu", value: formatCurrency(pending.reduce((sum, item) => sum + item.amount, 0)), detail: "Gabungan seluruh jenis", trend: "neutral", icon: <Money24Regular />, onClick: () => setTab("pending") },
        { label: "Disetujui", value: String(approvals.filter((item) => item.status === "Disetujui").length), detail: "Dalam riwayat demo", trend: "up", icon: <CheckmarkCircle24Regular />, onClick: () => setTab("history") },
        { label: "Ditolak", value: String(approvals.filter((item) => item.status === "Ditolak").length), detail: "Dalam riwayat demo", trend: "neutral", icon: <DismissCircle24Regular />, onClick: () => setTab("history") },
      ]} />

      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(String(data.value))}>
        <Tab value="pending">Menunggu ({pending.length})</Tab>
        <Tab value="history">Riwayat ({history.length})</Tab>
      </TabList>

      <SectionPanel noPadding>
        <DataTable
          data={tab === "pending" ? pending : history}
          columns={columns}
          searchPlaceholder="Cari referensi, pemohon, jenis, atau konteks..."
          emptyTitle={tab === "pending" ? "Tidak ada permintaan menunggu" : "Riwayat masih kosong"}
          emptyDescription={tab === "pending" ? "Semua permintaan telah diputuskan." : "Keputusan Owner akan tercatat di sini."}
        />
      </SectionPanel>

      <Dialog open={Boolean(selected)} onOpenChange={(_, data) => { if (!data.open) setSelected(null); }}>
        <DialogSurface><DialogBody><DialogTitle>{decision === "Disetujui" ? "Setujui permintaan" : "Tolak permintaan"}</DialogTitle><DialogContent className="space-y-4">
          <div className="rounded-xl border border-[var(--app-border)] p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{selected?.title}</p><p className="mt-1 font-mono text-xs text-[var(--app-text-muted)]">{selected?.reference}</p></div><StatusBadge status={selected?.type ?? "Permintaan"} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-[var(--app-text-muted)]">Pemohon</dt><dd className="mt-1 font-medium">{selected?.requester}</dd></div><div><dt className="text-[var(--app-text-muted)]">Nilai</dt><dd className="tabular mt-1 font-semibold">{formatCurrency(selected?.amount ?? 0)}</dd></div></dl>
            <p className="mt-4 text-xs leading-5 text-[var(--app-text-muted)]">Alasan: {selected?.reason}</p>
          </div>
          <Textarea value={note} onChange={(_, data) => setNote(data.value)} placeholder={decision === "Ditolak" ? "Alasan penolakan wajib diisi" : "Catatan keputusan, opsional"} resize="vertical" />
          <p className="text-xs text-[var(--app-text-muted)]">Keputusan akan langsung memperbarui status transaksi pada modul asal.</p>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setSelected(null)}>Batal</Button><Button appearance="primary" disabled={!selected || (decision === "Ditolak" && !note.trim())} onClick={() => { if (!selected) return; decideApproval(selected.id, decision); toast(`Permintaan ${decision.toLowerCase()}`, `${selected.reference} telah diperbarui pada modul asal.`); setSelected(null); }}>{decision === "Disetujui" ? "Setujui" : "Tolak"}</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>
    </div>
  );
}
