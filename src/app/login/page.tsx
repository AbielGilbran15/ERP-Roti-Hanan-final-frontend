"use client";

import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
} from "@fluentui/react-components";
import {
  BuildingFactory24Regular,
  CheckmarkCircle24Regular,
  Key24Regular,
  LockClosed24Regular,
  Person24Regular,
} from "@fluentui/react-icons";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { users } from "@/data/mock-data";
import { useERPStore } from "@/store/use-erp-store";

const demoAccounts = [
  { label: "Owner", identifier: "asep", name: "Asep" },
  { label: "Admin Penjualan/Sales", identifier: "sales.pusat", name: "Rina Marlina" },
  { label: "Gudang", identifier: "gudang.pusat", name: "Yudi Hermawan" },
  { label: "Produksi", identifier: "produksi.pusat", name: "Aulia Rahman" },
  { label: "QC", identifier: "qc.pusat", name: "Fikri Ramadhan" },
  { label: "Purchasing", identifier: "purchasing.pusat", name: "Ratna Wulandari" },
  { label: "HR/Finance", identifier: "siti.finance", name: "Siti Nurhayati" },
];

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useERPStore((state) => state.hydrated);
  const currentUserId = useERPStore((state) => state.currentUserId);
  const login = useERPStore((state) => state.login);
  const [identifier, setIdentifier] = useState("asep");
  const [password, setPassword] = useState("hanan123");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState("");
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const recoveryAccount = users.find((user) => {
    const normalized = recoveryIdentifier.trim().toLowerCase();
    return user.username.toLowerCase() === normalized || user.email.toLowerCase() === normalized;
  });

  useEffect(() => {
    if (hydrated && currentUserId) router.replace("/dashboard");
  }, [currentUserId, hydrated, router]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    window.setTimeout(() => {
      const result = login(identifier, password);
      setSubmitting(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace("/dashboard");
    }, 350);
  };

  return (
    <main className="grid min-h-[100dvh] bg-[var(--app-canvas)] lg:grid-cols-[minmax(360px,0.9fr)_1.1fr]">
      <section className="relative hidden overflow-hidden bg-[var(--app-sidebar)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl border border-white/20 bg-white/10 font-mono text-base font-bold">RH</span>
            <div>
              <p className="font-semibold tracking-[-0.02em]">Roti Hanan</p>
              <p className="text-xs text-emerald-100/65">Pabrik Bandung</p>
            </div>
          </div>
          <div className="mt-20 max-w-lg">
            <p className="text-sm font-medium text-emerald-200">Operasional dalam satu alur</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] xl:text-5xl">
              Kendalikan seluruh operasional pusat dalam satu tempat.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-emerald-50/70">
              Penjualan, stok, produksi, QC, pembelian, keuangan, dan tenaga kerja saling terhubung.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 border-y border-white/10 py-5">
          <div className="border-r border-white/10 pr-5">
            <BuildingFactory24Regular className="text-emerald-300" />
            <p className="mt-3 text-sm font-semibold">Pabrik pusat</p>
            <p className="mt-1 text-xs leading-5 text-emerald-100/60">Produksi dan mutu terpantau per batch.</p>
          </div>
          <div className="pl-5">
            <CheckmarkCircle24Regular className="text-emerald-300" />
            <p className="mt-3 text-sm font-semibold">Akses terkendali</p>
            <p className="mt-1 text-xs leading-5 text-emerald-100/60">Setiap akun memiliki satu role yang ditentukan Owner atau Admin.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--app-sidebar)] font-mono text-sm font-bold text-white">RH</span>
            <div>
              <p className="font-semibold">ERP Roti Hanan</p>
              <p className="text-xs text-[var(--app-text-muted)]">Pabrik Bandung</p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">Masuk ke akun Anda</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
              Gunakan Gmail atau username dan password pribadi.
            </p>
          </div>

          <form className="mt-7 space-y-5" onSubmit={submit}>
            <Field label="Gmail atau username" required>
              <Input
                value={identifier}
                onChange={(_, data) => setIdentifier(data.value)}
                contentBefore={<Person24Regular />}
                placeholder="contoh: asep"
                autoComplete="username"
                size="large"
              />
            </Field>
            <Field label="Password" required validationMessage={error || undefined} validationState={error ? "error" : "none"}>
              <Input
                value={password}
                onChange={(_, data) => setPassword(data.value)}
                contentBefore={<LockClosed24Regular />}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                size="large"
              />
            </Field>
            <div className="flex items-center justify-between gap-4">
              <Checkbox
                checked={showPassword}
                onChange={(_, data) => setShowPassword(Boolean(data.checked))}
                label="Tampilkan password"
              />
              <Button appearance="subtle" size="small" type="button" onClick={() => { setRecoveryIdentifier(identifier); setRecoveryChecked(false); setForgotOpen(true); }}>
                Lupa password
              </Button>
            </div>
            <Button appearance="primary" size="large" type="submit" disabled={submitting} className="!w-full">
              {submitting ? "Memeriksa akun..." : "Masuk"}
            </Button>
          </form>

          <div className="mt-8 app-surface overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-4 py-3">
              <Key24Regular className="text-[var(--app-accent)]" />
              <div>
                <p className="text-sm font-semibold">Akun demo per role</p>
                <p className="text-xs text-[var(--app-text-muted)]">Password semua akun demo: hanan123</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[var(--app-border)] sm:grid-cols-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.identifier}
                  type="button"
                  className="bg-[var(--app-surface)] px-3 py-3 text-left transition-colors hover:bg-[var(--app-surface-2)]"
                  onClick={() => {
                    setIdentifier(account.identifier);
                    setPassword("hanan123");
                    setError("");
                  }}
                >
                  <span className="block text-xs font-semibold text-[var(--app-text)]">{account.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--app-text-muted)]">{account.name}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-[var(--app-text-muted)]">
            Frontend demo. {users.length} akun dummy tersedia. Belum terhubung ke backend.
          </p>
        </div>
      </section>

      <Dialog open={forgotOpen} onOpenChange={(_, data) => setForgotOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Pemulihan akun demo</DialogTitle>
            <DialogContent className="space-y-4">
              <p className="text-sm leading-6 text-[var(--app-text-muted)]">
                Karena aplikasi belum memakai backend atau layanan email, pemulihan ini hanya memeriksa akun demo lokal dan mengisi ulang kredensial default.
              </p>
              <Field
                label="Gmail atau username"
                validationState={recoveryChecked && !recoveryAccount ? "error" : "none"}
                validationMessage={recoveryChecked && !recoveryAccount ? "Akun demo tidak ditemukan." : recoveryAccount ? `Akun ditemukan: ${recoveryAccount.name} · ${recoveryAccount.role}` : undefined}
              >
                <Input value={recoveryIdentifier} onChange={(_, data) => { setRecoveryIdentifier(data.value); setRecoveryChecked(false); }} placeholder="contoh: sales.pusat" />
              </Field>
              <div className="rounded-lg bg-[var(--app-surface-2)] p-3 text-xs leading-5 text-[var(--app-text-muted)]">
                Password default seluruh akun demo adalah <span className="font-mono font-semibold text-[var(--app-text)]">hanan123</span>. Pemulihan melalui email baru dapat diterapkan setelah backend tersedia.
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setForgotOpen(false)}>Batal</Button>
              <Button appearance="primary" onClick={() => {
                setRecoveryChecked(true);
                if (!recoveryAccount) return;
                setIdentifier(recoveryAccount.username);
                setPassword("hanan123");
                setError("");
                setForgotOpen(false);
              }}>Gunakan akun demo</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </main>
  );
}
