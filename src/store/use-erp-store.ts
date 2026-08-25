"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  approvals as seedApprovals,
  auditLogs as seedAuditLogs,
  customers as seedCustomers,
  employees as seedEmployees,
  expenses as seedExpenses,
  invoices as seedInvoices,
  notifications as seedNotifications,
  payrolls as seedPayrolls,
  products as seedProducts,
  productionOrders as seedProductionOrders,
  purchaseOrders as seedPurchaseOrders,
  qualityInspections as seedQualityInspections,
  sales as seedSales,
  salesShifts as seedSalesShifts,
  stocks as seedStocks,
  suppliers as seedSuppliers,
  users as seedUsers,
} from "@/data/mock-data";
import type {
  AppNotification,
  AppUser,
  Approval,
  AuditLog,
  CartLine,
  Customer,
  DeliveryAttachment,
  Employee,
  Expense,
  Invoice,
  OrderSource,
  Payroll,
  ProductionOrder,
  PurchaseOrder,
  QualityInspection,
  Role,
  Sale,
  SalesShift,
  StockItem,
  Supplier,
  Product,
} from "@/lib/types";
import { canManageMaster, canPerformAction, type ActionPermission, type MasterPermission } from "@/lib/access";
import { calculatePurchaseConversion, getUnitDefinition } from "@/lib/units";

type LoginResult = { ok: true } | { ok: false; message: string };

type UserDraft = {
  name: string;
  username: string;
  email: string;
  phone: string;
  role: Role;
};

type SaleDraft = {
  salesAdminId: string;
  customerId: string;
  items: CartLine[];
  discount: number;
  paymentMethod: Sale["paymentMethod"];
};

type AgentOrderDraft = SaleDraft & {
  orderSource: Exclude<OrderSource, "POS">;
  fulfillmentMethod: Sale["fulfillmentMethod"];
  paidAmount: number;
  neededAt: string;
};

type EmployeeDraft = Pick<Employee, "name" | "department" | "jobTitle" | "employmentType" | "basePay"> & {
  contractEnd?: string;
};

type PurchaseOrderDraftItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

type ERPStore = {
  hydrated: boolean;
  currentUserId: string | null;
  users: AppUser[];
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  stocks: StockItem[];
  sales: Sale[];
  salesShifts: SalesShift[];
  productionOrders: ProductionOrder[];
  qualityInspections: QualityInspection[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  expenses: Expense[];
  employees: Employee[];
  payrolls: Payroll[];
  approvals: Approval[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  setHydrated: (hydrated: boolean) => void;
  login: (identifier: string, password: string) => LoginResult;
  logout: () => void;
  addUser: (draft: UserDraft) => AppUser;
  toggleUser: (userId: string) => void;
  saveCustomer: (draft: Customer) => Customer;
  saveSupplier: (draft: Supplier) => Supplier;
  saveProduct: (draft: Product) => Product;
  addSale: (draft: SaleDraft) => Sale;
  addAgentOrder: (draft: AgentOrderDraft) => Sale;
  advanceFulfillment: (saleId: string) => void;
  confirmDelivery: (saleId: string, proof: string, issue?: string, attachments?: DeliveryAttachment[]) => void;
  closeSalesShift: (shiftId: string, actualCash: number) => void;
  addProductionOrder: (productId: string, targetQty: number, priority: ProductionOrder["priority"]) => void;
  advanceProduction: (productionId: string) => void;
  resolveInspection: (inspectionId: string, result: "Lulus" | "Ditahan" | "Ditolak") => void;
  addPurchaseOrder: (supplierId: string, items: PurchaseOrderDraftItem[]) => PurchaseOrder;
  receivePurchaseOrder: (purchaseOrderId: string) => void;
  addExpense: (department: string, category: string, payee: string, amount: number) => void;
  payInvoice: (invoiceId: string, amount: number) => void;
  addEmployee: (draft: EmployeeDraft) => void;
  runPayroll: () => void;
  decideApproval: (approvalId: string, decision: "Disetujui" | "Ditolak") => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  resetDemo: () => void;
};

const clone = <T,>(value: T): T => structuredClone(value);

const initialData = () => ({
  currentUserId: null,
  users: clone(seedUsers),
  customers: clone(seedCustomers),
  suppliers: clone(seedSuppliers),
  products: clone(seedProducts),
  stocks: clone(seedStocks),
  sales: clone(seedSales),
  salesShifts: clone(seedSalesShifts),
  productionOrders: clone(seedProductionOrders),
  qualityInspections: clone(seedQualityInspections),
  purchaseOrders: clone(seedPurchaseOrders),
  invoices: clone(seedInvoices),
  expenses: clone(seedExpenses),
  employees: clone(seedEmployees),
  payrolls: clone(seedPayrolls),
  approvals: clone(seedApprovals),
  notifications: clone(seedNotifications),
  auditLogs: clone(seedAuditLogs),
});

const timestamp = () => new Date().toISOString();
const shortDate = () => new Date().toISOString().slice(0, 10);
const nextNumber = (prefix: string, length: number) => `${prefix}-${String(length + 1).padStart(3, "0")}`;

const productPrice = (products: Product[], productId: string, customer: Customer) => {
  const product = products.find((candidate) => candidate.id === productId);
  if (!product || product.type !== "Produk Jadi" || !product.isActive) return 0;
  return customer.category === "Agen 1" ? product.agent1Price : product.agent2Price;
};

const snapshotSaleLines = (products: Product[], items: CartLine[], customer: Customer) =>
  items.map((item) => ({ ...item, unitPrice: productPrice(products, item.productId, customer) }));

const calculateSubtotal = (items: Array<CartLine & { unitPrice: number }>) =>
  items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const currentActor = (state: Pick<ERPStore, "currentUserId" | "users">) => {
  const user = state.users.find((candidate) => candidate.id === state.currentUserId);
  if (!user) throw new Error("Silakan login sebelum mengubah data.");
  return user;
};

const assertAction = (
  state: Pick<ERPStore, "currentUserId" | "users">,
  permission: ActionPermission,
  message = "Role ini tidak berwenang menjalankan tindakan tersebut.",
) => {
  const actor = currentActor(state);
  if (!canPerformAction(actor.role, permission)) throw new Error(message);
  return actor;
};

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validatedDiscount = (subtotal: number, discount: number) => {
  if (!Number.isFinite(discount) || discount < 0) throw new Error("Diskon harus berupa angka nol atau lebih.");
  if (discount > subtotal) throw new Error("Diskon tidak boleh melebihi subtotal transaksi.");
  if (subtotal - discount <= 0) throw new Error("Total transaksi harus lebih dari nol.");
  return discount;
};

const changeList = <T extends object>(before: T | undefined, after: T, labels: Partial<Record<keyof T, string>>) =>
  (Object.keys(labels) as Array<keyof T>).flatMap((key) => {
    const oldValue = before?.[key];
    const newValue = after[key];
    if (oldValue === newValue) return [];
    return [`${labels[key]}: ${oldValue === undefined || oldValue === "" ? "—" : String(oldValue)} → ${newValue === "" ? "—" : String(newValue)}`];
  });

const auditEntry = (
  actor: AppUser,
  entityType: AuditLog["entityType"],
  recordId: string,
  recordLabel: string,
  action: AuditLog["action"],
  changes: string[],
): AuditLog => ({
  id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  entityType,
  recordId,
  recordLabel,
  action,
  changes,
  actorId: actor.id,
  actorName: actor.name,
  createdAt: timestamp(),
});

const customerExposure = (
  state: Pick<ERPStore, "invoices" | "sales">,
  customerId: string,
) => {
  const invoicedSources = new Set(
    state.invoices.filter((invoice) => invoice.type === "Piutang" && invoice.customerId === customerId).map((invoice) => invoice.source),
  );
  const invoices = state.invoices
    .filter((invoice) => invoice.type === "Piutang" && invoice.customerId === customerId && invoice.status !== "Lunas")
    .reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.paid, 0), 0);
  const uninvoicedOrders = state.sales
    .filter((sale) => sale.customerId === customerId && !invoicedSources.has(sale.number) && !["Diretur", "Bermasalah"].includes(sale.status))
    .reduce((sum, sale) => sum + Math.max(sale.total - sale.paidAmount, 0), 0);
  return invoices + uninvoicedOrders;
};

const assertCustomerCredit = (
  state: Pick<ERPStore, "invoices" | "sales">,
  customer: Customer,
  unpaidAmount: number,
) => {
  if (unpaidAmount <= 0) return;
  if (customer.paymentTermsDays <= 0 || customer.creditLimit <= 0) {
    throw new Error(`${customer.name} tidak memiliki fasilitas kredit/tempo aktif.`);
  }
  const exposure = customerExposure(state, customer.id);
  if (exposure + unpaidAmount > customer.creditLimit) {
    const remaining = Math.max(customer.creditLimit - exposure, 0);
    throw new Error(`Batas kredit ${customer.name} terlampaui. Sisa kredit Rp${remaining.toLocaleString("id-ID")}.`);
  }
};

const receivableForSale = (sale: Sale, customer: Customer): Invoice => {
  return {
    id: `inv-${Date.now()}-${sale.id}`,
    number: `INV-${sale.number}`,
    type: "Piutang",
    party: customer.name,
    customerId: customer.id,
    source: sale.number,
    issueDate: shortDate(),
    dueDate: sale.dueDate ?? addDays(new Date(), sale.paymentTermsDaysSnapshot ?? customer.paymentTermsDays),
    total: sale.total,
    paid: sale.paidAmount,
    status: sale.total <= sale.paidAmount
      ? "Lunas"
      : sale.paidAmount > 0
        ? "Dibayar Sebagian"
        : "Belum Bayar",
  };
};

const validateSaleLines = (products: Product[], lines: Array<CartLine & { unitPrice: number }>) => {
  if (!lines.length) throw new Error("Pilih minimal satu Barang Jadi.");
  for (const line of lines) {
    const product = products.find((candidate) => candidate.id === line.productId);
    if (!product || product.type !== "Produk Jadi" || !product.isActive) {
      throw new Error("Barang Jadi tidak ditemukan atau sedang nonaktif.");
    }
    if (line.quantity <= 0) throw new Error(`Jumlah ${product.name} harus lebih dari nol.`);
    const unitFamily = getUnitDefinition(product.stockUnit)?.family;
    if ((unitFamily === "Jumlah" || unitFamily === "Kemasan") && !Number.isInteger(line.quantity)) {
      throw new Error(`Jumlah ${product.name} dalam ${product.stockUnit} harus berupa bilangan bulat.`);
    }
    if (line.unitPrice <= 0) throw new Error(`Harga ${product.name} untuk kategori agen belum tersedia.`);
  }
};

const incomingQualityChecks = (product: Product, stockQuantity: number) => {
  const quantityCheck = { name: "Kesesuaian jumlah", value: `${stockQuantity.toLocaleString("id-ID")} ${product.stockUnit}`, result: "Lulus" as const };
  if (product.type === "Kemasan") {
    return [
      quantityCheck,
      { name: "Ukuran dan ketebalan", value: "Menunggu", result: "Gagal" as const },
      { name: "Kebersihan dan cacat/sobek", value: "Menunggu", result: "Gagal" as const },
      { name: "Kualitas cetakan/desain", value: "Menunggu", result: "Gagal" as const },
      { name: "Kekuatan segel", value: "Menunggu", result: "Gagal" as const },
    ];
  }
  if (product.name.toLowerCase().includes("ragi")) {
    return [
      quantityCheck,
      { name: "Kondisi dan segel kemasan", value: "Menunggu", result: "Gagal" as const },
      { name: "Batch dan kedaluwarsa", value: "Menunggu", result: "Gagal" as const },
      { name: "Warna dan aroma", value: "Menunggu", result: "Gagal" as const },
      { name: "Suhu penerimaan/aktivitas", value: "Menunggu bila relevan", result: "Gagal" as const },
    ];
  }
  return [
    quantityCheck,
    { name: "Kondisi kemasan", value: "Menunggu", result: "Gagal" as const },
    { name: "Batch dan kedaluwarsa", value: "Menunggu", result: "Gagal" as const },
    { name: "Warna dan aroma", value: "Menunggu", result: "Gagal" as const },
    { name: "Kering/lembap dan kontaminasi", value: "Menunggu", result: "Gagal" as const },
  ];
};

const hasFinishedStock = (stocks: StockItem[], items: CartLine[]) =>
  items.every((line) =>
    stocks
      .filter(
        (stock) =>
          stock.productId === line.productId &&
          stock.warehouse === "Gudang Produk Jadi" &&
          stock.status === "Tersedia",
      )
      .reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0) >= line.quantity,
  );

const issueFinishedStock = (stocks: StockItem[], items: CartLine[], transitReference?: string) => {
  if (!hasFinishedStock(stocks, items)) return null;

  const updated = stocks.map((stock) => ({ ...stock }));
  const transit: StockItem[] = [];

  for (const line of items) {
    let remaining = line.quantity;
    const candidates = updated
      .filter(
        (stock) =>
          stock.productId === line.productId &&
          stock.warehouse === "Gudang Produk Jadi" &&
          stock.status === "Tersedia",
      )
      .sort((a, b) => (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"));

    for (const candidate of candidates) {
      if (remaining <= 0) break;
      const available = Math.max(candidate.onHand - candidate.reserved, 0);
      const quantity = Math.min(available, remaining);
      candidate.onHand -= quantity;
      remaining -= quantity;

      if (transitReference && quantity > 0) {
        transit.push({
          id: `stk-delivery-${transitReference}-${candidate.id}`,
          productId: candidate.productId,
          warehouse: "Barang Dalam Pengiriman",
          lot: candidate.lot,
          expiryDate: candidate.expiryDate,
          onHand: quantity,
          reserved: 0,
          status: "Dalam Pengiriman",
          referenceId: transitReference,
        });
      }
    }
  }

  return [...updated, ...transit];
};

export const useERPStore = create<ERPStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...initialData(),
      setHydrated: (hydrated) => set({ hydrated }),
      login: (identifier, password) => {
        const normalized = identifier.trim().toLowerCase();
        const user = get().users.find(
          (candidate) =>
            candidate.email.toLowerCase() === normalized || candidate.username.toLowerCase() === normalized,
        );
        if (!user || user.password !== password) {
          return { ok: false, message: "Email, username, atau password tidak sesuai." };
        }
        if (!user.isActive) {
          return { ok: false, message: "Akun ini sedang dinonaktifkan. Hubungi Owner atau Admin HR/Finance." };
        }
        set({
          currentUserId: user.id,
          users: get().users.map((item) => (item.id === user.id ? { ...item, lastLogin: timestamp() } : item)),
        });
        return { ok: true };
      },
      logout: () => set({ currentUserId: null }),
      addUser: (draft) => {
        const state = get();
        const actor = assertAction(state, "users.manage", "Hanya Owner atau Admin HR/Finance yang dapat membuat akun.");
        const email = draft.email.trim().toLowerCase();
        const username = draft.username.trim().toLowerCase();
        if (!draft.name.trim() || !username || !email) throw new Error("Nama, Gmail, dan username wajib diisi.");
        if (!validEmail(email)) throw new Error("Format Gmail tidak valid.");
        if (state.users.some((user) => user.email.toLowerCase() === email)) throw new Error("Gmail sudah digunakan.");
        if (state.users.some((user) => user.username.toLowerCase() === username)) throw new Error("Username sudah digunakan.");
        if (draft.role === "Owner" && actor.role !== "Owner") throw new Error("Hanya Owner yang dapat membuat akun Owner.");
        const user: AppUser = {
          id: `usr-${Date.now()}`,
          name: draft.name.trim(),
          username,
          email,
          password: "hanan123",
          phone: draft.phone,
          role: draft.role,
          isActive: true,
          mustChangePassword: true,
        };
        set((state) => ({ users: [user, ...state.users] }));
        return user;
      },
      toggleUser: (userId) => {
        const state = get();
        const actor = assertAction(state, "users.manage", "Hanya Owner atau Admin HR/Finance yang dapat mengubah akun.");
        const target = state.users.find((user) => user.id === userId);
        if (!target) throw new Error("Akun tidak ditemukan.");
        if (target.id === "usr-asep" || (target.role === "Owner" && actor.role !== "Owner")) {
          throw new Error("Akun Owner utama tidak dapat dinonaktifkan.");
        }
        if (target.id === actor.id) throw new Error("Akun yang sedang digunakan tidak dapat dinonaktifkan.");
        set({ users: state.users.map((user) => (user.id === userId ? { ...user, isActive: !user.isActive } : user)) });
      },
      saveCustomer: (draft) => {
        const state = get();
        const current = state.customers.find((customer) => customer.id === draft.id);
        const actor = currentActor(state);
        const canProfile = canManageMaster(actor.role, "customer.profile");
        const canFinance = canManageMaster(actor.role, "customer.finance");
        if (!canProfile && !canFinance) throw new Error("Role ini tidak berwenang mengubah pelanggan.");
        if (!current && !canProfile) throw new Error("Hanya Sales atau Owner yang dapat menambah pelanggan.");

        const next: Customer = current
          ? { ...current }
          : {
              id: `cust-${Date.now()}`,
              code: "",
              name: "",
              contactName: "",
              category: draft.category,
              phone: "",
              address: "",
              city: "",
              paymentTermsDays: 0,
              creditLimit: 0,
              notes: "",
              isActive: false,
            };
        if (canProfile) {
          Object.assign(next, {
            code: draft.code.trim().toUpperCase(),
            name: draft.name.trim(),
            contactName: draft.contactName.trim(),
            category: draft.category,
            phone: draft.phone.trim(),
            address: draft.address.trim(),
            city: draft.city.trim(),
            notes: draft.notes.trim(),
            isActive: draft.isActive,
          });
        }
        if (canFinance) {
          next.paymentTermsDays = Math.max(0, Math.floor(draft.paymentTermsDays));
          next.creditLimit = Math.max(0, draft.creditLimit);
        }
        if (!next.code || !next.name || !next.contactName || !next.phone || !next.address || !next.city) {
          throw new Error("Kode, nama pelanggan, kontak, HP, alamat, dan kota wajib diisi.");
        }
        if (state.customers.some((customer) => customer.id !== next.id && customer.code.toLowerCase() === next.code.toLowerCase())) {
          throw new Error(`Kode pelanggan ${next.code} sudah digunakan.`);
        }
        const changes = changeList(current, next, {
          code: "Kode", name: "Nama", contactName: "Kontak", category: "Kategori", phone: "Nomor HP",
          address: "Alamat", city: "Kota", paymentTermsDays: "Tempo (hari)", creditLimit: "Batas kredit",
          notes: "Catatan", isActive: "Status aktif",
        });
        set({
          customers: current ? state.customers.map((customer) => customer.id === next.id ? next : customer) : [next, ...state.customers],
          auditLogs: changes.length ? [auditEntry(actor, "Pelanggan", next.id, `${next.code} — ${next.name}`, current ? "Diubah" : "Dibuat", changes), ...state.auditLogs] : state.auditLogs,
        });
        return next;
      },
      saveSupplier: (draft) => {
        const state = get();
        const current = state.suppliers.find((supplier) => supplier.id === draft.id);
        const actor = currentActor(state);
        const canProfile = canManageMaster(actor.role, "supplier.profile");
        const canFinance = canManageMaster(actor.role, "supplier.finance");
        if (!canProfile && !canFinance) throw new Error("Role ini tidak berwenang mengubah supplier.");
        if (!current && !canProfile) throw new Error("Hanya Purchasing atau Owner yang dapat menambah supplier.");

        const next: Supplier = current
          ? { ...current }
          : {
              id: `sup-${Date.now()}`,
              code: "",
              name: "",
              contactName: "",
              phone: "",
              address: "",
              city: "",
              paymentTermsDays: 0,
              notes: "",
              isActive: false,
            };
        if (canProfile) {
          Object.assign(next, {
            code: draft.code.trim().toUpperCase(), name: draft.name.trim(), contactName: draft.contactName.trim(),
            phone: draft.phone.trim(), address: draft.address.trim(), city: draft.city.trim(), notes: draft.notes.trim(),
            isActive: draft.isActive,
          });
        }
        if (canFinance) next.paymentTermsDays = Math.max(0, Math.floor(draft.paymentTermsDays));
        if (!next.code || !next.name || !next.contactName || !next.phone || !next.address || !next.city) {
          throw new Error("Kode, nama supplier, kontak, HP, alamat, dan kota wajib diisi.");
        }
        if (state.suppliers.some((supplier) => supplier.id !== next.id && supplier.code.toLowerCase() === next.code.toLowerCase())) {
          throw new Error(`Kode supplier ${next.code} sudah digunakan.`);
        }
        const changes = changeList(current, next, {
          code: "Kode", name: "Nama", contactName: "Kontak", phone: "Nomor HP", address: "Alamat",
          city: "Kota", paymentTermsDays: "Tempo (hari)", notes: "Catatan", isActive: "Status aktif",
        });
        set({
          suppliers: current ? state.suppliers.map((supplier) => supplier.id === next.id ? next : supplier) : [next, ...state.suppliers],
          auditLogs: changes.length ? [auditEntry(actor, "Supplier", next.id, `${next.code} — ${next.name}`, current ? "Diubah" : "Dibuat", changes), ...state.auditLogs] : state.auditLogs,
        });
        return next;
      },
      saveProduct: (draft) => {
        const state = get();
        const current = state.products.find((product) => product.id === draft.id);
        const actor = currentActor(state);
        const material = draft.type !== "Produk Jadi";
        const permissions: MasterPermission[] = material
          ? ["material.purchase", "material.stock", "material.quality"]
          : ["finished.production", "finished.stock", "finished.price", "finished.quality"];
        if (!permissions.some((permission) => canManageMaster(actor.role, permission))) {
          throw new Error("Role ini tidak berwenang mengubah master barang tersebut.");
        }
        const createPermission: MasterPermission = material ? "material.purchase" : "finished.production";
        if (!current && !canManageMaster(actor.role, createPermission)) {
          throw new Error(`Role ${actor.role} tidak dapat menambah ${material ? "Barang/Bahan" : "Barang Jadi"}.`);
        }

        const next: Product = current
          ? { ...current }
          : material
            ? {
                id: `item-${Date.now()}`,
                code: "",
                name: "",
                type: "Bahan Baku",
                purchaseUnit: "",
                purchaseContentValue: 0,
                purchaseContentUnit: "",
                stockUnit: "",
                conversionValue: 0,
                purchasePrice: 0,
                agent1Price: 0,
                agent2Price: 0,
                cost: 0,
                shelfLifeDays: 0,
                minStock: 0,
                requiresQc: true,
                notes: "",
                isActive: false,
              }
            : {
                id: `item-${Date.now()}`,
                code: "",
                name: "",
                type: "Produk Jadi",
                productType: "",
                stockUnit: "",
                conversionValue: 1,
                purchasePrice: 0,
                salesUnit: "",
                weightValue: 0,
                weightUnit: "",
                agent1Price: 0,
                agent2Price: 0,
                cost: 0,
                shelfLifeDays: 0,
                minStock: 0,
                requiresQc: true,
                notes: "",
                isActive: false,
              };
        if (material) {
          if (canManageMaster(actor.role, "material.purchase")) {
            Object.assign(next, {
              code: draft.code.trim().toUpperCase(), name: draft.name.trim(), type: draft.type,
              purchaseUnit: draft.purchaseUnit?.trim(),
              purchaseContentValue: Math.max(0, draft.purchaseContentValue ?? 0),
              purchaseContentUnit: draft.purchaseContentUnit?.trim(),
              purchasePrice: Math.max(0, draft.purchasePrice), notes: draft.notes.trim(),
            });
          }
          if (canManageMaster(actor.role, "material.stock")) {
            Object.assign(next, {
              stockUnit: draft.stockUnit.trim(), minStock: Math.max(0, draft.minStock),
              shelfLifeDays: Math.max(0, Math.floor(draft.shelfLifeDays)), isActive: draft.isActive,
            });
          }
          if (canManageMaster(actor.role, "material.quality")) next.requiresQc = draft.requiresQc;
          if (!next.purchaseUnit || !next.purchaseContentUnit || (next.purchaseContentValue ?? 0) <= 0) {
            throw new Error("Satuan beli, isi per satuan beli, dan satuan isi wajib diisi.");
          }
          const automaticConversion = next.stockUnit
            ? calculatePurchaseConversion(next.purchaseContentValue ?? 0, next.purchaseContentUnit, next.stockUnit)
            : null;
          if (next.stockUnit && automaticConversion === null) {
            throw new Error(`Satuan ${next.purchaseContentUnit} tidak dapat dikonversi otomatis ke ${next.stockUnit}. Gunakan satuan dalam kelompok yang sama.`);
          }
          if (next.isActive && (!next.stockUnit || !automaticConversion || automaticConversion <= 0)) {
            throw new Error("Satuan stok dan hasil konversi otomatis wajib valid sebelum barang diaktifkan.");
          }
          next.conversionValue = automaticConversion ?? 0;
          next.cost = next.conversionValue > 0 ? next.purchasePrice / next.conversionValue : 0;
          next.agent1Price = 0;
          next.agent2Price = 0;
          next.salesUnit = undefined;
        } else {
          if (canManageMaster(actor.role, "finished.production")) {
            Object.assign(next, {
              code: draft.code.trim().toUpperCase(), name: draft.name.trim(), type: "Produk Jadi" as const,
              productType: draft.productType?.trim(), salesUnit: draft.salesUnit?.trim(), stockUnit: draft.stockUnit.trim(),
              weightValue: Math.max(0, draft.weightValue ?? 0), weightUnit: draft.weightUnit?.trim(),
              shelfLifeDays: Math.max(0, Math.floor(draft.shelfLifeDays)), notes: draft.notes.trim(), isActive: draft.isActive,
            });
          }
          if (canManageMaster(actor.role, "finished.stock")) next.minStock = Math.max(0, draft.minStock);
          if (canManageMaster(actor.role, "finished.price")) {
            next.agent1Price = Math.max(0, draft.agent1Price);
            next.agent2Price = Math.max(0, draft.agent2Price);
          }
          next.stockUnit = next.salesUnit ?? next.stockUnit;
          next.conversionValue = 1;
          next.purchasePrice = 0;
          next.purchaseUnit = undefined;
          next.purchaseContentValue = undefined;
          next.purchaseContentUnit = undefined;
          next.requiresQc = true;
          if (!next.productType || !next.salesUnit || !next.weightUnit || (next.weightValue ?? 0) <= 0) {
            throw new Error("Jenis produk, satuan jual, berat, dan satuan berat wajib diisi.");
          }
          if (next.isActive && (next.agent1Price <= 0 || next.agent2Price <= 0)) {
            throw new Error("Barang Jadi aktif wajib memiliki Harga Agen 1 dan Harga Agen 2.");
          }
        }
        if (!next.code || !next.name) throw new Error("Kode dan nama barang wajib diisi.");
        if (state.products.some((product) => product.id !== next.id && product.code.toLowerCase() === next.code.toLowerCase())) {
          throw new Error(`Kode barang ${next.code} sudah digunakan.`);
        }
        const changes = changeList(current, next, {
          code: "Kode", name: "Nama", type: "Jenis", productType: "Jenis produk", purchaseUnit: "Satuan beli",
          purchaseContentValue: "Isi per satuan beli", purchaseContentUnit: "Satuan isi", stockUnit: "Satuan stok",
          conversionValue: "Nilai konversi otomatis", purchasePrice: "Harga beli",
          salesUnit: "Satuan jual", weightValue: "Berat", weightUnit: "Satuan berat", agent1Price: "Harga Agen 1",
          agent2Price: "Harga Agen 2", minStock: "Stok minimum", shelfLifeDays: "Umur simpan",
          requiresQc: "Wajib QC", notes: "Catatan", isActive: "Status aktif",
        });
        set({
          products: current ? state.products.map((product) => product.id === next.id ? next : product) : [next, ...state.products],
          auditLogs: changes.length ? [auditEntry(actor, material ? "Barang/Bahan" : "Barang Jadi", next.id, `${next.code} — ${next.name}`, current ? "Diubah" : "Dibuat", changes), ...state.auditLogs] : state.auditLogs,
        });
        return next;
      },
      addSale: (draft) => {
        const actor = assertAction(get(), "sales.create", "Hanya Owner atau Admin Penjualan yang dapat mencatat transaksi.");
        if (draft.salesAdminId !== actor.id) throw new Error("Transaksi harus dicatat atas nama pengguna yang sedang login.");
        const customer = get().customers.find((item) => item.id === draft.customerId);
        if (!customer) throw new Error("Pelanggan tidak ditemukan.");
        if (!customer.isActive) throw new Error("Pelanggan nonaktif tidak dapat dipilih untuk transaksi baru.");
        const lines = snapshotSaleLines(get().products, draft.items, customer);
        validateSaleLines(get().products, lines);
        const subtotal = calculateSubtotal(lines);
        const discount = validatedDiscount(subtotal, draft.discount);
        const total = subtotal - discount;
        const paidAmount = draft.paymentMethod === "Kredit/Tempo" || draft.paymentMethod === "Cicilan" ? 0 : total;
        assertCustomerCredit(get(), customer, total - paidAmount);
        const stocks = issueFinishedStock(get().stocks, draft.items);
        if (!stocks) throw new Error("Stok Barang Jadi siap jual tidak mencukupi.");
        const now = new Date();
        const dueDate = addDays(now, customer.paymentTermsDays);
        const sale: Sale = {
          id: `sale-${Date.now()}`,
          number: `POS-PST-${Date.now().toString().slice(-6)}`,
          salesAdminId: draft.salesAdminId,
          customerId: customer.id,
          customerCategory: customer.category,
          createdAt: timestamp(),
          items: lines,
          subtotal,
          discount,
          total,
          paidAmount,
          paymentMethod: draft.paymentMethod,
          orderSource: "POS",
          fulfillmentMethod: "Diambil",
          status: "Selesai",
          paymentTermsDaysSnapshot: customer.paymentTermsDays,
          creditLimitSnapshot: customer.creditLimit,
          dueDate: total > paidAmount ? dueDate : undefined,
          receivedAt: timestamp(),
          deliveryProof: "Serah terima POS",
        };
        const invoice: Invoice | null = total > paidAmount ? {
          id: `inv-${Date.now()}`,
          number: `INV-${sale.number}`,
          type: "Piutang",
          party: customer.name,
          customerId: customer.id,
          source: sale.number,
          issueDate: shortDate(),
          dueDate,
          total,
          paid: paidAmount,
          status: paidAmount > 0 ? "Dibayar Sebagian" : "Belum Bayar",
        } : null;
        set((state) => ({
          sales: [sale, ...state.sales],
          stocks,
          invoices: invoice ? [invoice, ...state.invoices] : state.invoices,
          salesShifts: state.salesShifts.map((shift) =>
            shift.salesAdminId === draft.salesAdminId && shift.status === "Buka"
              ? { ...shift, expectedCash: shift.expectedCash + (draft.paymentMethod === "Tunai" ? total : 0) }
              : shift,
          ),
        }));
        return sale;
      },
      addAgentOrder: (draft) => {
        const actor = assertAction(get(), "sales.create", "Hanya Owner atau Admin Penjualan yang dapat membuat pesanan agen.");
        if (draft.salesAdminId !== actor.id) throw new Error("Pesanan harus dicatat atas nama pengguna yang sedang login.");
        const customer = get().customers.find((item) => item.id === draft.customerId);
        if (!customer) throw new Error("Pelanggan tidak ditemukan.");
        if (!customer.isActive) throw new Error("Pelanggan nonaktif tidak dapat dipilih untuk pesanan baru.");
        const lines = snapshotSaleLines(get().products, draft.items, customer);
        validateSaleLines(get().products, lines);
        const subtotal = calculateSubtotal(lines);
        const discount = validatedDiscount(subtotal, draft.discount);
        const total = subtotal - discount;
        if (!Number.isFinite(draft.paidAmount) || draft.paidAmount < 0) throw new Error("Nilai pembayaran tidak valid.");
        const usesCredit = draft.paymentMethod === "Kredit/Tempo" || draft.paymentMethod === "Cicilan";
        const paidAmount = usesCredit ? Math.min(draft.paidAmount, total) : total;
        if (usesCredit) assertCustomerCredit(get(), customer, total - paidAmount);
        const sale: Sale = {
          id: `sale-${Date.now()}`,
          number: `SO-PST-${Date.now().toString().slice(-6)}`,
          salesAdminId: draft.salesAdminId,
          customerId: customer.id,
          customerCategory: customer.category,
          createdAt: timestamp(),
          neededAt: draft.neededAt,
          items: lines,
          subtotal,
          discount,
          total,
          paidAmount,
          paymentMethod: draft.paymentMethod,
          orderSource: draft.orderSource,
          fulfillmentMethod: draft.fulfillmentMethod,
          paymentTermsDaysSnapshot: customer.paymentTermsDays,
          creditLimitSnapshot: customer.creditLimit,
          dueDate: total > paidAmount ? addDays(new Date(draft.neededAt), customer.paymentTermsDays) : undefined,
          status: hasFinishedStock(get().stocks, draft.items) ? "Siap Dipenuhi" : "Menunggu Produksi",
        };
        set((state) => ({ sales: [sale, ...state.sales] }));
        return sale;
      },
      advanceFulfillment: (saleId) => {
        assertAction(get(), "inventory.fulfillment", "Hanya Owner atau Staff Gudang yang dapat memperbarui pemenuhan.");
        const sale = get().sales.find((item) => item.id === saleId);
        if (!sale) return;

        if (sale.status === "Menunggu Produksi") {
          if (!hasFinishedStock(get().stocks, sale.items)) return;
          set((state) => ({
            sales: state.sales.map((item) =>
              item.id === saleId ? { ...item, status: "Siap Dipenuhi" as const } : item,
            ),
          }));
          return;
        }

        if (sale.status !== "Siap Dipenuhi") return;
        const isDelivery = sale.fulfillmentMethod === "Dikirim";
        const stocks = issueFinishedStock(get().stocks, sale.items, isDelivery ? sale.id : undefined);
        if (!stocks) return;
        const customer = get().customers.find((item) => item.id === sale.customerId);
        const invoice = !isDelivery && customer && !get().invoices.some((item) => item.source === sale.number)
          ? receivableForSale(sale, customer)
          : null;
        set((state) => ({
          stocks,
          invoices: invoice ? [invoice, ...state.invoices] : state.invoices,
          sales: state.sales.map((item) =>
            item.id === saleId
              ? isDelivery
                ? { ...item, status: "Dalam Pengiriman" as const, dispatchedAt: timestamp() }
                : {
                    ...item,
                    status: "Selesai" as const,
                    receivedAt: timestamp(),
                    deliveryProof: "Serah terima langsung di pusat",
                  }
              : item,
          ),
        }));
      },
      confirmDelivery: (saleId, proof, issue, attachments = []) => {
        assertAction(get(), "inventory.fulfillment", "Hanya Owner atau Staff Gudang yang dapat mengonfirmasi penerimaan.");
        const sale = get().sales.find((item) => item.id === saleId);
        if (!sale || sale.status !== "Dalam Pengiriman") return;
        const normalizedIssue = issue?.trim();
        const customer = get().customers.find((item) => item.id === sale.customerId);
        const invoice = !normalizedIssue && customer && !get().invoices.some((item) => item.source === sale.number)
          ? receivableForSale(sale, customer)
          : null;
        set((state) => ({
          stocks: normalizedIssue ? state.stocks : state.stocks.filter((stock) => stock.referenceId !== saleId),
          invoices: invoice ? [invoice, ...state.invoices] : state.invoices,
          sales: state.sales.map((item) =>
            item.id === saleId
              ? normalizedIssue
                ? {
                    ...item,
                    status: "Bermasalah" as const,
                    deliveryProof: proof.trim() || undefined,
                    deliveryAttachments: attachments,
                    deliveryIssue: normalizedIssue,
                  }
                : {
                    ...item,
                    status: "Selesai" as const,
                    receivedAt: timestamp(),
                    deliveryProof: proof.trim() || "Konfirmasi penerimaan agen",
                    deliveryAttachments: attachments,
                    deliveryIssue: undefined,
                  }
              : item,
          ),
        }));
      },
      closeSalesShift: (shiftId, actualCash) => {
        assertAction(get(), "sales.shift.close", "Hanya Owner atau Admin Penjualan yang dapat menutup shift.");
        if (!Number.isFinite(actualCash) || actualCash < 0) throw new Error("Kas aktual tidak valid.");
        set((state) => ({
          salesShifts: state.salesShifts.map((shift) =>
            shift.id === shiftId
              ? ({ ...shift, actualCash, status: "Ditutup", closedAt: timestamp() } as SalesShift)
              : shift,
          ),
        }));
      },
      addProductionOrder: (productId, targetQty, priority) => {
        assertAction(get(), "production.create", "Hanya Owner atau Staff Produksi yang dapat membuat perintah produksi.");
        const product = get().products.find((item) => item.id === productId);
        if (!product || product.type !== "Produk Jadi" || !product.isActive) throw new Error("Produk jadi tidak ditemukan atau nonaktif.");
        if (!Number.isFinite(targetQty) || !Number.isInteger(targetQty) || targetQty <= 0) {
          throw new Error("Target produksi harus berupa bilangan bulat lebih dari nol.");
        }
        set((state) => ({
          productionOrders: [
            {
              id: `prod-${Date.now()}`,
              batchNumber: nextNumber("PRD", state.productionOrders.length),
              productId,
              recipeVersion: "v1.0",
              targetQty,
              actualQty: 0,
              wasteQty: 0,
              scheduledAt: timestamp(),
              machine: "Belum ditentukan",
              team: "Belum ditentukan",
              status: "Dijadwalkan",
              priority,
            },
            ...state.productionOrders,
          ],
        }));
      },
      advanceProduction: (productionId) => {
        assertAction(get(), "production.advance", "Hanya Owner atau Staff Produksi yang dapat menjalankan batch.");
        const production = get().productionOrders.find((item) => item.id === productionId);
        if (!production) return;
        if (production.status === "Dijadwalkan") {
          set((state) => ({
            productionOrders: state.productionOrders.map((item) =>
              item.id === productionId ? { ...item, status: "Berjalan", startedAt: timestamp() } : item,
            ),
          }));
          return;
        }
        if (production.status === "Berjalan") {
          const actualQty = Math.max(production.targetQty - Math.ceil(production.targetQty * 0.026), 0);
          const inspection: QualityInspection = {
            id: `qc-${Date.now()}`,
            number: nextNumber("QC-FG", get().qualityInspections.length),
            type: "Produk Jadi",
            reference: production.batchNumber,
            itemName: get().products.find((item) => item.id === production.productId)?.name ?? "Produk",
            lot: production.batchNumber.replace("PRD-", "LOT-"),
            inspector: "Belum ditugaskan",
            createdAt: timestamp(),
            status: "Menunggu",
            checks: [
              { name: "Berat produk", value: "Menunggu", result: "Gagal" },
              { name: "Bentuk, warna, dan kematangan", value: "Menunggu", result: "Gagal" },
              { name: "Tekstur", value: "Menunggu", result: "Gagal" },
              { name: "Kemasan, segel, dan label", value: "Menunggu", result: "Gagal" },
              { name: "Nomor batch dan kedaluwarsa", value: "Menunggu", result: "Gagal" },
            ],
          };
          set((state) => ({
            productionOrders: state.productionOrders.map((item) =>
              item.id === productionId
                ? {
                    ...item,
                    status: "Menunggu QC",
                    completedAt: timestamp(),
                    actualQty,
                    wasteQty: production.targetQty - actualQty,
                  }
                : item,
            ),
            qualityInspections: [inspection, ...state.qualityInspections],
          }));
        }
      },
      resolveInspection: (inspectionId, result) => {
        assertAction(get(), "quality.resolve", "Hanya Owner atau QC Inspector yang dapat memutuskan hasil QC.");
        const inspection = get().qualityInspections.find((item) => item.id === inspectionId);
        if (!inspection || inspection.status === "Lulus" || inspection.status === "Ditolak") return;
        let productionOrders = get().productionOrders;
        let stocks = get().stocks;
        const production = productionOrders.find((item) => item.batchNumber === inspection.reference);
        if (production) {
          productionOrders = productionOrders.map((item) =>
            item.id === production.id ? { ...item, status: result === "Lulus" ? "Selesai" : "Ditahan" } : item,
          );
          if (result === "Lulus") {
            const finishedProduct = get().products.find((item) => item.id === production.productId);
            stocks = [
              ...stocks,
              {
                id: `stk-prod-${Date.now()}`,
                productId: production.productId,
                warehouse: "Gudang Produk Jadi",
                lot: inspection.lot,
                expiryDate: new Date(Date.now() + (finishedProduct?.shelfLifeDays ?? 3) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                onHand: production.actualQty,
                reserved: 0,
                status: "Tersedia",
              },
            ];
          }
        } else {
          stocks = stocks.map((stock) =>
            stock.lot === inspection.lot
              ? {
                  ...stock,
                  warehouse: result === "Lulus"
                    ? (get().products.find((item) => item.id === stock.productId)?.type === "Kemasan" ? "Gudang Kemasan" : "Gudang Bahan Baku")
                    : result === "Ditolak" ? "Area Ditolak" : "Area Karantina",
                  status: result === "Lulus" ? ("Tersedia" as const) : result === "Ditolak" ? ("Ditolak" as const) : ("Ditahan" as const),
                }
              : stock,
          );
        }
        set((state) => ({
          qualityInspections: state.qualityInspections.map((item) =>
            item.id === inspectionId
              ? {
                  ...item,
                  status: result,
                  checks: item.checks.map((check) => ({
                    ...check,
                    result: result === "Lulus" ? "Lulus" : check.result,
                  })),
                }
              : item,
          ),
          productionOrders,
          stocks,
        }));
      },
      addPurchaseOrder: (supplierId, draftItems) => {
        assertAction(get(), "purchasing.create", "Hanya Owner atau Staff Purchasing yang dapat membuat purchase order.");
        const state = get();
        const supplier = state.suppliers.find((candidate) => candidate.id === supplierId);
        if (!supplier || !supplier.isActive) throw new Error("Supplier tidak ditemukan atau sedang nonaktif.");
        if (!draftItems.length) throw new Error("Pilih minimal satu Barang/Bahan untuk purchase order.");

        const uniqueProductIds = new Set<string>();
        const items: PurchaseOrder["items"] = draftItems.map((draft) => {
          if (uniqueProductIds.has(draft.productId)) {
            throw new Error("Barang/Bahan yang sama tidak boleh diduplikasi dalam satu PO.");
          }
          uniqueProductIds.add(draft.productId);
          const product = state.products.find((candidate) => candidate.id === draft.productId);
          if (!product || product.type === "Produk Jadi" || !product.isActive) {
            throw new Error("Barang/Bahan tidak ditemukan atau sedang nonaktif.");
          }
          if (!product.purchaseUnit || !product.purchaseContentUnit || (product.purchaseContentValue ?? 0) <= 0 || product.conversionValue <= 0) {
            throw new Error("Konversi otomatis Barang/Bahan belum lengkap atau tidak valid.");
          }
          if (!Number.isFinite(draft.quantity) || !Number.isFinite(draft.unitPrice) || draft.quantity <= 0 || draft.unitPrice <= 0) {
            throw new Error(`Jumlah dan harga beli ${product.name} harus lebih dari nol.`);
          }
          return {
            productId: product.id,
            quantity: draft.quantity,
            purchaseUnit: product.purchaseUnit,
            purchaseContentValue: product.purchaseContentValue ?? 0,
            purchaseContentUnit: product.purchaseContentUnit,
            stockUnit: product.stockUnit,
            conversionValue: product.conversionValue,
            unitPrice: draft.unitPrice,
            receivedQty: 0,
          };
        });

        const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const number = nextNumber("PO-PST", state.purchaseOrders.length);
        const order: PurchaseOrder = {
          id: `po-${Date.now()}`,
          number,
          supplierId: supplier.id,
          supplierNameSnapshot: supplier.name,
          createdAt: shortDate(),
          expectedAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          paymentTermsDaysSnapshot: supplier.paymentTermsDays,
          items,
          total,
          status: total > 3000000 ? "Menunggu Persetujuan" : "Dipesan",
        };
        const approval: Approval | null = total > 3000000
          ? {
              id: `apr-po-${Date.now()}`,
              type: "Pembelian",
              reference: number,
              title: `Pembelian ${items.length} barang dari ${supplier.name}`,
              requester: "Ratna Wulandari",
              context: "Purchasing",
              amount: total,
              requestedAt: timestamp(),
              reason: "Nilai total purchase order melewati batas persetujuan pembelian.",
              status: "Menunggu",
            }
          : null;
        set((current) => ({
          purchaseOrders: [order, ...current.purchaseOrders],
          approvals: approval ? [approval, ...current.approvals] : current.approvals,
        }));
        return order;
      },
      receivePurchaseOrder: (purchaseOrderId) => {
        assertAction(get(), "purchasing.receive", "Hanya Owner atau Staff Purchasing yang dapat menerima purchase order.");
        set((state) => {
          const order = state.purchaseOrders.find((item) => item.id === purchaseOrderId);
          if (!order || order.status === "Diterima") return state;
          const receivedAt = Date.now();
          const receivedStocks: StockItem[] = order.items.map((item, index) => {
            const product = state.products.find((candidate) => candidate.id === item.productId);
            if (!product || product.type === "Produk Jadi") throw new Error("Master Barang/Bahan pada PO tidak ditemukan.");
            const lot = `${product.code}-${shortDate().replaceAll("-", "").slice(2)}-${String(index + 1).padStart(2, "0")}`;
            const stockQuantity = item.quantity * item.conversionValue;
            return {
              id: `stk-po-${receivedAt}-${index}`,
              productId: item.productId,
              warehouse: product.requiresQc ? "Area Karantina" : product.type === "Kemasan" ? "Gudang Kemasan" : "Gudang Bahan Baku",
              lot,
              expiryDate: new Date(Date.now() + product.shelfLifeDays * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10),
              onHand: stockQuantity,
              reserved: 0,
              status: product.requiresQc ? "Karantina" : "Tersedia",
            };
          });
          const inspections: QualityInspection[] = order.items.flatMap((item, index) => {
            const product = state.products.find((candidate) => candidate.id === item.productId);
            if (!product || !product.requiresQc) return [];
            const stockQuantity = item.quantity * item.conversionValue;
            return [
              {
                id: `qc-po-${receivedAt}-${index}`,
                number: nextNumber("QC-RM", state.qualityInspections.length + index),
                type: "Bahan Masuk" as const,
                reference: order.number,
                itemName: product.name,
                lot: receivedStocks[index].lot,
                inspector: "Belum ditugaskan",
                createdAt: timestamp(),
                status: "Menunggu" as const,
                supplierId: order.supplierId,
                sampleSize: `Sesuai rencana sampling dari ${stockQuantity.toLocaleString("id-ID")} ${item.stockUnit}`,
                checks: incomingQualityChecks(product, stockQuantity),
              },
            ];
          });
          return {
            purchaseOrders: state.purchaseOrders.map((item) =>
              item.id === purchaseOrderId
                ? {
                    ...item,
                    status: "Diterima" as const,
                    items: item.items.map((line) => ({ ...line, receivedQty: line.quantity })),
                  }
                : item,
            ),
            stocks: [...state.stocks, ...receivedStocks],
            qualityInspections: [...inspections, ...state.qualityInspections],
          };
        });
      },
      addExpense: (department, category, payee, amount) => {
        assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat mencatat biaya.");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Nilai biaya harus lebih dari nol.");
        set((state) => {
          const number = nextNumber("EXP", state.expenses.length);
          const expense: Expense = {
            id: `exp-${Date.now()}`,
            number,
            department,
            category,
            payee,
            amount,
            date: shortDate(),
            status: amount > 500000 ? "Menunggu Persetujuan" : "Disetujui",
          };
          const approval: Approval | null =
            amount > 500000
              ? {
                  id: `apr-exp-${Date.now()}`,
                  type: "Biaya",
                  reference: number,
                  title: `${category} untuk ${payee}`,
                  requester: "Siti Nurhayati",
                  context: department,
                  amount,
                  requestedAt: timestamp(),
                  reason: "Nilai biaya melewati batas persetujuan operasional.",
                  status: "Menunggu",
                }
              : null;
          return {
            expenses: [expense, ...state.expenses],
            approvals: approval ? [approval, ...state.approvals] : state.approvals,
          };
        });
      },
      payInvoice: (invoiceId, amount) => {
        assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat mencatat pembayaran.");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Jumlah pembayaran harus lebih dari nol.");
        set((state) => ({
          invoices: state.invoices.map((invoice) => {
            if (invoice.id !== invoiceId) return invoice;
            const paid = Math.min(invoice.total, invoice.paid + amount);
            return { ...invoice, paid, status: paid >= invoice.total ? "Lunas" : "Dibayar Sebagian" };
          }),
        }));
      },
      addEmployee: (draft) => {
        assertAction(get(), "hr.manage", "Hanya Owner atau Admin HR/Finance yang dapat menambah karyawan.");
        set((state) => ({
          employees: [
            ...state.employees,
            {
              id: `emp-${Date.now()}`,
              number: `RH-${String(state.employees.length + 1).padStart(3, "0")}`,
              ...draft,
              attendanceStatus: "Hadir" as const,
              overtimeHours: 0,
            },
          ],
        }));
      },
      runPayroll: () => {
        assertAction(get(), "hr.manage", "Hanya Owner atau Admin HR/Finance yang dapat mengajukan payroll.");
        set((state) => {
          const draftPayrolls = state.payrolls.filter((payroll) => payroll.status === "Draft");
          if (draftPayrolls.length === 0) return state;
          const reference = `PAYROLL-${draftPayrolls[0]?.period.toUpperCase().replaceAll(" ", "-")}`;
          const alreadyRequested = state.approvals.some(
            (approval) => approval.reference === reference && approval.status === "Menunggu",
          );
          const approval: Approval = {
            id: `apr-pay-${Date.now()}`,
            type: "Payroll",
            reference,
            title: `Payroll ${draftPayrolls[0]?.period}`,
            requester: "Siti Nurhayati",
            context: "HR & Finance",
            amount: draftPayrolls.reduce((total, payroll) => total + payroll.netPay, 0),
            requestedAt: timestamp(),
            reason: `Pembayaran gaji ${draftPayrolls.length} karyawan.`,
            status: "Menunggu",
          };
          return {
            payrolls: state.payrolls.map((payroll) =>
              payroll.status === "Draft" ? { ...payroll, status: "Menunggu Persetujuan" as const } : payroll,
            ),
            approvals: alreadyRequested ? state.approvals : [approval, ...state.approvals],
          };
        });
      },
      decideApproval: (approvalId, decision) => {
        assertAction(get(), "approvals.decide", "Hanya Owner yang dapat memutuskan persetujuan.");
        const approval = get().approvals.find((item) => item.id === approvalId);
        if (!approval) return;
        set((state) => ({
          approvals: state.approvals.map((item) => (item.id === approvalId ? { ...item, status: decision } : item)),
          purchaseOrders: state.purchaseOrders.map((order) =>
            order.number === approval.reference
              ? { ...order, status: decision === "Disetujui" ? ("Dipesan" as const) : ("Draft" as const) }
              : order,
          ),
          expenses: state.expenses.map((expense) =>
            expense.number === approval.reference
              ? { ...expense, status: decision === "Disetujui" ? ("Disetujui" as const) : ("Draft" as const) }
              : expense,
          ),
          payrolls:
            approval.type === "Payroll"
              ? state.payrolls.map((payroll) =>
                  payroll.status === "Menunggu Persetujuan"
                    ? {
                        ...payroll,
                        status: decision === "Disetujui" ? ("Disetujui" as const) : ("Draft" as const),
                      }
                    : payroll,
                )
              : state.payrolls,
        }));
      },
      markNotificationRead: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          ),
        })),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
        })),
      resetDemo: () => set({ ...initialData(), hydrated: true }),
    }),
    {
      name: "erp-roti-hanan-demo-v4",
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        users: state.users,
        customers: state.customers,
        suppliers: state.suppliers,
        products: state.products,
        stocks: state.stocks,
        sales: state.sales,
        salesShifts: state.salesShifts,
        productionOrders: state.productionOrders,
        qualityInspections: state.qualityInspections,
        purchaseOrders: state.purchaseOrders,
        invoices: state.invoices,
        expenses: state.expenses,
        employees: state.employees,
        payrolls: state.payrolls,
        approvals: state.approvals,
        notifications: state.notifications,
        auditLogs: state.auditLogs,
      }),
    },
  ),
);
