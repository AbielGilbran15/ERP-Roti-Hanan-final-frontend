"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  auditLogs as seedAuditLogs,
  cashAccounts as seedCashAccounts,
  cashTransactions as seedCashTransactions,
  costOfGoodsSold as seedCostOfGoodsSold,
  customers as seedCustomers,
  employees as seedEmployees,
  expenses as seedExpenses,
  goodsReceipts as seedGoodsReceipts,
  finishedProductCategories as seedFinishedProductCategories,
  finishedProductTypes as seedFinishedProductTypes,
  finishedProductVariants as seedFinishedProductVariants,
  invoices as seedInvoices,
  materialPurchaseRequests as seedMaterialPurchaseRequests,
  notifications as seedNotifications,
  payrolls as seedPayrolls,
  products as seedProducts,
  productionOrders as seedProductionOrders,
  purchaseOrders as seedPurchaseOrders,
  sales as seedSales,
  salesShifts as seedSalesShifts,
  stockMovements as seedStockMovements,
  stocks as seedStocks,
  stockCounts as seedStockCounts,
  suppliers as seedSuppliers,
  supplierQuotations as seedSupplierQuotations,
  users as seedUsers,
} from "@/data/mock-data";
import type {
  AppNotification,
  AppUser,
  AuditLog,
  CashAccount,
  CashTransaction,
  CartLine,
  CostOfGoodsSold,
  Customer,
  DeliveryAttachment,
  Employee,
  Expense,
  GoodsReceipt,
  FinishedProductCategory,
  FinishedProductTypeDefinition,
  FinishedProductVariant,
  Invoice,
  MaterialPurchaseRequest,
  OrderSource,
  Payroll,
  ProductionOrder,
  ProductionMaterialRequirement,
  ProductionResultDraft,
  PurchaseOrder,
  Role,
  Sale,
  SalesReturn,
  SalesReturnCondition,
  SalesTarget,
  SalesShift,
  StockItem,
  StockCount,
  StockMovement,
  Supplier,
  SupplierQuotation,
  SupplierQuotationDraft,
  Product,
} from "@/lib/types";
import { canManageMaster, canPerformAction, type ActionPermission, type MasterPermission } from "@/lib/access";
import { buildFinishedProductName, productClassificationKey } from "@/lib/product-classification";
import { buildAutomaticHppForReturn, buildAutomaticHppForSale, mergeAutomaticSaleHpp } from "@/lib/finance";
import { calculatePurchaseConversion, convertUnit, getUnitDefinition } from "@/lib/units";
import { addLocalDays, localDateKey } from "@/lib/date";
import {
  assertWorkflowTransition,
  deliveryTransitions,
  expenseTransitions,
  goodsReceiptTransitions,
  payrollTransitions,
  productionTransitions,
  purchaseOrderTransitions,
  purchaseRequestTransitions,
  saleOrderTransitions,
  salesReturnTransitions,
  stockCountTransitions,
} from "@/lib/workflows";

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

export type FulfillmentStockShortage = {
  productId: string;
  productName: string;
  unit: string;
  required: number;
  available: number;
  shortage: number;
};

export type FulfillmentAdvanceResult =
  | { ok: true; status: Sale["status"]; message: string }
  | { ok: false; status: Sale["status"] | null; message: string; shortages: FulfillmentStockShortage[] };

type SalesTargetDraft = Pick<SalesTarget, "effectiveFrom" | "effectiveUntil" | "agent1DailyTarget" | "agent2DailyTarget" | "notes"> & {
  id?: string;
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
  supplierQuotations: SupplierQuotation[];
  products: Product[];
  finishedProductCategories: FinishedProductCategory[];
  finishedProductTypes: FinishedProductTypeDefinition[];
  finishedProductVariants: FinishedProductVariant[];
  stocks: StockItem[];
  stockMovements: StockMovement[];
  sales: Sale[];
  salesReturns: SalesReturn[];
  salesTargets: SalesTarget[];
  salesShifts: SalesShift[];
  productionOrders: ProductionOrder[];
  materialPurchaseRequests: MaterialPurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  stockCounts: StockCount[];
  invoices: Invoice[];
  expenses: Expense[];
  cashAccounts: CashAccount[];
  cashTransactions: CashTransaction[];
  costOfGoodsSold: CostOfGoodsSold[];
  employees: Employee[];
  payrolls: Payroll[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  setHydrated: (hydrated: boolean) => void;
  login: (identifier: string, password: string) => LoginResult;
  logout: () => void;
  addUser: (draft: UserDraft) => AppUser;
  toggleUser: (userId: string) => void;
  saveCustomer: (draft: Customer) => Customer;
  saveSupplier: (draft: Supplier) => Supplier;
  saveFinishedProductCategory: (draft: FinishedProductCategory) => FinishedProductCategory;
  saveFinishedProductType: (draft: FinishedProductTypeDefinition) => FinishedProductTypeDefinition;
  saveFinishedProductVariant: (draft: FinishedProductVariant) => FinishedProductVariant;
  saveProduct: (draft: Product) => Product;
  addSale: (draft: SaleDraft) => Sale;
  addAgentOrder: (draft: AgentOrderDraft) => Sale;
  saveSalesTarget: (draft: SalesTargetDraft) => SalesTarget;
  advanceFulfillment: (saleId: string) => FulfillmentAdvanceResult;
  confirmDelivery: (saleId: string, proof: string, issue?: string, attachments?: DeliveryAttachment[], issueType?: Sale["deliveryIssueType"]) => void;
  resolveDeliveryIssue: (saleId: string, resolution: "Diterima dengan Catatan" | "Kirim Pengganti", note: string) => void;
  createSalesReturn: (saleId: string, items: Array<{ productId: string; quantity: number; condition: SalesReturnCondition }>, reason: string) => SalesReturn;
  refundSalesReturn: (salesReturnId: string, accountId: string) => CashTransaction;
  openSalesShift: (openingCash: number) => SalesShift;
  closeSalesShift: (shiftId: string, actualCash: number) => void;
  addProductionOrder: (
    materials: Array<{ productId: string; quantity: number }>,
    priority: ProductionOrder["priority"],
    note?: string,
  ) => ProductionOrder;
  reviewProductionRequest: (productionId: string, decision: "Disetujui" | "Ditunda", deferHours?: number, note?: string) => void;
  requestMaterialPurchase: (productionId: string) => MaterialPurchaseRequest;
  confirmProductionMaterials: (productionId: string) => void;
  advanceProduction: (productionId: string) => void;
  finalizeProduction: (productionId: string, draft: ProductionResultDraft) => void;
  addSupplierQuotation: (draft: SupplierQuotationDraft) => SupplierQuotation;
  updateSupplierQuotation: (quotationId: string, draft: SupplierQuotationDraft) => SupplierQuotation;
  deleteSupplierQuotation: (quotationId: string) => void;
  addPurchaseOrder: (supplierId: string, items: PurchaseOrderDraftItem[], sourcePurchaseRequestId?: string) => PurchaseOrder;
  sendPurchaseOrder: (purchaseOrderId: string) => void;
  receivePurchaseOrder: (purchaseOrderId: string, receivedQuantities?: number[]) => GoodsReceipt;
  addCashAccount: (name: string, kind: CashAccount["kind"]) => CashAccount;
  addCashTransaction: (accountId: string, direction: CashTransaction["direction"], description: string, amount: number) => CashTransaction;
  addInvoice: (type: Invoice["type"], party: string, source: string, dueDate: string, total: number) => Invoice;
  addCostOfGoodsSold: (productId: string, quantity: number, unitCost: number, description?: string) => CostOfGoodsSold;
  addExpense: (department: string, category: string, payee: string, amount: number) => void;
  payExpense: (expenseId: string, accountId: string) => CashTransaction;
  payInvoice: (invoiceId: string, amount: number, accountId?: string) => void;
  reverseCashTransaction: (transactionId: string, reason: string) => CashTransaction;
  addEmployee: (draft: EmployeeDraft) => void;
  runPayroll: () => void;
  payPayroll: (period: string, accountId: string) => CashTransaction;
  lockPayrollPeriod: (period: string) => void;
  createStockCount: (warehouse: string) => StockCount;
  updateStockCountLine: (stockCountId: string, lineId: string, countedQty: number, reason?: string) => void;
  submitStockCount: (stockCountId: string) => void;
  postStockCount: (stockCountId: string) => void;
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
  supplierQuotations: clone(seedSupplierQuotations),
  products: clone(seedProducts),
  finishedProductCategories: clone(seedFinishedProductCategories),
  finishedProductTypes: clone(seedFinishedProductTypes),
  finishedProductVariants: clone(seedFinishedProductVariants),
  stocks: clone(seedStocks),
  stockMovements: clone(seedStockMovements),
  sales: clone(seedSales),
  salesReturns: [],
  salesTargets: [],
  salesShifts: clone(seedSalesShifts),
  productionOrders: clone(seedProductionOrders),
  materialPurchaseRequests: clone(seedMaterialPurchaseRequests),
  purchaseOrders: clone(seedPurchaseOrders),
  goodsReceipts: clone(seedGoodsReceipts),
  stockCounts: clone(seedStockCounts),
  invoices: clone(seedInvoices),
  expenses: clone(seedExpenses),
  cashAccounts: clone(seedCashAccounts),
  cashTransactions: clone(seedCashTransactions),
  costOfGoodsSold: clone(seedCostOfGoodsSold),
  employees: clone(seedEmployees),
  payrolls: clone(seedPayrolls),
  notifications: clone(seedNotifications),
  auditLogs: clone(seedAuditLogs),
});

const timestamp = () => new Date().toISOString();
const shortDate = () => localDateKey();
const nextNumber = (prefix: string, length: number) => `${prefix}-${String(length + 1).padStart(3, "0")}`;
const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  return localDateKey(next);
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

const aggregateCartLines = (items: CartLine[]) => Array.from(
  items.reduce((totals, line) => totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantity), new Map<string, number>()),
  ([productId, quantity]) => ({ productId, quantity }),
);

const fulfillmentStockPosition = (stocks: StockItem[], products: Product[], items: CartLine[]) =>
  aggregateCartLines(items).map((line): FulfillmentStockShortage => {
    const product = products.find((item) => item.id === line.productId);
    const productStocks = stocks.filter((stock) => stock.productId === line.productId);
    const available = productStocks
      .filter((stock) => stock.warehouse === "Gudang Produk Jadi" && stock.status === "Tersedia")
      .reduce((sum, stock) => sum + Math.max(stock.onHand - stock.reserved, 0), 0);
    return {
      productId: line.productId,
      productName: product?.name ?? line.productId,
      unit: product?.stockUnit ?? "unit",
      required: line.quantity,
      available,
      shortage: Math.max(line.quantity - available, 0),
    };
  });

const allocatedQuantity = (sale: Sale, productId: string) =>
  (sale.stockAllocations ?? [])
    .filter((allocation) => allocation.productId === productId)
    .reduce((sum, allocation) => sum + allocation.quantity, 0);

export const saleStockShortages = (sale: Sale, products: Product[]): FulfillmentStockShortage[] =>
  aggregateCartLines(sale.items).map((line) => {
    const product = products.find((item) => item.id === line.productId);
    const allocated = allocatedQuantity(sale, line.productId);
    return {
      productId: line.productId,
      productName: product?.name ?? line.productId,
      unit: product?.stockUnit ?? "unit",
      required: line.quantity,
      available: allocated,
      shortage: Math.max(line.quantity - allocated, 0),
    };
  });

const reserveAvailableStockForSale = (stocks: StockItem[], sale: Sale) => {
  const updatedStocks = stocks.map((stock) => ({ ...stock }));
  const allocations = [...(sale.stockAllocations ?? [])];

  for (const line of aggregateCartLines(sale.items)) {
    let remaining = Math.max(line.quantity - allocatedQuantity({ ...sale, stockAllocations: allocations }, line.productId), 0);
    const candidates = updatedStocks
      .filter((stock) => stock.productId === line.productId && stock.warehouse === "Gudang Produk Jadi" && stock.status === "Tersedia")
      .sort((a, b) => (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"));
    for (const stock of candidates) {
      if (remaining <= 0) break;
      const quantity = roundStockQuantity(Math.min(Math.max(stock.onHand - stock.reserved, 0), remaining));
      if (quantity <= 0) continue;
      stock.reserved = roundStockQuantity(stock.reserved + quantity);
      remaining = roundStockQuantity(remaining - quantity);
      allocations.push({
        id: uniqueId("sale-allocation"),
        productId: line.productId,
        stockId: stock.id,
        lot: stock.lot,
        quantity,
        productionOrderId: stock.referenceId && /^(production-|prod-)/.test(stock.referenceId) ? stock.referenceId : undefined,
        allocatedAt: timestamp(),
      });
    }
  }

  const nextSale = { ...sale, stockAllocations: allocations };
  const complete = saleStockShortages(nextSale, []).every((item) => item.shortage <= 0.000001);
  return {
    stocks: updatedStocks,
    sale: {
      ...nextSale,
      status: complete ? "Siap Dipenuhi" as const : "Menunggu Produksi" as const,
      deliveryStatus: complete ? "Siap Dikirim" as const : "Belum Disiapkan" as const,
    },
  };
};

const allocateAvailableStockToPendingSales = (stocks: StockItem[], sales: Sale[]) => {
  let nextStocks = stocks.map((stock) => ({ ...stock }));
  const nextSales = new Map(sales.map((sale) => [sale.id, { ...sale, stockAllocations: [...(sale.stockAllocations ?? [])] }]));
  const pending = [...nextSales.values()]
    .filter((sale) => sale.number.startsWith("SO-") && ["Menunggu Produksi", "Siap Dipenuhi"].includes(sale.status))
    .sort((a, b) => (a.neededAt ?? "9999").localeCompare(b.neededAt ?? "9999") || a.createdAt.localeCompare(b.createdAt));

  for (const sale of pending) {
    const result = reserveAvailableStockForSale(nextStocks, sale);
    nextStocks = result.stocks;
    nextSales.set(sale.id, result.sale);
  }
  return { stocks: nextStocks, sales: sales.map((sale) => nextSales.get(sale.id) ?? sale) };
};

const hasFinishedStock = (stocks: StockItem[], items: CartLine[]) =>
  aggregateCartLines(items).every((line) =>
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
  const issued: Array<{ productId: string; lot: string; quantity: number; fromWarehouse: string; toWarehouse?: string }> = [];

  for (const line of aggregateCartLines(items)) {
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
      if (quantity > 0) issued.push({
        productId: candidate.productId,
        lot: candidate.lot,
        quantity,
        fromWarehouse: candidate.warehouse,
        toWarehouse: transitReference ? "Barang Dalam Pengiriman" : undefined,
      });

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

  return { stocks: [...updated, ...transit], issued };
};

const issueReservedSaleStock = (stocks: StockItem[], sale: Sale, transitReference?: string) => {
  if (saleStockShortages(sale, []).some((item) => item.shortage > 0.000001)) return null;
  const updated = stocks.map((stock) => ({ ...stock }));
  const transit: StockItem[] = [];
  const issued: Array<{ productId: string; lot: string; quantity: number; fromWarehouse: string; toWarehouse?: string }> = [];

  for (const allocation of sale.stockAllocations ?? []) {
    const stock = updated.find((item) => item.id === allocation.stockId);
    if (!stock || stock.status !== "Tersedia" || stock.onHand + 0.000001 < allocation.quantity || stock.reserved + 0.000001 < allocation.quantity) {
      return null;
    }
    stock.onHand = roundStockQuantity(stock.onHand - allocation.quantity);
    stock.reserved = roundStockQuantity(stock.reserved - allocation.quantity);
    issued.push({
      productId: allocation.productId,
      lot: allocation.lot,
      quantity: allocation.quantity,
      fromWarehouse: stock.warehouse,
      toWarehouse: transitReference ? "Barang Dalam Pengiriman" : undefined,
    });
    if (transitReference) {
      transit.push({
        id: `stk-delivery-${transitReference}-${allocation.id}`,
        productId: allocation.productId,
        warehouse: "Barang Dalam Pengiriman",
        lot: allocation.lot,
        expiryDate: stock.expiryDate,
        onHand: allocation.quantity,
        reserved: 0,
        status: "Dalam Pengiriman",
        referenceId: transitReference,
      });
    }
  }

  return { stocks: [...updated.filter((stock) => stock.onHand > 0.000001), ...transit], issued };
};

const roundStockQuantity = (value: number) => Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;

const warehouseForMaterial = (_product: Product) => "Gudang Bahan";

const createStockMovement = (
  actor: AppUser,
  input: Omit<StockMovement, "id" | "actorId" | "createdAt">,
): StockMovement => ({
  ...input,
  id: uniqueId("movement"),
  actorId: actor.id,
  createdAt: timestamp(),
});

const allocationId = (productionId: string, requirementId: string, stockId: string) =>
  `${productionId}-${requirementId}-${stockId}`;

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
          id: uniqueId("usr"),
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
              id: uniqueId("cust"),
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
              id: uniqueId("sup"),
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
      saveFinishedProductCategory: (draft) => {
        const state = get();
        const actor = currentActor(state);
        if (!canManageMaster(actor.role, "finished.classification")) {
          throw new Error("Hanya Owner atau Staff Produksi yang dapat mengelola kategori Barang Jadi.");
        }
        const current = state.finishedProductCategories.find((item) => item.id === draft.id);
        const next: FinishedProductCategory = {
          id: current?.id ?? uniqueId("finished-category"),
          code: draft.code.trim().toUpperCase(),
          name: draft.name.trim(),
          requiresType: draft.requiresType,
          requiresVariant: draft.requiresVariant,
          sortOrder: Math.max(0, Math.floor(draft.sortOrder)),
          isActive: draft.isActive,
        };
        if (!next.code || !next.name) throw new Error("Kode dan nama kategori wajib diisi.");
        if (next.requiresVariant && !next.requiresType) throw new Error("Kategori yang mewajibkan varian juga harus mewajibkan tipe.");
        if (state.finishedProductCategories.some((item) => item.id !== next.id && item.code.toLowerCase() === next.code.toLowerCase())) {
          throw new Error(`Kode kategori ${next.code} sudah digunakan.`);
        }
        if (state.finishedProductCategories.some((item) => item.id !== next.id && item.name.toLowerCase() === next.name.toLowerCase())) {
          throw new Error(`Nama kategori ${next.name} sudah digunakan.`);
        }
        if (current && !next.isActive && state.products.some((product) => product.type === "Produk Jadi" && product.finishedProductCategoryId === current.id && product.isActive)) {
          throw new Error("Kategori masih digunakan SKU aktif. Nonaktifkan SKU terkait terlebih dahulu.");
        }
        if (current && (current.requiresType !== next.requiresType || current.requiresVariant !== next.requiresVariant) && state.products.some((product) => product.type === "Produk Jadi" && product.finishedProductCategoryId === current.id)) {
          throw new Error("Aturan tingkat kategori tidak dapat diubah setelah kategori dipakai SKU.");
        }
        const changes = changeList(current, next, {
          code: "Kode", name: "Nama", requiresType: "Wajib tipe", requiresVariant: "Wajib varian", sortOrder: "Urutan", isActive: "Status aktif",
        });
        const nextCategories = current
          ? state.finishedProductCategories.map((item) => item.id === next.id ? next : item)
          : [...state.finishedProductCategories, next];
        set({
          finishedProductCategories: nextCategories,
          products: state.products.map((product) => product.type === "Produk Jadi" && product.finishedProductCategoryId === next.id
            ? { ...product, name: buildFinishedProductName(product, { categories: nextCategories, types: state.finishedProductTypes, variants: state.finishedProductVariants }) }
            : product),
          auditLogs: changes.length ? [auditEntry(actor, "Klasifikasi Barang Jadi", next.id, `${next.code} — ${next.name}`, current ? "Diubah" : "Dibuat", changes), ...state.auditLogs] : state.auditLogs,
        });
        return next;
      },
      saveFinishedProductType: (draft) => {
        const state = get();
        const actor = currentActor(state);
        if (!canManageMaster(actor.role, "finished.classification")) {
          throw new Error("Hanya Owner atau Staff Produksi yang dapat mengelola tipe Barang Jadi.");
        }
        const current = state.finishedProductTypes.find((item) => item.id === draft.id);
        const category = state.finishedProductCategories.find((item) => item.id === draft.categoryId);
        if (!category) throw new Error("Kategori untuk tipe tidak ditemukan.");
        if (draft.isActive && !category.isActive) throw new Error("Tipe aktif harus berada di bawah kategori aktif.");
        if (!category.requiresType) throw new Error("Kategori ini dikonfigurasi sebagai produk langsung dan tidak menggunakan tipe.");
        const next: FinishedProductTypeDefinition = {
          id: current?.id ?? uniqueId("finished-type"),
          categoryId: category.id,
          code: draft.code.trim().toUpperCase(),
          name: draft.name.trim(),
          sortOrder: Math.max(0, Math.floor(draft.sortOrder)),
          isActive: draft.isActive,
        };
        if (!next.code || !next.name) throw new Error("Kode dan nama tipe wajib diisi.");
        if (state.finishedProductTypes.some((item) => item.id !== next.id && item.categoryId === next.categoryId && item.code.toLowerCase() === next.code.toLowerCase())) {
          throw new Error(`Kode tipe ${next.code} sudah digunakan pada kategori ini.`);
        }
        if (state.finishedProductTypes.some((item) => item.id !== next.id && item.categoryId === next.categoryId && item.name.toLowerCase() === next.name.toLowerCase())) {
          throw new Error(`Nama tipe ${next.name} sudah digunakan pada kategori ini.`);
        }
        const used = current && state.products.some((product) => product.type === "Produk Jadi" && product.finishedProductTypeId === current.id);
        if (current && current.categoryId !== next.categoryId && used) throw new Error("Tipe yang sudah dipakai SKU tidak dapat dipindahkan ke kategori lain.");
        if (current && !next.isActive && state.products.some((product) => product.finishedProductTypeId === current.id && product.isActive)) {
          throw new Error("Tipe masih digunakan SKU aktif. Nonaktifkan SKU terkait terlebih dahulu.");
        }
        const changes = changeList(current, next, { categoryId: "Kategori", code: "Kode", name: "Nama", sortOrder: "Urutan", isActive: "Status aktif" });
        const nextTypes = current
          ? state.finishedProductTypes.map((item) => item.id === next.id ? next : item)
          : [...state.finishedProductTypes, next];
        set({
          finishedProductTypes: nextTypes,
          products: state.products.map((product) => product.type === "Produk Jadi" && product.finishedProductTypeId === next.id
            ? { ...product, name: buildFinishedProductName(product, { categories: state.finishedProductCategories, types: nextTypes, variants: state.finishedProductVariants }) }
            : product),
          auditLogs: changes.length ? [auditEntry(actor, "Klasifikasi Barang Jadi", next.id, `${next.code} — ${next.name}`, current ? "Diubah" : "Dibuat", changes), ...state.auditLogs] : state.auditLogs,
        });
        return next;
      },
      saveFinishedProductVariant: (draft) => {
        const state = get();
        const actor = currentActor(state);
        if (!canManageMaster(actor.role, "finished.classification")) {
          throw new Error("Hanya Owner atau Staff Produksi yang dapat mengelola varian Barang Jadi.");
        }
        const current = state.finishedProductVariants.find((item) => item.id === draft.id);
        const productType = state.finishedProductTypes.find((item) => item.id === draft.typeId);
        if (!productType) throw new Error("Tipe untuk varian tidak ditemukan.");
        if (draft.isActive && !productType.isActive) throw new Error("Varian aktif harus berada di bawah tipe aktif.");
        const category = state.finishedProductCategories.find((item) => item.id === productType.categoryId);
        if (!category?.requiresVariant) throw new Error("Kategori dari tipe ini tidak menggunakan varian.");
        const next: FinishedProductVariant = {
          id: current?.id ?? uniqueId("finished-variant"),
          typeId: productType.id,
          code: draft.code.trim().toUpperCase(),
          name: draft.name.trim(),
          description: draft.description.trim(),
          sortOrder: Math.max(0, Math.floor(draft.sortOrder)),
          isActive: draft.isActive,
        };
        if (!next.code || !next.name) throw new Error("Kode dan nama varian wajib diisi.");
        if (state.finishedProductVariants.some((item) => item.id !== next.id && item.typeId === next.typeId && item.code.toLowerCase() === next.code.toLowerCase())) {
          throw new Error(`Kode varian ${next.code} sudah digunakan pada tipe ini.`);
        }
        if (state.finishedProductVariants.some((item) => item.id !== next.id && item.typeId === next.typeId && item.name.toLowerCase() === next.name.toLowerCase())) {
          throw new Error(`Nama varian ${next.name} sudah digunakan pada tipe ini.`);
        }
        const used = current && state.products.some((product) => product.type === "Produk Jadi" && product.finishedProductVariantId === current.id);
        if (current && current.typeId !== next.typeId && used) throw new Error("Varian yang sudah dipakai SKU tidak dapat dipindahkan ke tipe lain.");
        if (current && !next.isActive && state.products.some((product) => product.finishedProductVariantId === current.id && product.isActive)) {
          throw new Error("Varian masih digunakan SKU aktif. Nonaktifkan SKU terkait terlebih dahulu.");
        }
        const changes = changeList(current, next, { typeId: "Tipe", code: "Kode", name: "Nama", description: "Deskripsi", sortOrder: "Urutan", isActive: "Status aktif" });
        const nextVariants = current
          ? state.finishedProductVariants.map((item) => item.id === next.id ? next : item)
          : [...state.finishedProductVariants, next];
        set({
          finishedProductVariants: nextVariants,
          products: state.products.map((product) => product.type === "Produk Jadi" && product.finishedProductVariantId === next.id
            ? { ...product, name: buildFinishedProductName(product, { categories: state.finishedProductCategories, types: state.finishedProductTypes, variants: nextVariants }) }
            : product),
          auditLogs: changes.length ? [auditEntry(actor, "Klasifikasi Barang Jadi", next.id, `${next.code} — ${next.name}`, current ? "Diubah" : "Dibuat", changes), ...state.auditLogs] : state.auditLogs,
        });
        return next;
      },
      saveProduct: (draft) => {
        const state = get();
        const current = state.products.find((product) => product.id === draft.id);
        const actor = currentActor(state);
        const material = draft.type !== "Produk Jadi";
        const permissions: MasterPermission[] = material
          ? ["material.purchase", "material.stock"]
          : ["finished.production", "finished.stock", "finished.price", "finished.cost"];
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
                id: uniqueId("item"),
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
                minStockInputValue: 0,
                minStockInputUnit: "",
                minStock: 0,
                notes: "",
                isActive: false,
              }
            : {
                id: uniqueId("item"),
                code: "",
                name: "",
                type: "Produk Jadi",
                finishedProductCategoryId: "",
                finishedProductTypeId: "",
                finishedProductVariantId: "",
                stockUnit: "",
                conversionValue: 1,
                purchasePrice: 0,
                salesUnit: "",
                contentQuantity: undefined,
                contentUnit: undefined,
                packagingDescription: "",
                weightValue: 0,
                weightUnit: "",
                agent1Price: 0,
                agent2Price: 0,
                cost: 0,
                shelfLifeDays: 0,
                minStock: 0,
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
              stockUnit: draft.stockUnit.trim(),
              minStockInputValue: Math.max(0, draft.minStockInputValue ?? 0),
              minStockInputUnit: draft.purchaseContentUnit?.trim(),
              shelfLifeDays: Math.max(0, Math.floor(draft.shelfLifeDays)), isActive: draft.isActive,
            });
          }
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
          const minimumInStockUnit = next.stockUnit
            ? convertUnit(next.minStockInputValue ?? 0, next.purchaseContentUnit ?? "", next.stockUnit)
            : null;
          if (next.stockUnit && minimumInStockUnit === null) {
            throw new Error(`Stok minimum dalam ${next.purchaseContentUnit} tidak dapat dikonversi ke ${next.stockUnit}.`);
          }
          next.minStock = roundStockQuantity(minimumInStockUnit ?? 0);
          next.minStockInputUnit = next.purchaseContentUnit;
          next.agent1Price = 0;
          next.agent2Price = 0;
          next.salesUnit = undefined;
        } else {
          if (canManageMaster(actor.role, "finished.production")) {
            Object.assign(next, {
              code: draft.code.trim().toUpperCase(), name: draft.name.trim(), type: "Produk Jadi" as const,
              finishedProductCategoryId: draft.finishedProductCategoryId?.trim(),
              finishedProductTypeId: draft.finishedProductTypeId?.trim() || undefined,
              finishedProductVariantId: draft.finishedProductVariantId?.trim() || undefined,
              salesUnit: draft.salesUnit?.trim(), stockUnit: draft.stockUnit.trim(),
              contentQuantity: draft.contentQuantity && draft.contentQuantity > 0 ? Math.floor(draft.contentQuantity) : undefined,
              contentUnit: draft.contentQuantity && draft.contentQuantity > 0 ? "Roti" : undefined,
              packagingDescription: draft.packagingDescription?.trim(),
              weightValue: Math.max(0, draft.weightValue ?? 0), weightUnit: draft.weightUnit?.trim(),
              shelfLifeDays: Math.max(0, Math.floor(draft.shelfLifeDays)), notes: draft.notes.trim(), isActive: draft.isActive,
            });
          }
          if (canManageMaster(actor.role, "finished.stock")) next.minStock = Math.max(0, draft.minStock);
          if (canManageMaster(actor.role, "finished.price")) {
            next.agent1Price = Math.max(0, draft.agent1Price);
            next.agent2Price = Math.max(0, draft.agent2Price);
          }
          if (canManageMaster(actor.role, "finished.cost")) next.cost = Math.max(0, draft.cost);
          next.stockUnit = next.salesUnit ?? next.stockUnit;
          next.conversionValue = 1;
          next.purchasePrice = 0;
          next.purchaseUnit = undefined;
          next.purchaseContentValue = undefined;
          next.purchaseContentUnit = undefined;
          const category = state.finishedProductCategories.find((item) => item.id === next.finishedProductCategoryId);
          if (!category) throw new Error("Kategori Barang Jadi wajib dipilih.");
          const productType = state.finishedProductTypes.find((item) => item.id === next.finishedProductTypeId);
          const variant = state.finishedProductVariants.find((item) => item.id === next.finishedProductVariantId);
          if (category.requiresType && (!productType || productType.categoryId !== category.id)) {
            throw new Error("Pilih tipe yang berada di bawah kategori Barang Jadi tersebut.");
          }
          if (!category.requiresType && next.finishedProductTypeId) {
            throw new Error("Kategori ini tidak menggunakan tipe.");
          }
          if (category.requiresVariant && (!variant || !productType || variant.typeId !== productType.id)) {
            throw new Error("Pilih varian yang berada di bawah tipe Barang Jadi tersebut.");
          }
          if (!category.requiresVariant && next.finishedProductVariantId) {
            throw new Error("Kategori ini tidak menggunakan varian.");
          }
          if (next.isActive && (!category.isActive || (productType && !productType.isActive) || (variant && !variant.isActive))) {
            throw new Error("SKU aktif harus menggunakan kategori, tipe, dan varian yang aktif.");
          }
          if ((draft.contentQuantity ?? 0) > 0 && !Number.isInteger(draft.contentQuantity)) {
            throw new Error("Jumlah roti per box harus berupa bilangan bulat.");
          }
          const isRotiBox = category.id === "finished-category-roti-box";
          if (isRotiBox) {
            next.salesUnit = "Box";
            next.stockUnit = "Box";
          }
          next.name = buildFinishedProductName(next, {
            categories: state.finishedProductCategories,
            types: state.finishedProductTypes,
            variants: state.finishedProductVariants,
          });
          if (state.products.some((product) => product.type === "Produk Jadi" && product.id !== next.id && productClassificationKey(product) === productClassificationKey(next))) {
            throw new Error("Kombinasi kategori, tipe, dan varian tersebut sudah memiliki SKU.");
          }
          if (next.isActive && (!next.salesUnit || !next.weightUnit || (next.weightValue ?? 0) <= 0)) {
            throw new Error("Satuan jual/stok, berat, dan satuan berat wajib diisi sebelum SKU diaktifkan.");
          }
          if (next.isActive && (next.agent1Price <= 0 || next.agent2Price <= 0)) {
            throw new Error("Barang Jadi aktif wajib memiliki Harga Agen 1 dan Harga Agen 2.");
          }
          if (next.isActive && next.cost <= 0) {
            throw new Error("Barang Jadi aktif wajib memiliki HPP per satuan stok.");
          }
        }
        if (!next.code || !next.name) throw new Error("Kode dan nama barang wajib diisi.");
        if (state.products.some((product) => product.id !== next.id && product.code.toLowerCase() === next.code.toLowerCase())) {
          throw new Error(`Kode barang ${next.code} sudah digunakan.`);
        }
        const changes = changeList(current, next, {
          code: "Kode", name: "Nama", type: "Jenis", finishedProductCategoryId: "Kategori Barang Jadi",
          finishedProductTypeId: "Tipe Barang Jadi", finishedProductVariantId: "Varian Barang Jadi", purchaseUnit: "Satuan beli",
          purchaseContentValue: "Isi per satuan beli", purchaseContentUnit: "Satuan isi", stockUnit: "Satuan stok",
          conversionValue: "Nilai konversi otomatis", purchasePrice: "Harga beli",
          cost: "HPP per satuan stok", minStockInputValue: "Input stok minimum", minStockInputUnit: "Satuan input stok minimum",
          salesUnit: "Satuan jual", contentQuantity: "Jumlah roti per box", contentUnit: "Satuan isi",
          packagingDescription: "Deskripsi kemasan", weightValue: "Berat", weightUnit: "Satuan berat", agent1Price: "Harga Agen 1",
          agent2Price: "Harga Agen 2", minStock: "Stok minimum", shelfLifeDays: "Umur simpan",
          notes: "Catatan", isActive: "Status aktif",
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
        const activeShifts = get().salesShifts.filter((shift) => shift.salesAdminId === actor.id && shift.status === "Buka");
        if (activeShifts.length !== 1) throw new Error(activeShifts.length ? "Terdapat lebih dari satu shift aktif. Tutup shift duplikat sebelum mencatat POS." : "Buka shift POS sebelum mencatat transaksi.");
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
        const stockIssue = issueFinishedStock(get().stocks, draft.items);
        if (!stockIssue) throw new Error("Stok Barang Jadi siap jual tidak mencukupi.");
        const now = new Date();
        const dueDate = addDays(now, customer.paymentTermsDays);
        const sale: Sale = {
          id: uniqueId("sale"),
          number: nextNumber("POS-PST", get().sales.length),
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
          deliveryStatus: "Diterima",
          paymentTermsDaysSnapshot: customer.paymentTermsDays,
          creditLimitSnapshot: customer.creditLimit,
          dueDate: total > paidAmount ? dueDate : undefined,
          receivedAt: timestamp(),
          deliveryProof: "Serah terima POS",
        };
        const invoice: Invoice | null = total > paidAmount ? {
          id: uniqueId("inv"),
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
        const saleMovements = stockIssue.issued.map((issued) => {
          const product = get().products.find((item) => item.id === issued.productId)!;
          return createStockMovement(actor, {
            type: "Penjualan", productId: issued.productId, lot: issued.lot, quantity: issued.quantity,
            unit: product.stockUnit, fromWarehouse: issued.fromWarehouse, reference: sale.number,
            notes: "Barang diserahkan melalui POS.",
          });
        });
        set((state) => ({
          sales: [sale, ...state.sales],
          costOfGoodsSold: mergeAutomaticSaleHpp(state.costOfGoodsSold, sale, state.products),
          stocks: stockIssue.stocks,
          stockMovements: [...saleMovements.reverse(), ...state.stockMovements],
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
          id: uniqueId("sale"),
          number: nextNumber("SO-PST", get().sales.length),
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
          status: "Menunggu Produksi",
          deliveryStatus: "Belum Disiapkan",
          stockAllocations: [],
        };
        const reserved = reserveAvailableStockForSale(get().stocks, sale);
        set((state) => ({ stocks: reserved.stocks, sales: [reserved.sale, ...state.sales] }));
        return reserved.sale;
      },
      saveSalesTarget: (draft) => {
        const state = get();
        const actor = assertAction(state, "analytics.target.manage", "Hanya Owner atau Admin HR/Finance yang dapat mengatur target penjualan.");
        const current = draft.id ? state.salesTargets.find((item) => item.id === draft.id) : undefined;
        if (draft.id && !current) throw new Error("Target penjualan tidak ditemukan.");
        const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
        if (!validDate(draft.effectiveFrom) || !validDate(draft.effectiveUntil)) throw new Error("Periode target tidak valid.");
        if (draft.effectiveFrom > draft.effectiveUntil) throw new Error("Tanggal selesai tidak boleh mendahului tanggal mulai.");
        const validAmount = (value: number) => Number.isFinite(value) && Number.isInteger(value) && value >= 0;
        if (!validAmount(draft.agent1DailyTarget) || !validAmount(draft.agent2DailyTarget)) {
          throw new Error("Target harian harus berupa rupiah bulat nol atau lebih.");
        }
        if (draft.agent1DailyTarget + draft.agent2DailyTarget <= 0) throw new Error("Total target harian pusat harus lebih dari nol.");
        const overlaps = state.salesTargets.some((item) =>
          item.id !== draft.id && draft.effectiveFrom <= item.effectiveUntil && draft.effectiveUntil >= item.effectiveFrom,
        );
        if (overlaps) throw new Error("Periode target bertumpang tindih dengan target yang sudah tersimpan.");

        const now = timestamp();
        const target: SalesTarget = {
          id: current?.id ?? uniqueId("sales-target"),
          effectiveFrom: draft.effectiveFrom,
          effectiveUntil: draft.effectiveUntil,
          agent1DailyTarget: draft.agent1DailyTarget,
          agent2DailyTarget: draft.agent2DailyTarget,
          notes: draft.notes.trim(),
          createdBy: current?.createdBy ?? actor.id,
          createdAt: current?.createdAt ?? now,
          updatedBy: actor.id,
          updatedAt: now,
        };
        const changes = changeList(current, target, {
          effectiveFrom: "Berlaku mulai",
          effectiveUntil: "Berlaku sampai",
          agent1DailyTarget: "Target harian Agen 1",
          agent2DailyTarget: "Target harian Agen 2",
          notes: "Catatan",
        });
        set((currentState) => ({
          salesTargets: current
            ? currentState.salesTargets.map((item) => item.id === target.id ? target : item)
            : [target, ...currentState.salesTargets],
          auditLogs: [auditEntry(actor, "Target Penjualan", target.id, `${target.effectiveFrom} s.d. ${target.effectiveUntil}`, current ? "Diubah" : "Dibuat", changes), ...currentState.auditLogs],
        }));
        return target;
      },
      advanceFulfillment: (saleId) => {
        const actor = assertAction(get(), "inventory.fulfillment", "Hanya Owner atau Staff Gudang yang dapat memperbarui pemenuhan.");
        const sale = get().sales.find((item) => item.id === saleId);
        if (!sale) return { ok: false, status: null, message: "Pesanan tidak ditemukan.", shortages: [] };

        if (sale.status === "Menunggu Produksi") {
          const reserved = reserveAvailableStockForSale(get().stocks, sale);
          const shortages = saleStockShortages(reserved.sale, get().products).filter((item) => item.shortage > 0);
          if (shortages.length) {
            set((state) => ({
              stocks: reserved.stocks,
              sales: state.sales.map((item) => item.id === sale.id ? reserved.sale : item),
            }));
            return {
              ok: false,
              status: sale.status,
              message: `${shortages.length} jenis produk belum memiliki stok siap jual yang cukup.`,
              shortages,
            };
          }
          assertWorkflowTransition("pesanan penjualan", saleOrderTransitions, sale.status, "Siap Dipenuhi");
          if (sale.deliveryStatus) assertWorkflowTransition("pengiriman", deliveryTransitions, sale.deliveryStatus, "Siap Dikirim");
          set((state) => ({
            stocks: reserved.stocks,
            sales: state.sales.map((item) =>
              item.id === saleId ? reserved.sale : item,
            ),
          }));
          return { ok: true, status: "Siap Dipenuhi", message: "Seluruh produk tersedia; pesanan siap dipenuhi." };
        }

        if (sale.status !== "Siap Dipenuhi") {
          return { ok: false, status: sale.status, message: `Status ${sale.status} tidak dapat diproses dengan tindakan ini.`, shortages: [] };
        }
        const isDelivery = sale.fulfillmentMethod === "Dikirim";
        const nextSaleStatus = isDelivery ? "Dalam Pengiriman" as const : "Selesai" as const;
        assertWorkflowTransition("pesanan penjualan", saleOrderTransitions, sale.status, nextSaleStatus);
        if (sale.deliveryStatus) assertWorkflowTransition("pengiriman", deliveryTransitions, sale.deliveryStatus, isDelivery ? "Dikirim" : "Diterima");
        const stockIssue = issueReservedSaleStock(get().stocks, sale, isDelivery ? sale.id : undefined);
        if (!stockIssue) {
          return {
            ok: false,
            status: sale.status,
            message: "Stok berubah dan tidak lagi mencukupi. Periksa posisi stok terbaru.",
            shortages: saleStockShortages(sale, get().products).filter((item) => item.shortage > 0),
          };
        }
        const customer = get().customers.find((item) => item.id === sale.customerId);
        const invoice = !isDelivery && customer && !get().invoices.some((item) => item.source === sale.number)
          ? receivableForSale(sale, customer)
          : null;
        const movements = stockIssue.issued.map((issued) => {
          const product = get().products.find((item) => item.id === issued.productId)!;
          return createStockMovement(actor, {
            type: isDelivery ? "Pengiriman" : "Penjualan", productId: issued.productId, lot: issued.lot,
            quantity: issued.quantity, unit: product.stockUnit, fromWarehouse: issued.fromWarehouse,
            toWarehouse: issued.toWarehouse, reference: sale.number,
            notes: isDelivery ? "Barang diberangkatkan dan masih menjadi stok dalam pengiriman." : "Barang diserahkan langsung kepada agen.",
          });
        });
        const completedAt = timestamp();
        set((state) => {
          const postedSale: Sale = isDelivery
            ? { ...sale, status: "Dalam Pengiriman", deliveryStatus: "Dikirim", dispatchedAt: completedAt }
            : { ...sale, status: "Selesai", deliveryStatus: "Diterima", receivedAt: completedAt, deliveryProof: "Serah terima langsung di pusat" };
          return {
            stocks: stockIssue.stocks,
            stockMovements: [...movements.reverse(), ...state.stockMovements],
            invoices: invoice ? [invoice, ...state.invoices] : state.invoices,
            sales: state.sales.map((item) => item.id === saleId ? postedSale : item),
            costOfGoodsSold: isDelivery
              ? state.costOfGoodsSold
              : mergeAutomaticSaleHpp(state.costOfGoodsSold, postedSale, state.products),
          };
        });
        return {
          ok: true,
          status: nextSaleStatus,
          message: isDelivery ? "Barang dipindahkan ke stok dalam pengiriman." : "Serah-terima selesai dan stok telah dikurangi.",
        };
      },
      confirmDelivery: (saleId, proof, issue, attachments = [], issueType = "Rusak") => {
        const actor = assertAction(get(), "inventory.fulfillment", "Hanya Owner atau Staff Gudang yang dapat mengonfirmasi penerimaan.");
        const sale = get().sales.find((item) => item.id === saleId);
        if (!sale || sale.status !== "Dalam Pengiriman") return;
        const normalizedIssue = issue?.trim();
        const nextSaleStatus = normalizedIssue ? "Bermasalah" as const : "Selesai" as const;
        const nextDeliveryStatus = normalizedIssue ? "Bermasalah" as const : "Diterima" as const;
        assertWorkflowTransition("pesanan penjualan", saleOrderTransitions, sale.status, nextSaleStatus);
        if (sale.deliveryStatus) assertWorkflowTransition("pengiriman", deliveryTransitions, sale.deliveryStatus, nextDeliveryStatus);
        const customer = get().customers.find((item) => item.id === sale.customerId);
        const invoice = !normalizedIssue && customer && !get().invoices.some((item) => item.source === sale.number)
          ? receivableForSale(sale, customer)
          : null;
        const deliveryMovements = normalizedIssue ? [] : get().stocks
          .filter((stock) => stock.referenceId === saleId && stock.status === "Dalam Pengiriman")
          .map((stock) => {
            const product = get().products.find((item) => item.id === stock.productId)!;
            return createStockMovement(actor, {
              type: "Penjualan", productId: stock.productId, lot: stock.lot, quantity: stock.onHand,
              unit: product.stockUnit, fromWarehouse: "Barang Dalam Pengiriman", toWarehouse: "Agen",
              reference: sale.number, notes: "Penerimaan agen dikonfirmasi dengan bukti pengiriman.",
            });
          });
        const completedAt = timestamp();
        set((state) => {
          const postedSale: Sale = normalizedIssue
            ? {
                ...sale,
                status: "Bermasalah",
                deliveryStatus: "Bermasalah",
                deliveryProof: proof.trim() || undefined,
                deliveryAttachments: attachments,
                deliveryIssue: normalizedIssue,
                deliveryIssueType: issueType,
              }
            : {
                ...sale,
                status: "Selesai",
                deliveryStatus: "Diterima",
                receivedAt: completedAt,
                deliveryProof: proof.trim() || "Konfirmasi penerimaan agen",
                deliveryAttachments: attachments,
                deliveryIssue: undefined,
                deliveryIssueType: undefined,
              };
          return {
            stocks: normalizedIssue ? state.stocks : state.stocks.filter((stock) => stock.referenceId !== saleId),
            stockMovements: deliveryMovements.length ? [...deliveryMovements.reverse(), ...state.stockMovements] : state.stockMovements,
            invoices: invoice ? [invoice, ...state.invoices] : state.invoices,
            sales: state.sales.map((item) => item.id === saleId ? postedSale : item),
            costOfGoodsSold: normalizedIssue
              ? state.costOfGoodsSold
              : mergeAutomaticSaleHpp(state.costOfGoodsSold, postedSale, state.products),
          };
        });
      },
      resolveDeliveryIssue: (saleId, resolution, note) => {
        const actor = assertAction(get(), "inventory.fulfillment", "Hanya Owner atau Staff Gudang yang dapat menyelesaikan masalah pengiriman.");
        const state = get();
        const sale = state.sales.find((item) => item.id === saleId);
        if (!sale || sale.status !== "Bermasalah" || sale.deliveryStatus !== "Bermasalah") {
          throw new Error("Pengiriman bermasalah tidak ditemukan atau sudah diselesaikan.");
        }
        if (!note.trim()) throw new Error("Catatan penyelesaian pengiriman wajib diisi.");
        const transitStocks = state.stocks.filter((stock) => stock.referenceId === sale.id && stock.status === "Dalam Pengiriman");
        if (!transitStocks.length) throw new Error("Stok dalam pengiriman untuk pesanan ini tidak ditemukan.");
        const nextSaleStatus = resolution === "Kirim Pengganti" ? "Siap Dipenuhi" as const : "Selesai" as const;
        const nextDeliveryStatus = resolution === "Kirim Pengganti" ? "Siap Dikirim" as const : "Diterima" as const;
        assertWorkflowTransition("pesanan penjualan", saleOrderTransitions, sale.status, nextSaleStatus);
        assertWorkflowTransition("pengiriman", deliveryTransitions, sale.deliveryStatus, nextDeliveryStatus);
        const movements = transitStocks.map((stock) => {
          const product = state.products.find((item) => item.id === stock.productId)!;
          return createStockMovement(actor, {
            type: resolution === "Kirim Pengganti" ? "Kerusakan Pengiriman" : "Penjualan",
            productId: stock.productId,
            lot: stock.lot,
            quantity: stock.onHand,
            unit: product.stockUnit,
            fromWarehouse: "Barang Dalam Pengiriman",
            toWarehouse: resolution === "Kirim Pengganti" ? "Area Klaim Pengiriman" : "Agen",
            reference: sale.number,
            notes: note.trim(),
          });
        });
        const customer = state.customers.find((item) => item.id === sale.customerId);
        const invoice = resolution !== "Kirim Pengganti" && customer && !state.invoices.some((item) => item.source === sale.number)
          ? receivableForSale(sale, customer)
          : null;
        const resolvedAt = timestamp();
        set((current) => {
          const postedSale: Sale = {
            ...sale,
            status: nextSaleStatus,
            deliveryStatus: nextDeliveryStatus,
            deliveryResolution: resolution,
            deliveryResolutionNote: note.trim(),
            deliveryResolvedBy: actor.id,
            deliveryResolvedAt: resolvedAt,
            receivedAt: resolution === "Diterima dengan Catatan" ? resolvedAt : undefined,
          };
          return {
            stocks: current.stocks.filter((stock) => !(stock.referenceId === sale.id && stock.status === "Dalam Pengiriman")),
            stockMovements: [...movements.reverse(), ...current.stockMovements],
            invoices: invoice ? [invoice, ...current.invoices] : current.invoices,
            sales: current.sales.map((item) => item.id === sale.id ? postedSale : item),
            costOfGoodsSold: resolution === "Diterima dengan Catatan"
              ? mergeAutomaticSaleHpp(current.costOfGoodsSold, postedSale, current.products)
              : current.costOfGoodsSold,
            auditLogs: [auditEntry(actor, "Pengiriman", sale.id, sale.number, "Diubah", [`Resolusi: ${resolution}`, `Catatan: ${note.trim()}`]), ...current.auditLogs],
          };
        });
      },
      createSalesReturn: (saleId, draftItems, reason) => {
        const actor = currentActor(get());
        if (!canPerformAction(actor.role, "sales.create") && !canPerformAction(actor.role, "inventory.fulfillment")) {
          throw new Error("Hanya Owner, Admin Penjualan, atau Staff Gudang yang dapat mencatat retur penjualan.");
        }
        const state = get();
        const sale = state.sales.find((item) => item.id === saleId);
        if (!sale || !["Selesai", "Bermasalah", "Retur Sebagian"].includes(sale.status)) throw new Error("Penjualan belum dapat diretur.");
        if (!reason.trim()) throw new Error("Alasan retur wajib diisi.");
        if (!draftItems.length) throw new Error("Pilih minimal satu barang untuk diretur.");
        const previousReturns = state.salesReturns.filter((item) => item.saleId === sale.id);
        const returnedByProduct = new Map<string, number>();
        previousReturns.flatMap((item) => item.items).forEach((item) => returnedByProduct.set(item.productId, (returnedByProduct.get(item.productId) ?? 0) + item.quantity));
        const seen = new Set<string>();
        const number = nextNumber("RET-PST", state.salesReturns.length);
        const items: SalesReturn["items"] = draftItems.map((draft) => {
          if (seen.has(draft.productId)) throw new Error("Produk retur tidak boleh diduplikasi.");
          seen.add(draft.productId);
          const saleLine = sale.items.find((item) => item.productId === draft.productId);
          if (!saleLine) throw new Error("Produk retur tidak ditemukan pada transaksi asal.");
          const remaining = saleLine.quantity - (returnedByProduct.get(draft.productId) ?? 0);
          if (!Number.isFinite(draft.quantity) || !Number.isInteger(draft.quantity) || draft.quantity <= 0 || draft.quantity > remaining) {
            throw new Error(`Jumlah retur harus antara 1 dan ${remaining}.`);
          }
          return {
            productId: draft.productId,
            quantity: draft.quantity,
            unitPrice: saleLine.unitPrice,
            condition: draft.condition,
            stockItemId: uniqueId("stock-sales-return"),
          };
        });
        const grossReturnValue = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const returnValue = Math.round(grossReturnValue * (sale.subtotal > 0 ? sale.total / sale.subtotal : 1));
        const invoice = state.invoices.find((item) => item.source === sale.number && item.type === "Piutang");
        const nextInvoiceTotal = invoice ? Math.max(invoice.total - returnValue, 0) : undefined;
        const invoiceOverpayment = invoice && nextInvoiceTotal !== undefined ? Math.max(invoice.paid - nextInvoiceTotal, 0) : 0;
        const committedRefund = previousReturns.reduce((sum, item) => sum + item.refundAmount, 0);
        const refundAmount = invoice ? invoiceOverpayment : Math.min(returnValue, Math.max(sale.paidAmount - committedRefund, 0));
        const salesReturn: SalesReturn = {
          id: uniqueId("sales-return"), number, saleId: sale.id, saleNumber: sale.number, customerId: sale.customerId,
          createdBy: actor.id, createdAt: timestamp(), reason: reason.trim(), items, returnValue, refundAmount,
          status: refundAmount > 0 ? "Menunggu Refund" : "Selesai", receivedAt: timestamp(),
        };
        const hppReversals = buildAutomaticHppForReturn(salesReturn, state.products);
        const returnStocks: StockItem[] = items.map((item) => ({
          id: item.stockItemId,
          productId: item.productId,
          warehouse: item.condition === "Layak Jual" ? "Gudang Produk Jadi" : "Area Retur Rusak",
          lot: `RET-${number.replaceAll("-", "")}-${item.productId.slice(-6).toUpperCase()}`,
          onHand: item.quantity,
          reserved: 0,
          status: item.condition === "Layak Jual" ? "Tersedia" : "Rusak",
          referenceId: salesReturn.id,
        }));
        const movements = items.map((item) => {
          const product = state.products.find((candidate) => candidate.id === item.productId)!;
          const stock = returnStocks.find((candidate) => candidate.id === item.stockItemId)!;
          return createStockMovement(actor, {
            type: "Retur Penjualan", productId: item.productId, lot: stock.lot, quantity: item.quantity,
            unit: product.stockUnit, fromWarehouse: "Agen", toWarehouse: stock.warehouse,
            reference: number, notes: `${item.condition}. ${reason.trim()}`,
          });
        });
        const totalReturned = sale.items.every((line) => (returnedByProduct.get(line.productId) ?? 0) + (items.find((item) => item.productId === line.productId)?.quantity ?? 0) >= line.quantity);
        const nextStatus = totalReturned ? "Diretur" as const : "Retur Sebagian" as const;
        assertWorkflowTransition("pesanan penjualan", saleOrderTransitions, sale.status, nextStatus);
        const transitStocks = state.stocks.filter((stock) => stock.referenceId === sale.id && stock.status === "Dalam Pengiriman");
        if (sale.deliveryStatus === "Bermasalah") assertWorkflowTransition("pengiriman", deliveryTransitions, sale.deliveryStatus, "Diterima");
        const pendingReturnByProduct = new Map(items.map((item) => [item.productId, item.quantity]));
        const acceptedMovements = transitStocks.flatMap((stock) => {
          const returnedQuantity = Math.min(stock.onHand, pendingReturnByProduct.get(stock.productId) ?? 0);
          pendingReturnByProduct.set(stock.productId, Math.max((pendingReturnByProduct.get(stock.productId) ?? 0) - returnedQuantity, 0));
          const acceptedQuantity = stock.onHand - returnedQuantity;
          if (acceptedQuantity <= 0) return [];
          const product = state.products.find((item) => item.id === stock.productId)!;
          return [createStockMovement(actor, {
            type: "Penjualan", productId: stock.productId, lot: stock.lot, quantity: acceptedQuantity,
            unit: product.stockUnit, fromWarehouse: "Barang Dalam Pengiriman", toWarehouse: "Agen",
            reference: sale.number, notes: `Sisa barang diterima; sebagian diproses melalui ${number}.`,
          })];
        });
        set((current) => ({
          salesReturns: [salesReturn, ...current.salesReturns],
          costOfGoodsSold: [...hppReversals, ...current.costOfGoodsSold],
          stocks: [...current.stocks.filter((stock) => !transitStocks.some((transit) => transit.id === stock.id)), ...returnStocks],
          stockMovements: [...acceptedMovements, ...movements.reverse(), ...current.stockMovements],
          invoices: invoice ? current.invoices.map((item) => item.id === invoice.id ? {
            ...item,
            total: nextInvoiceTotal!,
            paid: Math.min(item.paid, nextInvoiceTotal!),
            status: nextInvoiceTotal === 0 || Math.min(item.paid, nextInvoiceTotal!) >= nextInvoiceTotal! ? "Lunas" as const : Math.min(item.paid, nextInvoiceTotal!) > 0 ? "Dibayar Sebagian" as const : "Belum Bayar" as const,
          } : item) : current.invoices,
          sales: current.sales.map((item) => item.id === sale.id ? {
            ...item, status: nextStatus, deliveryStatus: item.deliveryStatus === "Bermasalah" ? "Diterima" as const : item.deliveryStatus,
            deliveryResolution: "Retur", deliveryResolutionNote: reason.trim(), deliveryResolvedBy: actor.id,
            deliveryResolvedAt: timestamp(), salesReturnId: salesReturn.id,
          } : item),
          auditLogs: [auditEntry(actor, "Retur Penjualan", salesReturn.id, salesReturn.number, "Dibuat", [`Transaksi: ${sale.number}`, `Nilai retur: ${returnValue}`, `Refund: ${refundAmount}`]), ...current.auditLogs],
        }));
        return salesReturn;
      },
      refundSalesReturn: (salesReturnId, accountId) => {
        const actor = assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat memproses refund.");
        const state = get();
        const salesReturn = state.salesReturns.find((item) => item.id === salesReturnId);
        if (!salesReturn) throw new Error("Dokumen retur penjualan tidak ditemukan.");
        if (salesReturn.status !== "Menunggu Refund" || salesReturn.refundAmount <= 0) throw new Error("Retur ini tidak memiliki refund aktif.");
        const account = state.cashAccounts.find((item) => item.id === accountId);
        if (!account) throw new Error("Akun refund tidak ditemukan.");
        if (account.balance < salesReturn.refundAmount) throw new Error(`Saldo ${account.name} tidak mencukupi.`);
        assertWorkflowTransition("retur penjualan", salesReturnTransitions, salesReturn.status, "Selesai");
        const transaction: CashTransaction = {
          id: uniqueId("cash-transaction"), number: nextNumber("KAS", state.cashTransactions.length), accountId,
          direction: "Keluar", amount: salesReturn.refundAmount, description: `Refund ${salesReturn.number}`,
          source: salesReturn.number, date: shortDate(), status: "Aktif", createdBy: actor.id,
        };
        set((current) => ({
          salesReturns: current.salesReturns.map((item) => item.id === salesReturn.id ? {
            ...item, status: "Selesai", refundAccountId: account.id, refundTransactionId: transaction.id,
            refundedBy: actor.id, refundedAt: timestamp(),
          } : item),
          sales: current.sales.map((item) => item.id === salesReturn.saleId ? { ...item, paidAmount: Math.max(item.paidAmount - salesReturn.refundAmount, 0) } : item),
          cashTransactions: [transaction, ...current.cashTransactions],
          cashAccounts: current.cashAccounts.map((item) => item.id === account.id ? { ...item, balance: item.balance - salesReturn.refundAmount, updatedAt: timestamp() } : item),
          auditLogs: [auditEntry(actor, "Retur Penjualan", salesReturn.id, salesReturn.number, "Diubah", [`Refund dibayar dari ${account.name}`, `Nilai: ${salesReturn.refundAmount}`]), ...current.auditLogs],
        }));
        return transaction;
      },
      openSalesShift: (openingCash) => {
        const actor = assertAction(get(), "sales.shift.close", "Hanya Owner atau Admin Penjualan yang dapat membuka shift.");
        if (!Number.isFinite(openingCash) || openingCash < 0) throw new Error("Kas awal harus berupa angka nol atau lebih.");
        if (get().salesShifts.some((shift) => shift.salesAdminId === actor.id && shift.status === "Buka")) {
          throw new Error("Pengguna ini masih memiliki shift POS aktif.");
        }
        const shift: SalesShift = {
          id: uniqueId("sales-shift"),
          salesAdminId: actor.id,
          openedAt: timestamp(),
          openingCash,
          expectedCash: openingCash,
          status: "Buka",
        };
        set((state) => ({ salesShifts: [shift, ...state.salesShifts] }));
        return shift;
      },
      closeSalesShift: (shiftId, actualCash) => {
        const actor = assertAction(get(), "sales.shift.close", "Hanya Owner atau Admin Penjualan yang dapat menutup shift.");
        if (!Number.isFinite(actualCash) || actualCash < 0) throw new Error("Kas aktual tidak valid.");
        const shift = get().salesShifts.find((item) => item.id === shiftId);
        if (!shift) throw new Error("Shift POS tidak ditemukan.");
        if (shift.status !== "Buka") throw new Error("Shift POS sudah ditutup.");
        if (actor.role !== "Owner" && shift.salesAdminId !== actor.id) throw new Error("Admin Penjualan hanya dapat menutup shift miliknya sendiri.");
        set((state) => ({
          salesShifts: state.salesShifts.map((shift) =>
            shift.id === shiftId
              ? ({ ...shift, actualCash, status: "Ditutup", closedAt: timestamp() } as SalesShift)
              : shift,
          ),
        }));
      },
      addProductionOrder: (materialDrafts, priority, note = "") => {
        const state = get();
        const actor = assertAction(state, "production.create", "Hanya Owner atau Staff Produksi yang dapat membuat perintah produksi.");
        if (!materialDrafts.length) throw new Error("Pilih minimal satu Bahan Baku, Bahan Baku Toping, atau Kemasan.");
        const seenProducts = new Set<string>();
        const materials: ProductionMaterialRequirement[] = materialDrafts.map((draft) => {
          const product = state.products.find((item) => item.id === draft.productId);
          if (!product || product.type === "Produk Jadi" || !product.isActive) throw new Error("Barang/Bahan produksi tidak ditemukan atau nonaktif.");
          if (seenProducts.has(product.id)) throw new Error(`${product.name} tidak boleh diminta dua kali dalam batch yang sama.`);
          seenProducts.add(product.id);
          if (!Number.isFinite(draft.quantity) || draft.quantity <= 0) throw new Error(`Jumlah ${product.name} harus lebih dari nol.`);
          const family = getUnitDefinition(product.stockUnit)?.family;
          if ((family === "Jumlah" || family === "Kemasan") && !Number.isInteger(draft.quantity)) {
            throw new Error(`Jumlah ${product.name} dalam ${product.stockUnit} harus berupa bilangan bulat.`);
          }
          return {
            id: uniqueId("requirement"),
            materialProductId: product.id,
            role: product.type,
            requestedQty: roundStockQuantity(draft.quantity),
            shortageQty: 0,
            allocations: [],
          };
        });

        const productionId = uniqueId("production");
        const batchNumber = nextNumber("PRD", state.productionOrders.length);
        const materialRequestNumber = nextNumber("MR-PRD", state.productionOrders.length);
        const materialRequestedAt = timestamp();
        const order: ProductionOrder = {
          id: productionId,
          batchNumber,
          materials,
          outputs: [],
          materialRequestNumber,
          materialRequestedAt,
          materialRequestExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          scheduledAt: materialRequestedAt,
          machine: "Belum ditentukan",
          team: "Belum ditentukan",
          status: "Menunggu Gudang",
          priority,
          resultNotes: note.trim() || undefined,
        };
        set({
          productionOrders: [order, ...state.productionOrders],
          notifications: [{
            id: uniqueId("notification"),
            title: "Permintaan bahan produksi baru",
            message: `${materialRequestNumber} untuk ${batchNumber} menunggu pemeriksaan dan keputusan Gudang.`,
            type: "warning",
            module: "Inventori & Gudang",
            createdAt: materialRequestedAt,
            read: false,
          }, ...state.notifications],
          auditLogs: [auditEntry(actor, "Produksi", order.id, order.batchNumber, "Dibuat", [`${materials.length} jenis barang diminta manual`, `Prioritas: ${priority}`]), ...state.auditLogs],
        });
        return order;
      },
      reviewProductionRequest: (productionId, decision, deferHours = 2, note = "") => {
        const state = get();
        const actor = assertAction(state, "inventory.production.review", "Hanya Owner atau Staff Gudang yang dapat meninjau permintaan bahan produksi.");
        const production = state.productionOrders.find((item) => item.id === productionId);
        if (!production) throw new Error("Batch produksi tidak ditemukan.");
        if (!["Menunggu Gudang", "Ditunda Gudang", "Kekurangan Bahan", "Menunggu Pembelian"].includes(production.status)) {
          throw new Error("Permintaan bahan ini sudah tidak berada pada antrean keputusan Gudang.");
        }
        if (decision === "Ditunda") {
          assertWorkflowTransition("produksi", productionTransitions, production.status, "Ditunda Gudang");
          if (!Number.isFinite(deferHours) || deferHours <= 0 || deferHours > 24) throw new Error("Waktu tunda harus lebih dari 0 dan maksimal 24 jam.");
          const deferredUntil = new Date(Date.now() + deferHours * 60 * 60 * 1000).toISOString();
          set({
            productionOrders: state.productionOrders.map((item) => item.id === production.id ? {
              ...item,
              status: "Ditunda Gudang",
              materialRequestDeferredUntil: deferredUntil,
              materialRequestExpiresAt: deferredUntil,
              materialRequestNote: note.trim() || "Ditunda untuk pemeriksaan Gudang.",
            } : item),
            notifications: [{
              id: uniqueId("notification"), title: "Permintaan bahan ditunda",
              message: `${production.materialRequestNumber ?? production.batchNumber} ditunda sampai ${new Date(deferredUntil).toLocaleString("id-ID")}.`,
              type: "warning", module: "Produksi", createdAt: timestamp(), read: false,
            }, ...state.notifications],
          });
          return;
        }

        const materials = production.materials.map((requirement) => {
          let remaining = requirement.requestedQty;
          const allocations: ProductionOrder["materials"][number]["allocations"] = [];
          const candidates = state.stocks
            .filter((stock) => stock.productId === requirement.materialProductId && stock.status === "Tersedia" && stock.onHand > 0)
            .sort((a, b) => (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"));
          for (const candidate of candidates) {
            if (remaining <= 0) break;
            const approvedQty = roundStockQuantity(Math.min(candidate.onHand, remaining));
            if (approvedQty <= 0) continue;
            remaining = roundStockQuantity(remaining - approvedQty);
            allocations.push({
              id: allocationId(production.id, requirement.id, candidate.id),
              stockId: candidate.id,
              lot: candidate.lot,
              warehouse: candidate.warehouse,
              approvedQty,
              issuedQty: 0,
              usedQty: 0,
            });
          }
          return { ...requirement, allocations, shortageQty: Math.max(remaining, 0) };
        });
        const hasShortage = materials.some((material) => material.shortageQty > 0);
        assertWorkflowTransition("produksi", productionTransitions, production.status, hasShortage ? "Kekurangan Bahan" : "Disetujui Gudang");
        const reviewedAt = timestamp();
        set({
          productionOrders: state.productionOrders.map((item) => item.id === production.id ? {
            ...item,
            materials,
            status: hasShortage ? "Kekurangan Bahan" : "Disetujui Gudang",
            warehouseConfirmedBy: hasShortage ? undefined : actor.id,
            warehouseConfirmedAt: hasShortage ? undefined : reviewedAt,
            materialRequestDeferredUntil: undefined,
            materialRequestNote: note.trim() || (hasShortage ? "Stok belum mencukupi; perlu diteruskan ke Purchasing." : "Stok cukup dan siap diserahkan."),
          } : item),
          notifications: [{
            id: uniqueId("notification"),
            title: hasShortage ? "Permintaan bahan perlu pembelian" : "Bahan disetujui Gudang",
            message: hasShortage
              ? `${production.materialRequestNumber ?? production.batchNumber} kekurangan stok dan perlu diteruskan ke Purchasing.`
              : `${production.materialRequestNumber ?? production.batchNumber} telah disetujui. Produksi perlu mengonfirmasi penerimaan sebelum stok berkurang.`,
            type: hasShortage ? "critical" : "success",
            module: hasShortage ? "Inventori & Gudang" : "Produksi",
            createdAt: reviewedAt,
            read: false,
          }, ...state.notifications],
        });
      },
      requestMaterialPurchase: (productionId) => {
        const state = get();
        const actor = assertAction(state, "inventory.production.purchase-request", "Hanya Owner atau Staff Gudang yang dapat meneruskan kekurangan bahan ke Purchasing.");
        const production = state.productionOrders.find((item) => item.id === productionId);
        if (!production) throw new Error("Batch produksi tidak ditemukan.");
        if (production.status !== "Kekurangan Bahan") throw new Error("Permintaan pembelian hanya dibuat untuk permintaan yang kekurangan bahan.");
        assertWorkflowTransition("produksi", productionTransitions, production.status, "Menunggu Pembelian");
        const existing = state.materialPurchaseRequests.find((item) => item.productionOrderId === productionId && item.status !== "Selesai");
        if (existing) {
          if (existing.status === "Baru") assertWorkflowTransition("permintaan pembelian", purchaseRequestTransitions, existing.status, "Diproses");
          set({
            productionOrders: state.productionOrders.map((item) => item.id === production.id ? { ...item, status: "Menunggu Pembelian", purchaseRequestId: existing.id } : item),
            materialPurchaseRequests: state.materialPurchaseRequests.map((item) => item.id === existing.id && item.status === "Baru" ? { ...item, status: "Diproses" as const } : item),
          });
          return existing;
        }
        const items = production.materials.filter((item) => item.shortageQty > 0).map((item) => {
          const product = state.products.find((candidate) => candidate.id === item.materialProductId);
          return { productId: item.materialProductId, quantity: item.shortageQty, unit: product?.stockUnit ?? "unit" };
        });
        if (!items.length) throw new Error("Tidak ada kekurangan bahan untuk diteruskan.");
        const request: MaterialPurchaseRequest = {
          id: uniqueId("purchase-request"),
          number: nextNumber("PR-GDG", state.materialPurchaseRequests.length),
          productionOrderId: production.id,
          productionBatchNumber: production.batchNumber,
          requestedBy: actor.id,
          requestedAt: timestamp(),
          neededAt: production.materialRequestExpiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: production.priority,
          reason: production.materialRequestNote || "Kekurangan bahan untuk perintah produksi.",
          status: "Diproses",
          items,
        };
        set({
          materialPurchaseRequests: [request, ...state.materialPurchaseRequests],
          productionOrders: state.productionOrders.map((item) => item.id === production.id ? { ...item, status: "Menunggu Pembelian", purchaseRequestId: request.id } : item),
          notifications: [{
            id: uniqueId("notification"), title: "Permintaan pembelian dari Gudang",
            message: `${request.number} untuk ${production.batchNumber} berisi ${items.length} bahan yang harus dibeli.`,
            type: "critical", module: "Purchasing", createdAt: request.requestedAt, read: false,
          }, ...state.notifications],
        });
        return request;
      },
      confirmProductionMaterials: (productionId) => {
        const state = get();
        const actor = assertAction(state, "production.material.confirm", "Hanya Owner atau Staff Produksi yang dapat mengonfirmasi penerimaan bahan.");
        const production = state.productionOrders.find((item) => item.id === productionId);
        if (!production) throw new Error("Batch produksi tidak ditemukan.");
        if (production.status !== "Disetujui Gudang") throw new Error("Penerimaan hanya dapat dikonfirmasi setelah Gudang menyetujui permintaan.");
        assertWorkflowTransition("produksi", productionTransitions, production.status, "Bahan Dikonfirmasi");
        const stocks = state.stocks.map((stock) => ({ ...stock }));
        const movements: StockMovement[] = [];
        const materials = production.materials.map((requirement) => ({
          ...requirement,
          allocations: requirement.allocations.map((allocation) => {
            const source = stocks.find((stock) => stock.id === allocation.stockId);
            if (!source || source.status !== "Tersedia" || source.onHand + 0.000001 < allocation.approvedQty) {
              throw new Error(`Stok lot ${allocation.lot} berubah dan tidak lagi mencukupi. Minta Gudang memeriksa ulang.`);
            }
            source.onHand = roundStockQuantity(source.onHand - allocation.approvedQty);
            stocks.push({
              id: `staging-${production.id}-${allocation.id}`,
              productId: requirement.materialProductId,
              warehouse: "Staging Produksi",
              lot: allocation.lot,
              expiryDate: source.expiryDate,
              onHand: allocation.approvedQty,
              reserved: 0,
              status: "Staging Produksi",
              referenceId: production.id,
            });
            const material = state.products.find((item) => item.id === requirement.materialProductId)!;
            movements.push(createStockMovement(actor, {
              type: "Pengeluaran Produksi", productId: requirement.materialProductId, lot: allocation.lot,
              quantity: allocation.approvedQty, unit: material.stockUnit, fromWarehouse: source.warehouse,
              toWarehouse: "Staging Produksi", reference: production.batchNumber,
              notes: "Stok berkurang setelah Produksi mengonfirmasi penerimaan bahan.",
            }));
            return { ...allocation, issuedQty: allocation.approvedQty };
          }),
        }));
        const confirmedAt = timestamp();
        set({
          stocks: stocks.filter((stock) => stock.onHand > 0.000001),
          stockMovements: [...movements.reverse(), ...state.stockMovements],
          productionOrders: state.productionOrders.map((item) => item.id === production.id ? {
            ...item, materials, status: "Bahan Dikonfirmasi", materialsConfirmedBy: actor.id, materialsConfirmedAt: confirmedAt,
          } : item),
          materialPurchaseRequests: production.purchaseRequestId
            ? state.materialPurchaseRequests.map((item) => item.id === production.purchaseRequestId ? { ...item, status: "Selesai" } : item)
            : state.materialPurchaseRequests,
          notifications: [{
            id: uniqueId("notification"), title: "Serah-terima bahan dikonfirmasi",
            message: `${production.materialRequestNumber ?? production.batchNumber} diterima Produksi; stok Gudang telah dikurangi.`,
            type: "success", module: "Inventori & Gudang", createdAt: confirmedAt, read: false,
          }, ...state.notifications],
        });
      },
      advanceProduction: (productionId) => {
        const state = get();
        assertAction(state, "production.advance", "Hanya Owner atau Staff Produksi yang dapat menjalankan batch.");
        const production = state.productionOrders.find((item) => item.id === productionId);
        if (!production) throw new Error("Batch produksi tidak ditemukan.");
        if (production.status !== "Bahan Dikonfirmasi") throw new Error("Produksi hanya dapat dimulai setelah Staff Produksi mengonfirmasi penerimaan bahan.");
        assertWorkflowTransition("produksi", productionTransitions, production.status, "Berjalan");
        set({
          productionOrders: state.productionOrders.map((item) =>
            item.id === productionId ? { ...item, status: "Berjalan", startedAt: timestamp() } : item,
          ),
        });
      },
      finalizeProduction: (productionId, draft) => {
        const state = get();
        const actor = assertAction(state, "production.finalize", "Hanya Owner atau Staff Produksi yang dapat menyelesaikan batch.");
        const production = state.productionOrders.find((item) => item.id === productionId);
        if (!production) throw new Error("Batch produksi tidak ditemukan.");
        if (production.status !== "Berjalan") throw new Error("Batch hanya dapat difinalkan satu kali saat berstatus Berjalan.");
        if (!draft.outputs.length) throw new Error("Masukkan minimal satu hasil Barang Jadi.");
        const outputProductIds = new Set<string>();
        const validatedOutputs = draft.outputs.map((output) => {
          const product = state.products.find((item) => item.id === output.productId);
          if (!product || product.type !== "Produk Jadi" || !product.isActive) throw new Error("Barang Jadi hasil produksi tidak ditemukan atau nonaktif.");
          if (outputProductIds.has(product.id)) throw new Error(`${product.name} tidak boleh dicatat dua kali dalam hasil batch.`);
          outputProductIds.add(product.id);
          if (![output.goodQty, output.failedQty].every((value) => Number.isFinite(value) && Number.isInteger(value) && value >= 0)) {
            throw new Error(`Jumlah berhasil dan gagal ${product.name} harus berupa bilangan bulat nol atau lebih.`);
          }
          if (output.goodQty + output.failedQty <= 0) throw new Error(`Masukkan hasil ${product.name}.`);
          if (output.failedQty > 0 && !output.failureReason.trim()) throw new Error(`Alasan gagal/waste ${product.name} wajib diisi.`);
          return { output, product };
        });
        assertWorkflowTransition("produksi", productionTransitions, production.status, "Selesai");
        const stocks = state.stocks.map((stock) => ({ ...stock }));
        const movements: StockMovement[] = [];
        const materials = production.materials.map((requirement) => {
          const allocations = requirement.allocations.map((allocation) => {
            const staging = stocks.find((stock) =>
              stock.referenceId === production.id && stock.productId === requirement.materialProductId && stock.lot === allocation.lot && stock.status === "Staging Produksi",
            );
            if (!staging || staging.onHand + 0.000001 < allocation.issuedQty) throw new Error(`Stok staging lot ${allocation.lot} tidak mencukupi.`);
            staging.onHand = roundStockQuantity(staging.onHand - allocation.issuedQty);
            const material = state.products.find((item) => item.id === requirement.materialProductId)!;
            if (allocation.issuedQty > 0) movements.push(createStockMovement(actor, {
              type: "Konsumsi Produksi",
              productId: requirement.materialProductId,
              lot: allocation.lot,
              quantity: allocation.issuedQty,
              unit: material.stockUnit,
              fromWarehouse: "Staging Produksi",
              reference: production.batchNumber,
              notes: "Seluruh bahan yang diserahterimakan dianggap digunakan; tidak ada proses pengembalian sisa.",
            }));
            return { ...allocation, usedQty: roundStockQuantity(allocation.issuedQty) };
          });
          return { ...requirement, allocations };
        });

        const completedAt = timestamp();
        const outputs = validatedOutputs.map(({ output, product }, index) => {
          const lot = `${production.batchNumber.replace(/^PRD-/, "LOT-")}-${String(index + 1).padStart(2, "0")}`;
          const stockItemId = output.goodQty > 0 ? uniqueId("stock-production") : undefined;
          if (stockItemId) {
            stocks.push({
              id: stockItemId,
              productId: product.id,
              warehouse: "Gudang Produk Jadi",
              lot,
              expiryDate: localDateKey(addLocalDays(new Date(), product.shelfLifeDays)),
              onHand: output.goodQty,
              reserved: 0,
              status: "Tersedia",
              referenceId: production.id,
            });
            movements.push(createStockMovement(actor, {
              type: "Output Produksi",
              productId: product.id,
              lot,
              quantity: output.goodQty,
              unit: product.stockUnit,
              toWarehouse: "Gudang Produk Jadi",
              reference: production.batchNumber,
              notes: "Hasil berhasil langsung menjadi stok tersedia dan dialokasikan ke pesanan berdasarkan prioritas kebutuhan.",
            }));
          }
          if (output.failedQty > 0) movements.push(createStockMovement(actor, {
            type: "Waste Produksi",
            productId: product.id,
            lot,
            quantity: output.failedQty,
            unit: product.stockUnit,
            reference: production.batchNumber,
            notes: output.failureReason.trim(),
          }));
          return {
            id: uniqueId("production-output"),
            productId: product.id,
            goodQty: output.goodQty,
            failedQty: output.failedQty,
            failureReason: output.failureReason.trim() || undefined,
            stockItemId,
          };
        });
        const allocation = allocateAvailableStockToPendingSales(stocks.filter((stock) => stock.onHand > 0.000001), state.sales);

        set({
          stocks: allocation.stocks,
          sales: allocation.sales,
          stockMovements: [...movements.reverse(), ...state.stockMovements],
          productionOrders: state.productionOrders.map((item) => item.id === production.id ? {
            ...item,
            materials,
            outputs,
            resultNotes: draft.notes.trim() || undefined,
            reportedBy: actor.id,
            reportedAt: completedAt,
            completedAt,
            status: "Selesai",
          } : item),
          auditLogs: [auditEntry(actor, "Produksi", production.id, production.batchNumber, "Diubah", [`${outputs.length} SKU hasil dicatat`, `Berhasil: ${outputs.reduce((sum, output) => sum + output.goodQty, 0)}`, `Gagal/waste: ${outputs.reduce((sum, output) => sum + output.failedQty, 0)}`]), ...state.auditLogs],
        });
      },
      addSupplierQuotation: (draft) => {
        const actor = assertAction(get(), "purchasing.create", "Hanya Owner atau Staff Purchasing yang dapat mencatat penawaran supplier.");
        const state = get();
        const supplier = state.suppliers.find((candidate) => candidate.id === draft.supplierId);
        const product = state.products.find((candidate) => candidate.id === draft.productId);
        const referenceNumber = draft.referenceNumber.trim().toUpperCase();

        if (!supplier || !supplier.isActive) throw new Error("Supplier tidak ditemukan atau sedang nonaktif.");
        if (!product || product.type === "Produk Jadi" || !product.isActive || !product.purchaseUnit) {
          throw new Error("Barang/Bahan tidak ditemukan atau satuan belinya belum lengkap.");
        }
        if (!referenceNumber) throw new Error("Nomor referensi penawaran wajib diisi.");
        if (state.supplierQuotations.some((item) => item.referenceNumber.toLowerCase() === referenceNumber.toLowerCase())) {
          throw new Error(`Nomor penawaran ${referenceNumber} sudah tercatat.`);
        }
        if (![draft.unitPrice, draft.minimumOrderQuantity, draft.leadTimeDays].every(Number.isFinite) || draft.unitPrice <= 0 || draft.minimumOrderQuantity <= 0 || draft.leadTimeDays < 0) {
          throw new Error("Harga, minimum pembelian, dan estimasi pengiriman harus berupa angka yang valid.");
        }
        if (!draft.quotedAt) throw new Error("Tanggal penawaran wajib diisi.");
        if (draft.validUntil && draft.validUntil < draft.quotedAt) throw new Error("Masa berlaku tidak boleh lebih awal dari tanggal penawaran.");

        const quotation: SupplierQuotation = {
          ...draft,
          id: uniqueId("quotation"),
          referenceNumber,
          supplierNameSnapshot: supplier.name,
          productNameSnapshot: product.name,
          purchaseUnitSnapshot: product.purchaseUnit,
          paymentTermsDaysSnapshot: supplier.paymentTermsDays,
          notes: draft.notes.trim(),
          createdBy: actor.id,
          createdAt: timestamp(),
        };
        set((current) => ({ supplierQuotations: [quotation, ...current.supplierQuotations] }));
        return quotation;
      },
      updateSupplierQuotation: (quotationId, draft) => {
        const actor = assertAction(get(), "purchasing.create", "Hanya Owner atau Staff Purchasing yang dapat mengubah penawaran supplier.");
        const state = get();
        const currentQuotation = state.supplierQuotations.find((item) => item.id === quotationId);
        const supplier = state.suppliers.find((candidate) => candidate.id === draft.supplierId);
        const product = state.products.find((candidate) => candidate.id === draft.productId);
        const referenceNumber = draft.referenceNumber.trim().toUpperCase();

        if (!currentQuotation) throw new Error("Penawaran supplier tidak ditemukan.");
        if (!supplier || !supplier.isActive) throw new Error("Supplier tidak ditemukan atau sedang nonaktif.");
        if (!product || product.type === "Produk Jadi" || !product.isActive || !product.purchaseUnit) {
          throw new Error("Barang/Bahan tidak ditemukan atau satuan belinya belum lengkap.");
        }
        if (!referenceNumber) throw new Error("Nomor referensi penawaran wajib diisi.");
        if (state.supplierQuotations.some((item) => item.id !== quotationId && item.referenceNumber.toLowerCase() === referenceNumber.toLowerCase())) {
          throw new Error(`Nomor penawaran ${referenceNumber} sudah tercatat.`);
        }
        if (![draft.unitPrice, draft.minimumOrderQuantity, draft.leadTimeDays].every(Number.isFinite) || draft.unitPrice <= 0 || draft.minimumOrderQuantity <= 0 || draft.leadTimeDays < 0) {
          throw new Error("Harga, minimum pembelian, dan estimasi pengiriman harus berupa angka yang valid.");
        }
        if (!draft.quotedAt) throw new Error("Tanggal penawaran wajib diisi.");
        if (draft.validUntil && draft.validUntil < draft.quotedAt) throw new Error("Masa berlaku tidak boleh lebih awal dari tanggal penawaran.");

        const quotation: SupplierQuotation = {
          ...currentQuotation,
          ...draft,
          referenceNumber,
          supplierNameSnapshot: supplier.name,
          productNameSnapshot: product.name,
          purchaseUnitSnapshot: product.purchaseUnit,
          paymentTermsDaysSnapshot: supplier.paymentTermsDays,
          notes: draft.notes.trim(),
          updatedBy: actor.id,
          updatedAt: timestamp(),
        };
        set((current) => ({
          supplierQuotations: current.supplierQuotations.map((item) => item.id === quotationId ? quotation : item),
        }));
        return quotation;
      },
      deleteSupplierQuotation: (quotationId) => {
        assertAction(get(), "purchasing.create", "Hanya Owner atau Staff Purchasing yang dapat menghapus penawaran supplier.");
        const state = get();
        if (!state.supplierQuotations.some((item) => item.id === quotationId)) {
          throw new Error("Penawaran supplier tidak ditemukan.");
        }
        set((current) => ({
          supplierQuotations: current.supplierQuotations.filter((item) => item.id !== quotationId),
        }));
      },
      addPurchaseOrder: (supplierId, draftItems, sourcePurchaseRequestId) => {
        const actor = assertAction(get(), "purchasing.create", "Hanya Owner atau Staff Purchasing yang dapat membuat purchase order.");
        const state = get();
        const supplier = state.suppliers.find((candidate) => candidate.id === supplierId);
        if (!supplier || !supplier.isActive) throw new Error("Supplier tidak ditemukan atau sedang nonaktif.");
        if (!draftItems.length) throw new Error("Pilih minimal satu Barang/Bahan untuk purchase order.");
        const sourceRequest = sourcePurchaseRequestId
          ? state.materialPurchaseRequests.find((item) => item.id === sourcePurchaseRequestId)
          : undefined;
        if (sourcePurchaseRequestId && !sourceRequest) throw new Error("Permintaan pembelian dari Gudang tidak ditemukan.");

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
          id: uniqueId("po"),
          number,
          supplierId: supplier.id,
          supplierNameSnapshot: supplier.name,
          createdAt: shortDate(),
          expectedAt: localDateKey(addLocalDays(new Date(), 3)),
          paymentTermsDaysSnapshot: supplier.paymentTermsDays,
          sourcePurchaseRequestId,
          items,
          total,
          status: "Dipesan",
        };
        set((current) => ({
          purchaseOrders: [order, ...current.purchaseOrders],
          materialPurchaseRequests: sourcePurchaseRequestId
            ? current.materialPurchaseRequests.map((item) => {
                if (item.id !== sourcePurchaseRequestId) return item;
                assertWorkflowTransition("permintaan pembelian", purchaseRequestTransitions, item.status, "PO Dibuat");
                return { ...item, status: "PO Dibuat", purchaseOrderId: order.id };
              })
            : current.materialPurchaseRequests,
          notifications: sourceRequest ? [{
            id: uniqueId("notification"), title: "PO dibuat dari permintaan Gudang",
            message: `${order.number} dibuat untuk ${sourceRequest.number}. Gudang dapat memantau penerimaannya.`,
            type: "info", module: "Inventori & Gudang", createdAt: timestamp(), read: false,
          }, ...current.notifications] : current.notifications,
          auditLogs: [auditEntry(actor, "Purchase Order", order.id, order.number, "Dibuat", [`Supplier: ${supplier.name}`, `Total: ${total}`, "Status: Dipesan"]), ...current.auditLogs],
        }));
        return order;
      },
      sendPurchaseOrder: (purchaseOrderId) => {
        const actor = assertAction(get(), "purchasing.create", "Hanya Owner atau Staff Purchasing yang dapat mengirim purchase order.");
        const order = get().purchaseOrders.find((item) => item.id === purchaseOrderId);
        if (!order) throw new Error("Purchase order tidak ditemukan.");
        if (order.status === "Dipesan") return;
        assertWorkflowTransition("purchase order", purchaseOrderTransitions, order.status, "Dipesan");
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((item) => item.id === order.id ? { ...item, status: "Dipesan" } : item),
          auditLogs: [auditEntry(actor, "Purchase Order", order.id, order.number, "Diubah", ["Status: Draft → Dipesan", `Supplier: ${order.supplierNameSnapshot}`]), ...state.auditLogs],
        }));
      },
      receivePurchaseOrder: (purchaseOrderId, receivedQuantities) => {
        const actor = assertAction(get(), "purchasing.receive", "Hanya Owner atau Staff Purchasing yang dapat menerima purchase order.");
        const state = get();
        const order = state.purchaseOrders.find((item) => item.id === purchaseOrderId);
        if (!order) throw new Error("Purchase order tidak ditemukan.");
        if (!["Dipesan", "Diterima Sebagian"].includes(order.status)) throw new Error("Hanya PO yang sudah dipesan dapat diterima.");

        const quantities = order.items.map((item, index) => {
          const outstanding = item.quantity - item.receivedQty;
          const quantity = receivedQuantities?.[index] ?? outstanding;
          if (!Number.isFinite(quantity) || quantity < 0 || quantity > outstanding) {
            throw new Error(`Jumlah penerimaan ${index + 1} harus antara 0 dan ${outstanding} ${item.purchaseUnit}.`);
          }
          return quantity;
        });
        if (!quantities.some((quantity) => quantity > 0)) throw new Error("Masukkan minimal satu jumlah penerimaan.");

        const receivedAt = timestamp();
        const receipt: GoodsReceipt = {
          id: uniqueId("goods-receipt"),
          number: nextNumber("GR-PST", state.goodsReceipts.length),
          purchaseOrderId: order.id,
          purchaseOrderNumber: order.number,
          supplierId: order.supplierId,
          receivedBy: actor.id,
          receivedAt,
          status: "Diterima Fisik",
          items: [],
        };
        const receivedStocks: StockItem[] = [];
        order.items.forEach((item, index) => {
          const receivedQty = quantities[index];
          if (receivedQty <= 0) return;
          const product = state.products.find((candidate) => candidate.id === item.productId);
          if (!product || product.type === "Produk Jadi") throw new Error("Master Barang/Bahan pada PO tidak ditemukan.");
          const stockItemId = uniqueId("stock-po");
          const lot = `${product.code}-${receipt.number.replaceAll("-", "")}-${String(index + 1).padStart(2, "0")}`;
          const stockQuantity = receivedQty * item.conversionValue;
          const stock: StockItem = {
            id: stockItemId,
            productId: item.productId,
            warehouse: "Gudang Bahan",
            lot,
            expiryDate: localDateKey(addLocalDays(new Date(), product.shelfLifeDays)),
            onHand: stockQuantity,
            reserved: 0,
            status: "Tersedia",
            referenceId: receipt.id,
          };
          receivedStocks.push(stock);
          const receiptItem: GoodsReceipt["items"][number] = {
            id: uniqueId("goods-receipt-item"), purchaseOrderItemIndex: index, productId: item.productId,
            receivedQty, purchaseUnit: item.purchaseUnit, stockQuantity, stockUnit: item.stockUnit,
            lot, expiryDate: stock.expiryDate, stockItemId,
          };
          receipt.items.push(receiptItem);
        });
        const receiptStatus: GoodsReceipt["status"] = "Selesai";
        assertWorkflowTransition("penerimaan barang", goodsReceiptTransitions, receipt.status, receiptStatus);
        receipt.status = receiptStatus;
        const updatedItems = order.items.map((item, index) => ({ ...item, receivedQty: item.receivedQty + quantities[index] }));
        const nextOrderStatus = updatedItems.every((item) => item.receivedQty >= item.quantity) ? "Diterima" as const : "Diterima Sebagian" as const;
        assertWorkflowTransition("purchase order", purchaseOrderTransitions, order.status, nextOrderStatus);
        const receivedMovements = receivedStocks.map((stock) => {
          const product = state.products.find((candidate) => candidate.id === stock.productId)!;
          return createStockMovement(actor, {
            type: "Penerimaan", productId: stock.productId, lot: stock.lot, quantity: stock.onHand,
            unit: product.stockUnit, toWarehouse: stock.warehouse, reference: receipt.number,
            notes: "Penerimaan fisik langsung menambah stok Gudang Bahan.",
          });
        });
        set((current) => ({
          purchaseOrders: current.purchaseOrders.map((item) => item.id === order.id ? { ...item, status: nextOrderStatus, items: updatedItems } : item),
          goodsReceipts: [receipt, ...current.goodsReceipts],
          stocks: [...current.stocks, ...receivedStocks],
          stockMovements: [...receivedMovements.reverse(), ...current.stockMovements],
        }));
        return receipt;
      },
      addCashAccount: (name, kind) => {
        assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat menambah akun kas dan bank.");
        const normalizedName = name.trim();
        if (!normalizedName) throw new Error("Nama kas atau bank wajib diisi.");
        if (!(["Kas", "Bank"] as CashAccount["kind"][]).includes(kind)) throw new Error("Jenis akun kas atau bank tidak valid.");
        const state = get();
        if (state.cashAccounts.some((item) => item.name.toLocaleLowerCase("id-ID") === normalizedName.toLocaleLowerCase("id-ID"))) {
          throw new Error("Nama kas atau bank sudah digunakan.");
        }
        const actor = currentActor(state);
        const account: CashAccount = {
          id: uniqueId("cash-account"),
          name: normalizedName,
          kind,
          balance: 0,
          updatedAt: timestamp(),
        };
        set((current) => ({
          cashAccounts: [...current.cashAccounts, account],
          auditLogs: [auditEntry(actor, "Mutasi Kas", account.id, account.name, "Dibuat", [`Akun ${kind} dibuat`, "Saldo awal: 0"]), ...current.auditLogs],
        }));
        return account;
      },
      addCashTransaction: (accountId, direction, description, amount) => {
        assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat mencatat transaksi kas dan bank.");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Nilai transaksi harus lebih dari nol.");
        if (!description.trim()) throw new Error("Keterangan transaksi wajib diisi.");
        const state = get();
        const account = state.cashAccounts.find((item) => item.id === accountId);
        if (!account) throw new Error("Akun kas atau bank tidak ditemukan.");
        if (direction === "Keluar" && account.balance < amount) throw new Error(`Saldo ${account.name} tidak mencukupi.`);
        const transaction: CashTransaction = {
          id: uniqueId("cash-transaction"),
          number: nextNumber("KAS", state.cashTransactions.length),
          accountId,
          direction,
          amount,
          description: description.trim(),
          source: "Input manual",
          date: shortDate(),
        };
        set((current) => ({
          cashTransactions: [transaction, ...current.cashTransactions],
          cashAccounts: current.cashAccounts.map((item) => item.id === accountId ? {
            ...item,
            balance: item.balance + (direction === "Masuk" ? amount : -amount),
            updatedAt: timestamp(),
          } : item),
        }));
        return transaction;
      },
      addInvoice: (type, party, source, dueDate, total) => {
        assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat mencatat utang dan piutang.");
        if (!party.trim()) throw new Error("Nama pihak wajib diisi.");
        if (!source.trim()) throw new Error("Referensi sumber wajib diisi.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || localDateKey(new Date(`${dueDate}T12:00:00`)) !== dueDate) throw new Error("Tanggal jatuh tempo tidak valid.");
        if (!Number.isFinite(total) || total <= 0) throw new Error("Nilai tagihan harus lebih dari nol.");
        const state = get();
        const invoice: Invoice = {
          id: uniqueId("invoice"),
          number: nextNumber(type === "Piutang" ? "INV" : "BILL", state.invoices.length),
          type,
          party: party.trim(),
          source: source.trim(),
          issueDate: shortDate(),
          dueDate,
          total,
          paid: 0,
          status: dueDate < shortDate() ? "Jatuh Tempo" : "Belum Bayar",
        };
        set((current) => ({ invoices: [invoice, ...current.invoices] }));
        return invoice;
      },
      addCostOfGoodsSold: (productId, quantity, unitCost, description) => {
        assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat mencatat HPP.");
        const state = get();
        const product = state.products.find((item) => item.id === productId && item.type === "Produk Jadi");
        if (!product) throw new Error("Pilih Produk Jadi yang valid untuk HPP.");
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Jumlah produk terjual harus lebih dari nol.");
        if (!Number.isFinite(unitCost) || unitCost <= 0) throw new Error("HPP per unit harus lebih dari nol.");
        if (!description?.trim()) throw new Error("Alasan koreksi HPP manual wajib diisi.");
        const amount = quantity * unitCost;
        const cost: CostOfGoodsSold = {
          id: uniqueId("hpp"),
          number: nextNumber("HPP", state.costOfGoodsSold.length),
          date: shortDate(),
          productId: product.id,
          productNameSnapshot: product.name,
          quantity,
          unitCost,
          description: description?.trim() || undefined,
          amount,
          source: "Koreksi Manual",
          reference: "Koreksi manual Finance",
        };
        set((current) => ({ costOfGoodsSold: [cost, ...current.costOfGoodsSold] }));
        return cost;
      },
      addExpense: (department, category, payee, amount) => {
        const actor = assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat mencatat biaya.");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Nilai biaya harus lebih dari nol.");
        if (!department.trim() || !category.trim() || !payee.trim()) throw new Error("Departemen, kategori, dan penerima biaya wajib diisi.");
        set((state) => {
          const number = nextNumber("EXP", state.expenses.length);
          const expense: Expense = {
            id: uniqueId("expense"),
            number,
            department: department.trim(),
            category: category.trim(),
            payee: payee.trim(),
            amount,
            date: shortDate(),
            status: "Disetujui",
            requestedBy: actor.id,
          };
          return {
            expenses: [expense, ...state.expenses],
          };
        });
      },
      payExpense: (expenseId, accountId) => {
        const actor = assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat membayar biaya.");
        const state = get();
        const expense = state.expenses.find((item) => item.id === expenseId);
        if (!expense) throw new Error("Biaya tidak ditemukan.");
        if (expense.status !== "Disetujui") throw new Error("Hanya biaya berstatus Disetujui yang dapat dibayar.");
        const account = state.cashAccounts.find((item) => item.id === accountId);
        if (!account) throw new Error("Akun kas atau bank tidak ditemukan.");
        if (account.balance < expense.amount) throw new Error(`Saldo ${account.name} tidak mencukupi.`);
        assertWorkflowTransition("biaya", expenseTransitions, expense.status, "Dibayar");
        const transaction: CashTransaction = {
          id: uniqueId("cash-transaction"), number: nextNumber("KAS", state.cashTransactions.length), accountId: account.id,
          direction: "Keluar", amount: expense.amount, description: `Pembayaran biaya ${expense.category} kepada ${expense.payee}`,
          source: expense.number, date: shortDate(),
        };
        set((current) => ({
          expenses: current.expenses.map((item) => item.id === expense.id ? {
            ...item, status: "Dibayar", paidFromAccountId: account.id, paidAt: timestamp(), paidBy: actor.id, paymentTransactionId: transaction.id,
          } : item),
          cashTransactions: [transaction, ...current.cashTransactions],
          cashAccounts: current.cashAccounts.map((item) => item.id === account.id ? { ...item, balance: item.balance - expense.amount, updatedAt: timestamp() } : item),
          auditLogs: [auditEntry(actor, "Biaya", expense.id, expense.number, "Diubah", [`Status: Disetujui → Dibayar`, `Akun pembayaran: ${account.name}`]), ...current.auditLogs],
        }));
        return transaction;
      },
      payInvoice: (invoiceId, amount, accountId) => {
        const actor = assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat mencatat pembayaran.");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Jumlah pembayaran harus lebih dari nol.");
        const state = get();
        const invoice = state.invoices.find((item) => item.id === invoiceId);
        if (!invoice) throw new Error("Tagihan tidak ditemukan.");
        const outstanding = invoice.total - invoice.paid;
        if (amount > outstanding) throw new Error("Pembayaran tidak boleh melebihi sisa tagihan.");
        if (!accountId) throw new Error("Pilih akun kas atau bank untuk pembayaran.");
        const account = state.cashAccounts.find((item) => item.id === accountId);
        if (!account) throw new Error("Akun kas atau bank tidak ditemukan.");
        if (invoice.type === "Utang" && account.balance < amount) throw new Error(`Saldo ${account.name} tidak mencukupi.`);
        const transaction: CashTransaction = {
          id: uniqueId("cash-transaction"),
          number: nextNumber("KAS", state.cashTransactions.length),
          accountId: account.id,
          direction: invoice.type === "Piutang" ? "Masuk" : "Keluar",
          amount,
          description: `Pembayaran ${invoice.type.toLowerCase()} ${invoice.party}`,
          source: invoice.number,
          date: shortDate(),
          status: "Aktif",
          createdBy: actor.id,
        };
        const paid = invoice.paid + amount;
        set((current) => ({
          invoices: current.invoices.map((item) => item.id === invoiceId ? {
            ...item,
            paid,
            status: paid >= item.total ? "Lunas" : "Dibayar Sebagian",
          } : item),
          cashTransactions: [transaction, ...current.cashTransactions],
          cashAccounts: current.cashAccounts.map((item) => item.id === account.id ? {
            ...item,
            balance: item.balance + (invoice.type === "Piutang" ? amount : -amount),
            updatedAt: timestamp(),
          } : item),
        }));
      },
      reverseCashTransaction: (transactionId, reason) => {
        const actor = assertAction(get(), "finance.manage", "Hanya Owner atau Admin HR/Finance yang dapat membalik transaksi.");
        const state = get();
        const original = state.cashTransactions.find((item) => item.id === transactionId);
        if (!original) throw new Error("Transaksi kas atau bank tidak ditemukan.");
        if (original.status === "Dibalik" || original.reversedByTransactionId) throw new Error("Transaksi ini sudah dibalik.");
        if (original.reversesTransactionId) throw new Error("Transaksi pembalik tidak dapat dibalik kembali.");
        if (!reason.trim()) throw new Error("Alasan reversal wajib diisi.");
        const relatedPayrolls = state.payrolls.filter((item) => item.paymentTransactionId === original.id);
        if (relatedPayrolls.some((item) => item.status === "Dikunci")) throw new Error("Payroll yang sudah dikunci tidak dapat direversal.");
        const account = state.cashAccounts.find((item) => item.id === original.accountId);
        if (!account) throw new Error("Akun transaksi asal tidak ditemukan.");
        const reverseDirection = original.direction === "Masuk" ? "Keluar" as const : "Masuk" as const;
        if (reverseDirection === "Keluar" && account.balance < original.amount) throw new Error(`Saldo ${account.name} tidak mencukupi untuk reversal.`);
        const reversal: CashTransaction = {
          id: uniqueId("cash-reversal"), number: nextNumber("REV", state.cashTransactions.length), accountId: account.id,
          direction: reverseDirection, amount: original.amount, description: `Reversal ${original.number}: ${reason.trim()}`,
          source: original.number, date: shortDate(), status: "Aktif", createdBy: actor.id,
          reversesTransactionId: original.id, reversalReason: reason.trim(),
        };
        set((current) => ({
          cashTransactions: [reversal, ...current.cashTransactions.map((item) => item.id === original.id ? {
            ...item, status: "Dibalik" as const, reversedByTransactionId: reversal.id, reversalReason: reason.trim(),
          } : item)],
          cashAccounts: current.cashAccounts.map((item) => item.id === account.id ? {
            ...item,
            balance: item.balance + (reverseDirection === "Masuk" ? original.amount : -original.amount),
            updatedAt: timestamp(),
          } : item),
          invoices: current.invoices.map((invoice) => invoice.number === original.source ? (() => {
            const paid = Math.max(invoice.paid - original.amount, 0);
            return { ...invoice, paid, status: paid <= 0 ? "Belum Bayar" as const : paid >= invoice.total ? "Lunas" as const : "Dibayar Sebagian" as const };
          })() : invoice),
          expenses: current.expenses.map((expense) => expense.paymentTransactionId === original.id ? {
            ...expense, status: "Disetujui" as const, paidFromAccountId: undefined, paidAt: undefined,
            paidBy: undefined, paymentTransactionId: undefined,
          } : expense),
          salesReturns: current.salesReturns.map((item) => item.refundTransactionId === original.id ? {
            ...item, status: "Menunggu Refund" as const, refundAccountId: undefined, refundTransactionId: undefined,
            refundedBy: undefined, refundedAt: undefined,
          } : item),
          sales: current.sales.map((sale) => {
            const salesReturn = current.salesReturns.find((item) => item.refundTransactionId === original.id && item.saleId === sale.id);
            return salesReturn ? { ...sale, paidAmount: sale.paidAmount + salesReturn.refundAmount } : sale;
          }),
          payrolls: current.payrolls.map((payroll) => payroll.paymentTransactionId === original.id ? {
            ...payroll, status: "Disetujui" as const, paymentTransactionId: undefined, paidFromAccountId: undefined,
            paidBy: undefined, paidAt: undefined, payslipNumber: undefined,
          } : payroll),
          auditLogs: [auditEntry(actor, "Mutasi Kas", original.id, original.number, "Diubah", [`Dibalik oleh ${reversal.number}`, `Alasan: ${reason.trim()}`]), ...current.auditLogs],
        }));
        return reversal;
      },
      addEmployee: (draft) => {
        assertAction(get(), "hr.manage", "Hanya Owner atau Admin HR/Finance yang dapat menambah karyawan.");
        set((state) => ({
          employees: [
            ...state.employees,
            {
              id: uniqueId("emp"),
              number: `RH-${String(state.employees.length + 1).padStart(3, "0")}`,
              ...draft,
              attendanceStatus: "Hadir" as const,
              overtimeHours: 0,
            },
          ],
        }));
      },
      runPayroll: () => {
        assertAction(get(), "hr.manage", "Hanya Owner atau Admin HR/Finance yang dapat memproses payroll.");
        set((state) => {
          const draftPayrolls = state.payrolls.filter((payroll) => payroll.status === "Draft");
          if (draftPayrolls.length === 0) return state;
          return {
            payrolls: state.payrolls.map((payroll) =>
              payroll.status === "Draft" ? { ...payroll, status: "Disetujui" as const } : payroll,
            ),
          };
        });
      },
      payPayroll: (period, accountId) => {
        const actor = assertAction(get(), "hr.manage", "Hanya Owner atau Admin HR/Finance yang dapat membayar payroll.");
        const state = get();
        const periodPayrolls = state.payrolls.filter((item) => item.period === period);
        if (!periodPayrolls.length) throw new Error("Periode payroll tidak ditemukan.");
        if (periodPayrolls.some((item) => item.status !== "Disetujui")) throw new Error("Seluruh slip pada periode harus berstatus Disetujui sebelum dibayar.");
        const account = state.cashAccounts.find((item) => item.id === accountId);
        if (!account) throw new Error("Akun pembayaran payroll tidak ditemukan.");
        const total = periodPayrolls.reduce((sum, item) => sum + item.netPay, 0);
        if (account.balance < total) throw new Error(`Saldo ${account.name} tidak mencukupi untuk payroll.`);
        periodPayrolls.forEach((payroll) => assertWorkflowTransition("payroll", payrollTransitions, payroll.status, "Dibayar"));
        const reference = `PAYROLL-${period.toUpperCase().replaceAll(" ", "-")}`;
        const transaction: CashTransaction = {
          id: uniqueId("cash-payroll"), number: nextNumber("KAS", state.cashTransactions.length), accountId,
          direction: "Keluar", amount: total, description: `Pembayaran payroll ${period}`,
          source: reference, date: shortDate(), status: "Aktif", createdBy: actor.id,
        };
        const paidAt = timestamp();
        set((current) => ({
          payrolls: current.payrolls.map((payroll) => payroll.period === period ? {
            ...payroll, status: "Dibayar", paymentTransactionId: transaction.id, paidFromAccountId: account.id,
            paidBy: actor.id, paidAt,
            payslipNumber: `SLIP-${period.toUpperCase().replaceAll(" ", "-")}-${current.employees.find((item) => item.id === payroll.employeeId)?.number ?? payroll.employeeId}`,
          } : payroll),
          cashTransactions: [transaction, ...current.cashTransactions],
          cashAccounts: current.cashAccounts.map((item) => item.id === account.id ? { ...item, balance: item.balance - total, updatedAt: paidAt } : item),
          auditLogs: [auditEntry(actor, "Payroll", reference, reference, "Diubah", [`Status: Disetujui → Dibayar`, `${periodPayrolls.length} slip`, `Total: ${total}`, `Akun: ${account.name}`]), ...current.auditLogs],
        }));
        return transaction;
      },
      lockPayrollPeriod: (period) => {
        const actor = assertAction(get(), "hr.manage", "Hanya Owner atau Admin HR/Finance yang dapat mengunci payroll.");
        const state = get();
        const periodPayrolls = state.payrolls.filter((item) => item.period === period);
        if (!periodPayrolls.length) throw new Error("Periode payroll tidak ditemukan.");
        if (periodPayrolls.some((item) => item.status !== "Dibayar")) throw new Error("Seluruh slip harus Dibayar sebelum periode dikunci.");
        periodPayrolls.forEach((payroll) => assertWorkflowTransition("payroll", payrollTransitions, payroll.status, "Dikunci"));
        const lockedAt = timestamp();
        set((current) => ({
          payrolls: current.payrolls.map((payroll) => payroll.period === period ? { ...payroll, status: "Dikunci", lockedBy: actor.id, lockedAt } : payroll),
          auditLogs: [auditEntry(actor, "Payroll", period, period, "Diubah", [`Status: Dibayar → Dikunci`, `${periodPayrolls.length} slip dikunci`]), ...current.auditLogs],
        }));
      },
      createStockCount: (warehouse) => {
        const actor = assertAction(get(), "inventory.stock-count", "Hanya Owner atau Staff Gudang yang dapat membuat stok opname.");
        const state = get();
        const normalizedWarehouse = warehouse.trim();
        if (!normalizedWarehouse) throw new Error("Pilih area gudang untuk stok opname.");
        if (state.stockCounts.some((count) => count.warehouse === normalizedWarehouse && ["Draft", "Sedang Dihitung", "Siap Diposting"].includes(count.status))) {
          throw new Error("Masih ada stok opname aktif pada area gudang ini.");
        }
        const lines = state.stocks.filter((stock) => stock.warehouse === normalizedWarehouse).map((stock) => ({
          id: uniqueId("stock-count-line"), stockId: stock.id, productId: stock.productId, warehouse: stock.warehouse,
          lot: stock.lot, systemQty: stock.onHand, varianceQty: 0,
        }));
        if (!lines.length) throw new Error("Tidak ada lot aktif pada area gudang ini untuk dihitung.");
        const count: StockCount = {
          id: uniqueId("stock-count"), number: nextNumber("OPN", state.stockCounts.length), warehouse: normalizedWarehouse,
          createdBy: actor.id, createdAt: timestamp(), status: "Draft", lines,
        };
        assertWorkflowTransition("stok opname", stockCountTransitions, count.status, "Sedang Dihitung");
        count.status = "Sedang Dihitung";
        set((current) => ({
          stockCounts: [count, ...current.stockCounts],
          auditLogs: [auditEntry(actor, "Stok Opname", count.id, count.number, "Dibuat", [`Area: ${normalizedWarehouse}`, `${lines.length} lot dimasukkan ke daftar hitung`]), ...current.auditLogs],
        }));
        return count;
      },
      updateStockCountLine: (stockCountId, lineId, countedQty, reason = "") => {
        const actor = assertAction(get(), "inventory.stock-count", "Hanya Owner atau Staff Gudang yang dapat mengisi stok opname.");
        if (!Number.isFinite(countedQty) || countedQty < 0) throw new Error("Hasil hitung fisik harus berupa angka nol atau lebih.");
        const state = get();
        const count = state.stockCounts.find((item) => item.id === stockCountId);
        if (!count) throw new Error("Dokumen stok opname tidak ditemukan.");
        if (count.status !== "Sedang Dihitung") throw new Error("Stok opname ini tidak dapat lagi diubah.");
        const line = count.lines.find((item) => item.id === lineId);
        if (!line) throw new Error("Baris lot stok opname tidak ditemukan.");
        const varianceQty = roundStockQuantity(countedQty - line.systemQty);
        if (varianceQty !== 0 && !reason.trim()) throw new Error("Alasan selisih wajib diisi.");
        set((current) => ({
          stockCounts: current.stockCounts.map((item) => item.id === count.id ? {
            ...item, status: "Sedang Dihitung", lines: item.lines.map((currentLine) => currentLine.id === line.id ? {
              ...currentLine, countedQty: roundStockQuantity(countedQty), varianceQty, reason: reason.trim() || undefined,
            } : currentLine),
          } : item),
          auditLogs: [auditEntry(actor, "Stok Opname", count.id, count.number, "Diubah", [`Lot ${line.lot}: hitung fisik ${roundStockQuantity(countedQty)}`, `Selisih: ${varianceQty}`]), ...current.auditLogs],
        }));
      },
      submitStockCount: (stockCountId) => {
        const actor = assertAction(get(), "inventory.stock-count", "Hanya Owner atau Staff Gudang yang dapat mengajukan stok opname.");
        const state = get();
        const count = state.stockCounts.find((item) => item.id === stockCountId);
        if (!count) throw new Error("Dokumen stok opname tidak ditemukan.");
        if (count.status !== "Sedang Dihitung") throw new Error("Hanya stok opname yang sedang dihitung dapat diajukan.");
        if (count.lines.some((line) => line.countedQty === undefined)) throw new Error("Lengkapi hasil hitung fisik untuk setiap lot.");
        if (count.lines.some((line) => line.varianceQty !== 0 && !line.reason?.trim())) throw new Error("Alasan selisih wajib diisi untuk semua lot yang berbeda.");
        const variances = count.lines.filter((line) => line.varianceQty !== 0);
        const nextStatus = "Siap Diposting" as const;
        assertWorkflowTransition("stok opname", stockCountTransitions, count.status, nextStatus);
        set((current) => ({
          stockCounts: current.stockCounts.map((item) => item.id === count.id ? {
            ...item, status: nextStatus, submittedAt: timestamp(),
          } : item),
          auditLogs: [auditEntry(actor, "Stok Opname", count.id, count.number, "Diubah", [`Siap diposting langsung: ${variances.length} lot selisih`]), ...current.auditLogs],
        }));
      },
      postStockCount: (stockCountId) => {
        const actor = assertAction(get(), "inventory.stock-count", "Hanya Owner atau Staff Gudang yang dapat memposting stok opname.");
        const state = get();
        const count = state.stockCounts.find((item) => item.id === stockCountId);
        if (!count) throw new Error("Dokumen stok opname tidak ditemukan.");
        if (count.status !== "Siap Diposting") throw new Error("Stok opname harus siap diposting.");
        assertWorkflowTransition("stok opname", stockCountTransitions, count.status, "Diposting");
        const movements = count.lines.filter((line) => line.varianceQty !== 0).map((line) => {
          const product = state.products.find((item) => item.id === line.productId);
          if (!product) throw new Error("Produk pada stok opname tidak ditemukan.");
          return createStockMovement(actor, {
            type: "Koreksi Stok", productId: line.productId, lot: line.lot, quantity: Math.abs(line.varianceQty), unit: product.stockUnit,
            fromWarehouse: line.varianceQty < 0 ? line.warehouse : undefined, toWarehouse: line.varianceQty > 0 ? line.warehouse : undefined,
            reference: count.number, notes: line.reason,
          });
        });
        set((current) => ({
          stocks: current.stocks.map((stock) => {
            const line = count.lines.find((candidate) => candidate.stockId === stock.id);
            return line && line.countedQty !== undefined ? { ...stock, onHand: line.countedQty } : stock;
          }).filter((stock) => stock.onHand > 0.000001),
          stockMovements: [...movements.reverse(), ...current.stockMovements],
          stockCounts: current.stockCounts.map((item) => item.id === count.id ? { ...item, status: "Diposting", postedBy: actor.id, postedAt: timestamp() } : item),
          auditLogs: [auditEntry(actor, "Stok Opname", count.id, count.number, "Diubah", [`Diposting dengan ${movements.length} koreksi lot`]), ...current.auditLogs],
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
      version: 17,
      migrate: (persistedState) => {
        const previous = (persistedState ?? {}) as Partial<ERPStore>;
        const supportedPrevious = { ...(previous as unknown as Record<string, unknown>) };
        for (const legacyKey of ["approvals", "recipes", "qualityInspections", "supplierQualitySnapshots"]) {
          delete supportedPrevious[legacyKey];
        }
        const previousProducts = previous.products ?? [];
        const migratedProducts = seedProducts.map((seed) => {
          const old = previousProducts.find((item) => item.id === seed.id);
          if (!old) return clone(seed);
          if (seed.type !== "Produk Jadi") return { ...seed, ...old };
          return {
            ...seed,
            agent1Price: old.agent1Price,
            agent2Price: old.agent2Price,
            cost: old.cost,
            shelfLifeDays: old.shelfLifeDays,
            minStock: old.minStock,
            weightValue: old.weightValue,
            weightUnit: old.weightUnit,
            notes: old.notes || seed.notes,
            isActive: seed.isActive && old.isActive,
          };
        });
        const knownIds = new Set(seedProducts.map((item) => item.id));
        const customProducts = previousProducts
          .filter((item) => !knownIds.has(item.id))
          .map((item) => item.type === "Produk Jadi" ? { ...item, isActive: false } : item);
        const reconciliationSales = seedSales.filter((item) => item.id === "sale-006");
        const migratedSales = previous.sales
          ? [...reconciliationSales.filter((seed) => !previous.sales!.some((item) => item.id === seed.id || item.number === seed.number)), ...previous.sales]
          : clone(seedSales);
        const legacySeedHppIds = new Set(["hpp-001", "hpp-002", "hpp-003"]);
        const preservedManualHpp = (previous.costOfGoodsSold ?? [])
          .filter((item) => !["Otomatis Penjualan", "Otomatis Retur"].includes(item.source ?? "") && !legacySeedHppIds.has(item.id));
        const automaticHpp = migratedSales.flatMap((sale) => buildAutomaticHppForSale(sale, [...migratedProducts, ...customProducts]));
        const automaticReturnHpp = (previous.salesReturns ?? []).flatMap((salesReturn) => buildAutomaticHppForReturn(salesReturn, [...migratedProducts, ...customProducts]));
        return {
          ...supportedPrevious,
          salesTargets: previous.salesTargets ?? [],
          salesReturns: previous.salesReturns ?? [],
          sales: migratedSales,
          products: [...migratedProducts, ...customProducts],
          finishedProductCategories: clone(seedFinishedProductCategories),
          finishedProductTypes: clone(seedFinishedProductTypes),
          finishedProductVariants: clone(seedFinishedProductVariants),
          stocks: clone(seedStocks),
          stockMovements: clone(seedStockMovements),
          productionOrders: clone(seedProductionOrders),
          materialPurchaseRequests: clone(seedMaterialPurchaseRequests),
          goodsReceipts: previous.goodsReceipts ?? clone(seedGoodsReceipts),
          stockCounts: previous.stockCounts ?? clone(seedStockCounts),
          supplierQuotations: previous.supplierQuotations ?? clone(seedSupplierQuotations),
          cashAccounts: previous.cashAccounts ?? clone(seedCashAccounts),
          cashTransactions: previous.cashTransactions ?? clone(seedCashTransactions),
          costOfGoodsSold: [...automaticReturnHpp, ...automaticHpp, ...preservedManualHpp],
        } as ERPStore;
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        users: state.users,
        customers: state.customers,
        suppliers: state.suppliers,
        supplierQuotations: state.supplierQuotations,
        products: state.products,
        finishedProductCategories: state.finishedProductCategories,
        finishedProductTypes: state.finishedProductTypes,
        finishedProductVariants: state.finishedProductVariants,
        stocks: state.stocks,
        stockMovements: state.stockMovements,
        sales: state.sales,
        salesReturns: state.salesReturns,
        salesTargets: state.salesTargets,
        salesShifts: state.salesShifts,
        productionOrders: state.productionOrders,
        materialPurchaseRequests: state.materialPurchaseRequests,
        purchaseOrders: state.purchaseOrders,
        goodsReceipts: state.goodsReceipts,
        stockCounts: state.stockCounts,
        invoices: state.invoices,
        expenses: state.expenses,
        cashAccounts: state.cashAccounts,
        cashTransactions: state.cashTransactions,
        costOfGoodsSold: state.costOfGoodsSold,
        employees: state.employees,
        payrolls: state.payrolls,
        notifications: state.notifications,
        auditLogs: state.auditLogs,
      }),
    },
  ),
);
