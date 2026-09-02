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
  | "/users";

const allRoles: Role[] = [
  "Owner",
  "Admin Penjualan/Sales",
  "Staff Gudang",
  "Staff Produksi",
  "Staff Purchasing",
  "Admin HR/Finance",
];

export const routeAccess: Record<AppRoute, Role[]> = {
  "/dashboard": allRoles,
  "/sales": ["Owner", "Admin Penjualan/Sales", "Admin HR/Finance"],
  "/inventory": ["Owner", "Staff Gudang", "Staff Produksi", "Staff Purchasing"],
  "/finance": ["Owner", "Admin HR/Finance"],
  "/hr": ["Owner", "Admin HR/Finance"],
  "/production": ["Owner", "Staff Produksi", "Staff Gudang"],
  "/purchasing": ["Owner", "Staff Purchasing", "Staff Gudang", "Admin HR/Finance"],
  "/analytics": ["Owner", "Admin HR/Finance"],
  "/master-data": allRoles,
  "/users": ["Owner", "Admin HR/Finance"],
};

export const canAccessRoute = (role: Role, route: AppRoute) => routeAccess[route].includes(role);

export type ActionPermission =
  | "sales.create"
  | "sales.shift.close"
  | "inventory.fulfillment"
  | "inventory.production.issue"
  | "inventory.production.review"
  | "inventory.production.purchase-request"
  | "inventory.stock-count"
  | "production.create"
  | "production.material.confirm"
  | "production.advance"
  | "production.finalize"
  | "purchasing.create"
  | "purchasing.receive"
  | "finance.manage"
  | "analytics.target.manage"
  | "hr.manage"
  | "users.manage";

export const actionPermissions: Record<ActionPermission, Role[]> = {
  "sales.create": ["Owner", "Admin Penjualan/Sales"],
  "sales.shift.close": ["Owner", "Admin Penjualan/Sales"],
  "inventory.fulfillment": ["Owner", "Staff Gudang"],
  "inventory.production.issue": ["Owner", "Staff Gudang"],
  "inventory.production.review": ["Owner", "Staff Gudang"],
  "inventory.production.purchase-request": ["Owner", "Staff Gudang"],
  "inventory.stock-count": ["Owner", "Staff Gudang"],
  "production.create": ["Owner", "Staff Produksi"],
  "production.material.confirm": ["Owner", "Staff Produksi"],
  "production.advance": ["Owner", "Staff Produksi"],
  "production.finalize": ["Owner", "Staff Produksi"],
  "purchasing.create": ["Owner", "Staff Purchasing"],
  "purchasing.receive": ["Owner", "Staff Purchasing"],
  "finance.manage": ["Owner", "Admin HR/Finance"],
  "analytics.target.manage": ["Owner", "Admin HR/Finance"],
  "hr.manage": ["Owner", "Admin HR/Finance"],
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
  | "finished.production"
  | "finished.classification"
  | "finished.stock"
  | "finished.price"
  | "finished.cost"
  | "audit.view";

const allMasterPermissions: MasterPermission[] = [
  "customer.profile",
  "customer.finance",
  "supplier.profile",
  "supplier.finance",
  "material.purchase",
  "material.stock",
  "finished.production",
  "finished.classification",
  "finished.stock",
  "finished.price",
  "finished.cost",
  "audit.view",
];

export const masterPermissions: Record<Role, MasterPermission[]> = {
  Owner: allMasterPermissions,
  "Admin Penjualan/Sales": ["customer.profile", "finished.price"],
  "Staff Gudang": ["material.stock", "finished.stock"],
  "Staff Produksi": ["finished.production", "finished.classification"],
  "Staff Purchasing": ["supplier.profile", "material.purchase"],
  "Admin HR/Finance": ["customer.finance", "supplier.finance", "finished.cost"],
};

export const canManageMaster = (role: Role | null, permission: MasterPermission) =>
  role ? masterPermissions[role].includes(permission) : false;

export type MasterSection = "customers" | "suppliers" | "materials" | "product-classification" | "finished-products" | "audit";

export const canViewMasterSection = (role: Role | null, section: MasterSection) => {
  if (!role) return false;
  if (role === "Owner") return true;
  const permissions = masterPermissions[role];
  if (section === "customers") return permissions.some((permission) => permission.startsWith("customer."));
  if (section === "suppliers") return permissions.some((permission) => permission.startsWith("supplier."));
  if (section === "materials") return ["Staff Gudang", "Staff Produksi", "Staff Purchasing"].includes(role);
  if (section === "product-classification") return ["Admin Penjualan/Sales", "Staff Gudang", "Staff Produksi", "Admin HR/Finance"].includes(role);
  if (section === "finished-products") return ["Admin Penjualan/Sales", "Staff Gudang", "Staff Produksi", "Admin HR/Finance"].includes(role);
  return permissions.includes("audit.view");
};
