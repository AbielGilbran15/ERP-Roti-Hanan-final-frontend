"use client";

import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Popover,
  PopoverSurface,
  PopoverTrigger,
} from "@fluentui/react-components";
import {
  Alert24Regular,
  ArrowReset24Regular,
  ChevronDown20Regular,
  Dismiss24Regular,
  Navigation24Regular,
  SignOut24Regular,
  WeatherMoon24Regular,
  WeatherSunny24Regular,
} from "@fluentui/react-icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useAppTheme } from "@/app/providers";
import { mainNavigation, controlNavigation } from "@/config/navigation";
import { canAccessRoute, type AppRoute } from "@/lib/access";
import { formatRelative, initials } from "@/lib/format";
import { useCurrentAccess } from "@/hooks/use-current-access";
import { useERPStore } from "@/store/use-erp-store";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { GlobalSearch } from "@/components/shell/global-search";

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/10 font-mono text-sm font-bold text-white">
        RH
      </div>
      {!compact ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.02em] text-white">Roti Hanan</p>
          <p className="truncate text-[11px] text-emerald-100/70">Pusat kendali pabrik</p>
        </div>
      ) : null}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role } = useCurrentAccess();
  const primary = role ? mainNavigation.filter((item) => item.roles.includes(role)) : [];
  const controls = role ? controlNavigation.filter((item) => item.roles.includes(role)) : [];

  return (
    <aside className="flex h-full w-[268px] flex-col bg-[var(--app-sidebar)] text-[var(--app-sidebar-text)]">
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <BrandMark />
      </div>
      <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {primary.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={clsx(
                  "focus-ring flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white text-emerald-950 shadow-sm"
                    : "text-emerald-50/80 hover:bg-[var(--app-sidebar-hover)] hover:text-white",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
        {controls.length ? (
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100/50">Kontrol</p>
            <div className="space-y-1">
              {controls.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={clsx(
                      "focus-ring flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-white text-emerald-950 shadow-sm"
                        : "text-emerald-50/80 hover:bg-[var(--app-sidebar-hover)] hover:text-white",
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-[11px] leading-5 text-emerald-100/55">
        Data demo lokal
        <br />
        Tidak terhubung ke backend
      </div>
    </aside>
  );
}

function AccessDenied() {
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center text-center">
      <div className="grid size-12 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200">
        <Dismiss24Regular />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Akses tidak tersedia</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
        Role akun Anda tidak memiliki izin untuk membuka modul ini. Hubungi Owner atau Admin HR/Finance jika akses diperlukan.
      </p>
      <Button appearance="primary" className="mt-5" onClick={() => router.push("/dashboard")}>
        Kembali ke dashboard
      </Button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { mode, toggleTheme } = useAppTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const hydrated = useERPStore((state) => state.hydrated);
  const logout = useERPStore((state) => state.logout);
  const resetDemo = useERPStore((state) => state.resetDemo);
  const notifications = useERPStore((state) => state.notifications);
  const markNotificationRead = useERPStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useERPStore((state) => state.markAllNotificationsRead);
  const { user, role, business } = useCurrentAccess();
  const unread = notifications.filter((item) => !item.read);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, router, user]);

  useEffect(() => {
    setMobileOpen(false);
    setNotificationOpen(false);
  }, [pathname]);

  const currentRoute = useMemo(() => {
    const route = `/${pathname.split("/")[1] || "dashboard"}` as AppRoute;
    return route;
  }, [pathname]);

  if (!hydrated || !user || !role) {
    return (
      <main className="mx-auto max-w-7xl p-5 md:p-8">
        <LoadingSkeleton />
      </main>
    );
  }

  const allowed = canAccessRoute(role, currentRoute);

  return (
    <div className="min-h-[100dvh] bg-[var(--app-canvas)]">
      <a
        href="#main-content"
        className="focus-ring fixed left-3 top-3 z-50 -translate-y-20 rounded-lg bg-[var(--app-accent-strong)] px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Lewati ke konten
      </a>
      <div className="fixed inset-y-0 left-0 hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Tutup navigasi"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[min(86vw,290px)] shadow-2xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-[268px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-[var(--app-border)] bg-[color:var(--app-surface)]/95 px-3 backdrop-blur md:px-5">
          <Button
            appearance="subtle"
            icon={<Navigation24Regular />}
            aria-label="Buka navigasi"
            className="lg:!hidden"
            onClick={() => setMobileOpen(true)}
          />
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden max-w-[260px] items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs md:flex">
              <span className="truncate font-medium">{business.name}</span>
              <span className="truncate text-[var(--app-text-muted)]">{role}</span>
            </div>

            <Button
              appearance="subtle"
              icon={mode === "light" ? <WeatherMoon24Regular /> : <WeatherSunny24Regular />}
              aria-label={mode === "light" ? "Aktifkan tema gelap" : "Aktifkan tema terang"}
              onClick={toggleTheme}
            />

            <Popover
              open={notificationOpen}
              onOpenChange={(_, data) => setNotificationOpen(data.open)}
              positioning="below-end"
            >
              <PopoverTrigger disableButtonEnhancement>
                <Button
                  appearance="subtle"
                  icon={<Alert24Regular />}
                  aria-label={`${unread.length} notifikasi belum dibaca`}
                  title={`${unread.length} notifikasi belum dibaca`}
                  className="!h-10 !min-w-10 !rounded-lg !px-2.5"
                >
                  {unread.length ? (
                    <span className="grid min-w-5 place-items-center rounded-md bg-red-600 px-1.5 font-mono text-[10px] font-bold leading-5 text-white shadow-[0_0_0_2px_var(--app-surface)]">
                      {unread.length > 99 ? "99+" : unread.length}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverSurface className="!w-[calc(100vw-1.5rem)] !overflow-hidden !rounded-xl !p-0 sm:!w-[400px]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      <Alert24Regular />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">Peringatan operasional</p>
                      <p className="text-xs text-[var(--app-text-muted)]">{unread.length ? `${unread.length} belum dibaca` : "Semua sudah dibaca"}</p>
                    </div>
                  </div>
                  <Button appearance="subtle" size="small" disabled={!unread.length} onClick={markAllNotificationsRead}>
                    Tandai dibaca
                  </Button>
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className={clsx(
                        "block w-full border-b border-[var(--app-border)] px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-[var(--app-surface-2)]",
                        !notification.read && "bg-emerald-50/60 dark:bg-emerald-950/20",
                      )}
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={clsx(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            notification.type === "critical" && "bg-red-600",
                            notification.type === "warning" && "bg-amber-500",
                            notification.type === "info" && "bg-blue-600",
                            notification.type === "success" && "bg-emerald-600",
                            notification.read && "opacity-35",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
                            <span className="text-sm font-semibold leading-5">{notification.title}</span>
                            <StatusBadge
                              status={
                                notification.type === "critical"
                                  ? "Kritis"
                                  : notification.type === "warning"
                                    ? "Perlu dicek"
                                    : notification.type === "success"
                                      ? "Selesai"
                                      : "Info"
                              }
                            />
                          </div>
                          <p className="mt-1.5 text-xs leading-5 text-[var(--app-text-muted)]">{notification.message}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--app-text-muted)]">
                            <span>{notification.module}</span>
                            <span aria-hidden="true">•</span>
                            <span>{formatRelative(notification.createdAt)}</span>
                            {!notification.read ? <span className="font-semibold text-[var(--app-accent)]">Baru</span> : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverSurface>
            </Popover>

            <Menu positioning="below-end">
              <MenuTrigger disableButtonEnhancement>
                <Button appearance="subtle" className="!h-10 !px-1.5" aria-label="Menu akun">
                  <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                    {initials(user.name)}
                  </span>
                  <span className="hidden max-w-28 truncate text-left text-xs font-semibold xl:block">{user.name}</span>
                  <ChevronDown20Regular className="hidden sm:block" />
                </Button>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem disabled>{user.email}</MenuItem>
                  <MenuItem
                    icon={<ArrowReset24Regular />}
                    onClick={() => {
                      resetDemo();
                      router.replace("/login");
                    }}
                  >
                    Reset data demo
                  </MenuItem>
                  <MenuItem
                    icon={<SignOut24Regular />}
                    onClick={() => {
                      logout();
                      router.replace("/login");
                    }}
                  >
                    Keluar
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="mx-auto min-w-0 w-full max-w-[1600px] p-4 md:p-6 xl:p-7">
          {allowed ? children : <AccessDenied />}
        </main>
      </div>
    </div>
  );
}
