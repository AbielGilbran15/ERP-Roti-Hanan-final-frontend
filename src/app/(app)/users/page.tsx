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
} from "@fluentui/react-components";
import {
  Add20Regular,
  CheckmarkCircle24Regular,
  Copy20Regular,
  Key24Regular,
  People24Regular,
  PersonAvailable24Regular,
} from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { useAppToast } from "@/components/ui/app-toast";
import { DataTable } from "@/components/ui/data-table";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/format";
import type { AppUser, Role } from "@/lib/types";
import { useERPStore } from "@/store/use-erp-store";

const allRoles: Role[] = ["Owner", "Admin Penjualan/Sales", "Staff Gudang", "Staff Produksi", "Staff Purchasing", "Admin HR/Finance"];

export default function UsersPage() {
  const { role: currentRole } = useCurrentAccess();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<AppUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("Admin Penjualan/Sales");
  const [userView, setUserView] = useState<"all" | "active" | "never">("all");
  const users = useERPStore((state) => state.users);
  const addUser = useERPStore((state) => state.addUser);
  const toggleUser = useERPStore((state) => state.toggleUser);
  const toast = useAppToast();

  const availableRoles = currentRole === "Owner" ? allRoles : allRoles.filter((item) => item !== "Owner");
  const emailUsed = users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase());
  const usernameUsed = users.some((user) => user.username.toLowerCase() === username.trim().toLowerCase());
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const visibleUsers = userView === "active" ? users.filter((user) => user.isActive) : userView === "never" ? users.filter((user) => !user.lastLogin) : users;

  const columns = useMemo<ColumnDef<AppUser>[]>(
    () => [
      { header: "Pengguna", accessorKey: "name", cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="font-mono text-[11px] text-[var(--app-text-muted)]">@{row.original.username}</p></div> },
      { header: "Gmail", accessorKey: "email" },
      { header: "Role", accessorKey: "role", cell: ({ getValue }) => <span className="text-sm font-medium">{String(getValue())}</span> },
      { header: "Terakhir masuk", accessorKey: "lastLogin", cell: ({ getValue }) => getValue() ? formatDateTime(String(getValue())) : "Belum pernah" },
      { header: "Status", accessorKey: "isActive", cell: ({ getValue }) => <StatusBadge status={getValue() ? "Aktif" : "Nonaktif"} /> },
      {
        id: "action",
        header: "Tindakan",
        cell: ({ row }) => row.original.id === "usr-asep" ? <span className="text-xs text-[var(--app-text-muted)]">Akun utama</span> : (
          <Button size="small" appearance="secondary" onClick={() => { try { toggleUser(row.original.id); toast(row.original.isActive ? "Akun dinonaktifkan" : "Akun diaktifkan", `${row.original.name} telah diperbarui.`); } catch (error) { toast("Akun tidak dapat diperbarui", error instanceof Error ? error.message : "Periksa kembali kewenangan akun.", "error"); } }}>
            {row.original.isActive ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        ),
      },
    ],
    [toast, toggleUser],
  );

  const createAccount = () => {
    if (!name.trim() || !emailValid || !username.trim() || emailUsed || usernameUsed) return;
    try {
      const account = addUser({
        name: name.trim(),
        email: email.trim(),
        username: username.trim(),
        phone: phone.trim(),
        role,
      });
      setDialogOpen(false);
      setCreatedUser(account);
      setName("");
      setEmail("");
      setUsername("");
      setPhone("");
    } catch (error) {
      toast("Akun tidak dapat dibuat", error instanceof Error ? error.message : "Periksa kembali data akun.", "error");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengguna & Akses"
        description="Owner dan Admin HR/Finance menentukan satu role serta status akses untuk setiap akun pengguna."
        actions={<Button appearance="primary" icon={<Add20Regular />} onClick={() => setDialogOpen(true)}>Buat akun</Button>}
      />

      <MetricStrip items={[
        { label: "Total akun", value: String(users.length), detail: "Termasuk Owner", trend: "neutral", icon: <People24Regular />, onClick: () => setUserView("all"), targetId: "users-list" },
        { label: "Akun aktif", value: String(users.filter((user) => user.isActive).length), detail: "Dapat masuk ke aplikasi", trend: "up", icon: <PersonAvailable24Regular />, onClick: () => setUserView("active"), targetId: "users-list" },
        { label: "Belum pernah masuk", value: String(users.filter((user) => !user.lastLogin).length), detail: "Perlu aktivasi oleh pengguna", trend: "neutral", icon: <Key24Regular />, onClick: () => setUserView("never"), targetId: "users-list" },
        { label: "Role terisi", value: String(new Set(users.map((user) => user.role)).size), detail: "Dari 6 role yang tersedia", trend: "neutral", icon: <CheckmarkCircle24Regular />, onClick: () => undefined, targetId: "access-rules" },
      ]} />

      <SectionPanel id="users-list" title={userView === "active" ? "Akun aktif" : userView === "never" ? "Belum pernah masuk" : "Daftar akun"} description="Setiap pengguna hanya memiliki satu role. Password tetap milik masing-masing akun." noPadding>
        <DataTable data={visibleUsers} columns={columns} searchPlaceholder="Cari nama, Gmail, username, atau role..." />
      </SectionPanel>

      <div id="access-rules" className="scroll-mt-24">
      <SectionPanel title="Aturan akses ringkas" description="Menu yang terlihat mengikuti role aktif pengguna.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["Owner", "Semua modul operasional, analitik, dan pengguna"],
            ["Admin Penjualan/Sales", "Pesanan agen, POS pusat, pembayaran, dan shift POS"],
            ["Staff Gudang", "Gudang Bahan, Gudang Produk Jadi, pemenuhan agen, dan stok opname"],
            ["Staff Produksi", "Batch manual, permintaan bahan, serta pencatatan hasil berhasil dan gagal"],
            ["Purchasing", "Kebutuhan bahan, supplier, PO, dan penerimaan"],
            ["Admin HR/Finance", "Keuangan, HR, payroll, analitik, dan akun selain Owner"],
          ].map(([title, description]) => <article key={title} className="rounded-xl border border-[var(--app-border)] p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-2 text-xs leading-5 text-[var(--app-text-muted)]">{description}</p></article>)}
        </div>
      </SectionPanel>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogSurface><DialogBody><DialogTitle>Buat akun pengguna</DialogTitle><DialogContent className="space-y-4">
          <Field label="Nama lengkap"><Input value={name} onChange={(_, data) => setName(data.value)} /></Field>
          <Field label="Gmail" validationState={email.trim() && !emailValid || emailUsed ? "error" : "none"} validationMessage={emailUsed ? "Gmail sudah digunakan." : email.trim() && !emailValid ? "Masukkan alamat email yang valid." : undefined}><Input type="email" value={email} onChange={(_, data) => setEmail(data.value)} placeholder="nama@gmail.com" /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Username" validationState={usernameUsed ? "error" : "none"} validationMessage={usernameUsed ? "Username sudah digunakan." : undefined}><Input value={username} onChange={(_, data) => setUsername(data.value)} /></Field><Field label="Nomor HP"><Input value={phone} onChange={(_, data) => setPhone(data.value)} /></Field></div>
          <Field label="Role"><Select value={role} onChange={(event) => setRole(event.target.value as Role)}>{availableRoles.map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-xs leading-5 text-[var(--app-text-muted)]">Password sementara akan dibuat sebagai <span className="font-mono font-semibold text-[var(--app-text)]">hanan123</span>. Pengguna ditandai untuk mengganti password saat sistem backend diterapkan.</div>
        </DialogContent><DialogActions><Button appearance="secondary" onClick={() => setDialogOpen(false)}>Batal</Button><Button appearance="primary" disabled={!name.trim() || !emailValid || !username.trim() || emailUsed || usernameUsed} onClick={createAccount}>Buat akun</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>

      <Dialog open={Boolean(createdUser)} onOpenChange={(_, data) => { if (!data.open) setCreatedUser(null); }}>
        <DialogSurface><DialogBody><DialogTitle>Akun berhasil dibuat</DialogTitle><DialogContent className="space-y-4">
          <p className="text-sm text-[var(--app-text-muted)]">Sampaikan kredensial sementara ini langsung kepada {createdUser?.name}.</p>
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4 font-mono text-sm"><div className="flex justify-between gap-3"><span className="text-[var(--app-text-muted)]">Username</span><span className="font-semibold">{createdUser?.username}</span></div><div className="mt-3 flex justify-between gap-3"><span className="text-[var(--app-text-muted)]">Gmail</span><span className="font-semibold">{createdUser?.email}</span></div><div className="mt-3 flex justify-between gap-3"><span className="text-[var(--app-text-muted)]">Password</span><span className="font-semibold">hanan123</span></div></div>
        </DialogContent><DialogActions><Button icon={<Copy20Regular />} onClick={() => { if (!createdUser) return; void navigator.clipboard?.writeText(`Username: ${createdUser.username}\nGmail: ${createdUser.email}\nPassword: hanan123`); toast("Kredensial disalin", "Sampaikan melalui saluran yang aman."); }}>Salin kredensial</Button><Button appearance="primary" onClick={() => setCreatedUser(null)}>Selesai</Button></DialogActions></DialogBody></DialogSurface>
      </Dialog>
    </div>
  );
}
