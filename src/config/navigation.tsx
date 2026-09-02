import type { ComponentType } from "react";
import type { FluentIconsProps } from "@fluentui/react-icons";
import {
  Box24Regular,
  BuildingFactory24Regular,
  Cart24Regular,
  DataUsage24Regular,
  Database24Regular,
  Home24Regular,
  Money24Regular,
  People24Regular,
  PersonAccounts24Regular,
  Receipt24Regular,
} from "@fluentui/react-icons";
import { routeAccess, type AppRoute } from "@/lib/access";

export type NavigationItem = {
  label: string;
  href: AppRoute;
  icon: ComponentType<FluentIconsProps>;
  roles: (typeof routeAccess)[AppRoute];
};

export const mainNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home24Regular, roles: routeAccess["/dashboard"] },
  { label: "Master Data", href: "/master-data", icon: Database24Regular, roles: routeAccess["/master-data"] },
  { label: "Penjualan & POS", href: "/sales", icon: Cart24Regular, roles: routeAccess["/sales"] },
  { label: "Inventori & Gudang", href: "/inventory", icon: Box24Regular, roles: routeAccess["/inventory"] },
  { label: "Produksi", href: "/production", icon: BuildingFactory24Regular, roles: routeAccess["/production"] },
  { label: "Purchasing", href: "/purchasing", icon: Receipt24Regular, roles: routeAccess["/purchasing"] },
  { label: "Keuangan & Kas", href: "/finance", icon: Money24Regular, roles: routeAccess["/finance"] },
  { label: "HR & Payroll", href: "/hr", icon: People24Regular, roles: routeAccess["/hr"] },
  { label: "Dashboard Analitik", href: "/analytics", icon: DataUsage24Regular, roles: routeAccess["/analytics"] },
];

export const controlNavigation: NavigationItem[] = [
  { label: "Pengguna & Akses", href: "/users", icon: PersonAccounts24Regular, roles: routeAccess["/users"] },
];

export const mobileQuickLinks: NavigationItem[] = [
  mainNavigation[0],
  mainNavigation[1],
  mainNavigation[2],
  mainNavigation[3],
];
