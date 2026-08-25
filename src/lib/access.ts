import type { Role } from "@/lib/types";

export type AppRoute =
  | "/dashboard"
  | "/sales"
  | "/inventory"
  | "/finance"
  | "/hr"
  | "/production"
  | "/purchasing"
  | "/analytics"
  | "/master-data"
  | "/approvals"
  | "/users";

const allRoles: Role[] = [
  "Owner",
  "Admin Penjualan/Sales",
  "Staff Gudang",
  "Staff Produksi",
  "QC Inspector",
  "Staff Purchasing",
  "Admin HR/Finance",
];

export const routeAccess: Record<AppRoute, Role[]> = {
  "/dashboard": allRoles,
  "/sales": ["Owner", "Admin Penjualan/Sales", "Admin HR/Finance"],
  "/inventory": ["Owner", "Staff Gudang", "Staff Produksi", "QC Inspector", "Staff Purchasing"],
  "/finance": ["Owner", "Admin HR/Finance"],
  "/hr": ["Owner", "Admin HR/Finance"],
  "/production": ["Owner", "Staff Produksi", "QC Inspector", "Staff Gudang"],
  "/purchasing": ["Owner", "Staff Purchasing", "Staff Gudang", "Admin HR/Finance"],
  "/analytics": ["Owner", "Admin HR/Finance"],
  "/master-data": allRoles,
  "/approvals": ["Owner"],
  "/users": ["Owner", "Admin HR/Finance"],
};

export const canAccessRoute = (role: Role, route: AppRoute) => routeAccess[route].includes(role);

export type ActionPermission =
  | "sales.create"
  | "sales.shift.close"
  | "inventory.fulfillment"
  | "production.create"
  | "production.advance"
  | "quality.resolve"
  | "purchasing.create"
  | "purchasing.receive"
  | "finance.manage"
  | "hr.manage"
  | "approvals.decide"
  | "users.manage";

export const actionPermissions: Record<ActionPermission, Role[]> = {
  "sales.create": ["Owner", "Admin Penjualan/Sales"],
  "sales.shift.close": ["Owner", "Admin Penjualan/Sales"],
  "inventory.fulfillment": ["Owner", "Staff Gudang"],
  "production.create": ["Owner", "Staff Produksi"],
  "production.advance": ["Owner", "Staff Produksi"],
  "quality.resolve": ["Owner", "QC Inspector"],
  "purchasing.create": ["Owner", "Staff Purchasing"],
  "purchasing.receive": ["Owner", "Staff Purchasing"],
  "finance.manage": ["Owner", "Admin HR/Finance"],
  "hr.manage": ["Owner", "Admin HR/Finance"],
  "approvals.decide": ["Owner"],
  "users.manage": ["Owner", "Admin HR/Finance"],
};

export const canPerformAction = (role: Role | null, permission: ActionPermission) =>
  role ? actionPermissions[permission].includes(role) : false;

export type MasterPermission =
  | "customer.profile"
  | "customer.finance"
  | "supplier.profile"
  | "supplier.finance"
  | "material.purchase"
  | "material.stock"
  | "material.quality"
  | "finished.production"
  | "finished.stock"
  | "finished.price"
  | "finished.quality"
  | "audit.view";

const allMasterPermissions: MasterPermission[] = [
  "customer.profile",
  "customer.finance",
  "supplier.profile",
  "supplier.finance",
  "material.purchase",
  "material.stock",
  "material.quality",
  "finished.production",
  "finished.stock",
  "finished.price",
  "finished.quality",
  "audit.view",
];

export const masterPermissions: Record<Role, MasterPermission[]> = {
  Owner: allMasterPermissions,
  "Admin Penjualan/Sales": ["customer.profile", "finished.price"],
  "Staff Gudang": ["material.stock", "finished.stock"],
  "Staff Produksi": ["finished.production"],
  "QC Inspector": ["material.quality", "finished.quality"],
  "Staff Purchasing": ["supplier.profile", "material.purchase"],
  "Admin HR/Finance": ["customer.finance", "supplier.finance"],
};

export const canManageMaster = (role: Role | null, permission: MasterPermission) =>
  role ? masterPermissions[role].includes(permission) : false;

export type MasterSection = "customers" | "suppliers" | "materials" | "finished-products" | "audit";

export const canViewMasterSection = (role: Role | null, section: MasterSection) => {
  if (!role) return false;
  if (role === "Owner") return true;
  const permissions = masterPermissions[role];
  if (section === "customers") return permissions.some((permission) => permission.startsWith("customer."));
  if (section === "suppliers") return permissions.some((permission) => permission.startsWith("supplier."));
  if (section === "materials") return ["Staff Gudang", "Staff Produksi", "QC Inspector", "Staff Purchasing"].includes(role);
  if (section === "finished-products") return ["Admin Penjualan/Sales", "Staff Gudang", "Staff Produksi", "QC Inspector"].includes(role);
  return permissions.includes("audit.view");
};
