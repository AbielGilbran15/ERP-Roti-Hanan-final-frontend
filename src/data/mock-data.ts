import type {
  AppNotification,
  AppUser,
  AuditLog,
  BusinessProfile,
  CashAccount,
  CashTransaction,
  CostOfGoodsSold,
  Customer,
  Employee,
  Expense,
  GoodsReceipt,
  FinishedProductCategory,
  FinishedProductTypeDefinition,
  FinishedProductVariant,
  Invoice,
  Payroll,
  Product,
  MaterialPurchaseRequest,
  ProductionOrder,
  PurchaseOrder,
  Sale,
  SalesShift,
  StockItem,
  StockCount,
  StockMovement,
  Supplier,
  SupplierQuotation,
} from "@/lib/types";
import { buildAutomaticHppForSale } from "@/lib/finance";

export const businessProfile: BusinessProfile = {
  id: "business-roti-hanan",
  code: "PST",
  name: "Pusat Bandung",
  address: "Jl. Soekarno Hatta, Bandung",
};

export const users: AppUser[] = [
  {
    id: "usr-asep",
    name: "Asep",
    username: "asep",
    email: "asep.hanan@gmail.com",
    password: "hanan123",
    employeeId: "emp-001",
    phone: "0812 2000 1001",
    role: "Owner",
    isActive: true,
    lastLogin: "2026-08-23T06:42:00+07:00",
  },
  {
    id: "usr-siti",
    name: "Siti Nurhayati",
    username: "siti.finance",
    email: "siti.finance.hanan@gmail.com",
    password: "hanan123",
    employeeId: "emp-002",
    phone: "0812 2000 1002",
    role: "Admin HR/Finance",
    isActive: true,
    lastLogin: "2026-08-23T07:05:00+07:00",
  },
  {
    id: "usr-rina",
    name: "Rina Marlina",
    username: "sales.pusat",
    email: "rina.hanan@gmail.com",
    password: "hanan123",
    employeeId: "emp-003",
    phone: "0812 2000 1003",
    role: "Admin Penjualan/Sales",
    isActive: true,
    lastLogin: "2026-08-23T07:01:00+07:00",
  },
  {
    id: "usr-yudi",
    name: "Yudi Hermawan",
    username: "gudang.pusat",
    email: "yudi.hanan@gmail.com",
    password: "hanan123",
    employeeId: "emp-004",
    phone: "0812 2000 1004",
    role: "Staff Gudang",
    isActive: true,
  },
  {
    id: "usr-aulia",
    name: "Aulia Rahman",
    username: "produksi.pusat",
    email: "aulia.hanan@gmail.com",
    password: "hanan123",
    employeeId: "emp-005",
    phone: "0812 2000 1005",
    role: "Staff Produksi",
    isActive: true,
  },
  {
    id: "usr-fikri",
    name: "Fikri Ramadhan",
    username: "produksi.fikri",
    email: "fikri.hanan@gmail.com",
    password: "hanan123",
    employeeId: "emp-006",
    phone: "0812 2000 1006",
    role: "Staff Produksi",
    isActive: true,
  },
  {
    id: "usr-ratna",
    name: "Ratna Wulandari",
    username: "purchasing.pusat",
    email: "ratna.hanan@gmail.com",
    password: "hanan123",
    employeeId: "emp-007",
    phone: "0812 2000 1007",
    role: "Staff Purchasing",
    isActive: true,
  },
];

export const customers: Customer[] = [
  { id: "cust-koperasi", code: "AG1-001", name: "Koperasi Sejahtera", contactName: "Dedi Suhendar", category: "Agen 1", phone: "0812 3100 1001", address: "Jl. Buah Batu No. 18", city: "Bandung", paymentTermsDays: 14, creditLimit: 15000000, notes: "Pengiriman diterima sebelum pukul 12.00.", isActive: true },
  { id: "cust-mitra", code: "AG1-002", name: "CV Mitra Niaga", contactName: "Sari Puspita", category: "Agen 1", phone: "0812 3100 1002", address: "Jl. Kopo No. 88", city: "Bandung", paymentTermsDays: 14, creditLimit: 12000000, notes: "Konfirmasi pesanan melalui WhatsApp.", isActive: true },
  { id: "cust-sari", code: "AG2-001", name: "Toko Sari Rasa", contactName: "Hendra", category: "Agen 2", phone: "0812 3200 1001", address: "Jl. Cibaduyut No. 41", city: "Bandung", paymentTermsDays: 0, creditLimit: 0, notes: "Pembayaran tunai/QRIS.", isActive: true },
  { id: "cust-berkah", code: "AG2-002", name: "Warung Berkah", contactName: "Nina", category: "Agen 2", phone: "0812 3200 1002", address: "Jl. Amir Machmud No. 12", city: "Cimahi", paymentTermsDays: 0, creditLimit: 0, notes: "Pengiriman sore hari.", isActive: true },
];

export const suppliers: Supplier[] = [
  { id: "sup-sumber", code: "SUP-001", name: "CV Sumber Pangan Jaya", contactName: "Yosep", phone: "0812 4100 1001", address: "Jl. Caringin No. 25", city: "Bandung", paymentTermsDays: 14, notes: "Supplier utama tepung dan gula.", isActive: true },
  { id: "sup-mentega", code: "SUP-002", name: "PT Mentega Nusantara", contactName: "Lina Hartati", phone: "0812 4100 1002", address: "Kawasan Industri Cimareme Blok C2", city: "Bandung Barat", paymentTermsDays: 14, notes: "Pengiriman menggunakan kendaraan berpendingin.", isActive: true },
  { id: "sup-kemasan", code: "SUP-003", name: "CV Kemasan Prima", contactName: "Agus Setiawan", phone: "0812 4100 1003", address: "Jl. Leuwigajah No. 57", city: "Cimahi", paymentTermsDays: 21, notes: "Supplier kemasan primer.", isActive: true },
  { id: "sup-bahan-roti", code: "SUP-004", name: "PT Bahan Roti Mandiri", contactName: "Tanti", phone: "0812 4100 1004", address: "Jl. Raya Rancaekek KM 21", city: "Kabupaten Bandung", paymentTermsDays: 21, notes: "Supplier alternatif bahan baku.", isActive: true },
];

export const supplierQuotations: SupplierQuotation[] = [
  {
    id: "quotation-001",
    referenceNumber: "PNW-SPJ-260828-014",
    supplierId: "sup-sumber",
    supplierNameSnapshot: "CV Sumber Pangan Jaya",
    productId: "raw-tepung",
    productNameSnapshot: "Tepung Terigu",
    purchaseUnitSnapshot: "Karung",
    unitPrice: 300000,
    minimumOrderQuantity: 2,
    leadTimeDays: 1,
    paymentTermsDaysSnapshot: 14,
    quotedAt: "2026-08-28",
    validUntil: "2026-09-04",
    notes: "Harga franco gudang pusat.",
    createdBy: "usr-ratna",
    createdAt: "2026-08-28T08:35:00+07:00",
  },
  {
    id: "quotation-002",
    referenceNumber: "PNW-BRM-260828-009",
    supplierId: "sup-bahan-roti",
    supplierNameSnapshot: "PT Bahan Roti Mandiri",
    productId: "raw-tepung",
    productNameSnapshot: "Tepung Terigu",
    purchaseUnitSnapshot: "Karung",
    unitPrice: 305000,
    minimumOrderQuantity: 2,
    leadTimeDays: 2,
    paymentTermsDaysSnapshot: 21,
    quotedAt: "2026-08-28",
    validUntil: "2026-09-04",
    notes: "Pengiriman mengikuti jadwal armada supplier.",
    createdBy: "usr-ratna",
    createdAt: "2026-08-28T08:42:00+07:00",
  },
];

export const finishedProductCategories: FinishedProductCategory[] = [
  { id: "finished-category-black-forest", code: "BLACK-FOREST", name: "Roti Black Forest", requiresType: false, requiresVariant: false, sortOrder: 1, isActive: true },
  { id: "finished-category-roti-box", code: "ROTI-BOX", name: "Roti Box", requiresType: true, requiresVariant: true, sortOrder: 2, isActive: true },
];

export const finishedProductTypes: FinishedProductTypeDefinition[] = [
  { id: "finished-type-reguler", categoryId: "finished-category-roti-box", code: "REGULER", name: "Reguler", sortOrder: 1, isActive: true },
  { id: "finished-type-mix", categoryId: "finished-category-roti-box", code: "MIX", name: "Mix", sortOrder: 2, isActive: true },
  { id: "finished-type-ekonomis", categoryId: "finished-category-roti-box", code: "EKONOMIS", name: "Ekonomis", sortOrder: 3, isActive: true },
  { id: "finished-type-mini", categoryId: "finished-category-roti-box", code: "MINI", name: "Mini", sortOrder: 4, isActive: true },
];

const regularVariantNames = [
  "Coklat Keju", "Coklat Kacang", "Coklat Ceres", "Bolognese", "Susu Keju", "Abon Ori", "Abon Pedas", "Abon Rendang Pedas",
  "Tiramisu", "Vanila Coklat", "Oreo", "Red Velvet", "Durian Keju", "Strawberry Keju", "Blueberry Keju", "Mangga Keju",
];

const mixVariantDefinitions = [
  { name: "3D", description: "Kombinasi cokelat, keju, dan kacang yang melimpah pada bagian luar dan dalam roti." },
  { name: "Asin", description: "" },
  { name: "Manis", description: "" },
  { name: "Asin Manis", description: "" },
  { name: "Sweet", description: "" },
  { name: "Sweet G", description: "" },
];

const economicVariantNames = ["Salju Pink", "Salju Purple", "Salju Vanila", "Double Pink"];

const createVariants = (
  typeId: string,
  codePrefix: string,
  definitions: Array<string | { name: string; description: string }>,
): FinishedProductVariant[] => definitions.map((definition, index) => {
  const item = typeof definition === "string" ? { name: definition, description: "" } : definition;
  return {
    id: `finished-variant-${codePrefix.toLowerCase()}-${String(index + 1).padStart(2, "0")}`,
    typeId,
    code: `${codePrefix}-${String(index + 1).padStart(2, "0")}`,
    name: item.name,
    description: item.description,
    sortOrder: index + 1,
    isActive: true,
  };
});

export const finishedProductVariants: FinishedProductVariant[] = [
  ...createVariants("finished-type-reguler", "REG", regularVariantNames),
  ...createVariants("finished-type-mix", "MIX", mixVariantDefinitions),
  ...createVariants("finished-type-ekonomis", "EKO", economicVariantNames),
  ...createVariants("finished-type-mini", "MIN", regularVariantNames),
];

const operationalFinishedProductFields: Record<string, Partial<Product>> = {
  "finished-variant-reg-01": { id: "prd-roti-cokelat", weightValue: 80, weightUnit: "Gram", agent1Price: 9000, agent2Price: 9500, cost: 4680, shelfLifeDays: 5, minStock: 100, notes: "HPP master dipakai untuk valuasi stok dan laba.", isActive: true },
  "finished-variant-reg-02": { id: "prd-tawar", weightValue: 400, weightUnit: "Gram", agent1Price: 17000, agent2Price: 18000, cost: 9200, shelfLifeDays: 5, minStock: 60, notes: "Data operasional demo dipertahankan saat klasifikasi diterapkan.", isActive: true },
  "finished-variant-reg-03": { id: "prd-croissant", weightValue: 65, weightUnit: "Gram", agent1Price: 11000, agent2Price: 12000, cost: 6100, shelfLifeDays: 3, minStock: 60, notes: "Data operasional demo dipertahankan saat klasifikasi diterapkan.", isActive: true },
  "finished-variant-reg-04": { id: "prd-donat", weightValue: 55, weightUnit: "Gram", agent1Price: 6000, agent2Price: 6500, cost: 3100, shelfLifeDays: 2, minStock: 100, notes: "Data operasional demo dipertahankan saat klasifikasi diterapkan.", isActive: true },
  "finished-variant-reg-05": { id: "prd-roti-susu", weightValue: 60, weightUnit: "Gram", agent1Price: 8000, agent2Price: 8500, cost: 4120, shelfLifeDays: 3, minStock: 120, isActive: true },
  "finished-variant-reg-06": { id: "prd-pisang", weightValue: 55, weightUnit: "Gram", agent1Price: 7000, agent2Price: 7500, cost: 3890, shelfLifeDays: 4, minStock: 80, isActive: true },
  "finished-variant-mix-01": { id: "prd-roti-keju", weightValue: 60, weightUnit: "Gram", agent1Price: 9500, agent2Price: 10000, cost: 5020, shelfLifeDays: 3, minStock: 100, isActive: true },
};

const seedFinishedProducts = (): Product[] => {
  const blackForest: Product = {
    id: "prd-black-forest",
    code: "RJ-001",
    name: "Roti Black Forest",
    type: "Produk Jadi",
    finishedProductCategoryId: "finished-category-black-forest",
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
    notes: "Satuan jual/stok Roti Black Forest belum dikonfirmasi (Q52).",
    isActive: false,
  };

  const boxProducts = finishedProductTypes.flatMap((type) =>
    finishedProductVariants
      .filter((variant) => variant.typeId === type.id)
      .map((variant) => ({ type, variant })),
  ).map(({ type, variant }, index): Product => ({
    id: `prd-roti-box-${String(index + 1).padStart(2, "0")}`,
    code: `RJ-${String(index + 2).padStart(3, "0")}`,
    name: `Roti Box — ${type.name} — ${variant.name}`,
    type: "Produk Jadi",
    finishedProductCategoryId: "finished-category-roti-box",
    finishedProductTypeId: type.id,
    finishedProductVariantId: variant.id,
    stockUnit: "Box",
    conversionValue: 1,
    purchasePrice: 0,
    salesUnit: "Box",
    packagingDescription: type.name === "Mini" ? "Kemasan Mini; kebutuhan material dicatat manual pada permintaan bahan batch." : "Kebutuhan material dicatat manual pada permintaan bahan batch.",
    weightValue: 0,
    weightUnit: "",
    agent1Price: 0,
    agent2Price: 0,
    cost: 0,
    shelfLifeDays: 0,
    minStock: 0,
    notes: variant.description,
    isActive: false,
    ...operationalFinishedProductFields[variant.id],
  }));

  return [blackForest, ...boxProducts];
};

export const auditLogs: AuditLog[] = [
  { id: "audit-001", entityType: "Pelanggan", recordId: "cust-koperasi", recordLabel: "AG1-001 — Koperasi Sejahtera", action: "Diubah", changes: ["Batas kredit: Rp12.000.000 → Rp15.000.000"], actorId: "usr-siti", actorName: "Siti Nurhayati", createdAt: "2026-08-23T07:20:00+07:00" },
  { id: "audit-002", entityType: "Barang Jadi", recordId: "prd-roti-cokelat", recordLabel: "RJ-002 — Roti Box — Reguler — Coklat Keju", action: "Diubah", changes: ["Harga Agen 1: Rp8.500 → Rp9.000", "Harga Agen 2: Rp9.000 → Rp9.500"], actorId: "usr-rina", actorName: "Rina Marlina", createdAt: "2026-08-22T16:10:00+07:00" },
];

export const products: Product[] = [
  ...seedFinishedProducts(),
  { id: "raw-tepung", code: "BB-001", name: "Tepung Terigu", type: "Bahan Baku", purchaseUnit: "Karung", purchaseContentValue: 25, purchaseContentUnit: "Kg", stockUnit: "Kg", conversionValue: 25, purchasePrice: 300000, agent1Price: 0, agent2Price: 0, cost: 12000, shelfLifeDays: 180, minStockInputValue: 50, minStockInputUnit: "Kg", minStock: 50, notes: "1 Karung berisi 25 Kg.", isActive: true },
  { id: "raw-gula", code: "BB-002", name: "Gula Pasir", type: "Bahan Baku", purchaseUnit: "Karung", purchaseContentValue: 50, purchaseContentUnit: "Kg", stockUnit: "Kg", conversionValue: 50, purchasePrice: 850000, agent1Price: 0, agent2Price: 0, cost: 17000, shelfLifeDays: 365, minStockInputValue: 120, minStockInputUnit: "Kg", minStock: 120, notes: "1 Karung berisi 50 Kg.", isActive: true },
  { id: "raw-mentega", code: "BB-003", name: "Mentega Bakery", type: "Bahan Baku", purchaseUnit: "Karton", purchaseContentValue: 10, purchaseContentUnit: "Kg", stockUnit: "Kg", conversionValue: 10, purchasePrice: 565000, agent1Price: 0, agent2Price: 0, cost: 56500, shelfLifeDays: 120, minStockInputValue: 80, minStockInputUnit: "Kg", minStock: 80, notes: "1 Karton berisi 10 Kg.", isActive: true },
  { id: "raw-ragi", code: "BB-005", name: "Ragi", type: "Bahan Baku", purchaseUnit: "Pack", purchaseContentValue: 500, purchaseContentUnit: "Gram", stockUnit: "Gram", conversionValue: 500, purchasePrice: 40000, agent1Price: 0, agent2Price: 0, cost: 80, shelfLifeDays: 90, minStockInputValue: 5000, minStockInputUnit: "Gram", minStock: 5000, notes: "1 Pack berisi 500 Gram.", isActive: true },
  { id: "topping-cokelat", code: "TP-001", name: "Cokelat Topping", type: "Bahan Baku Toping", purchaseUnit: "Karton", purchaseContentValue: 10, purchaseContentUnit: "Kg", stockUnit: "Gram", conversionValue: 10000, purchasePrice: 900000, agent1Price: 0, agent2Price: 0, cost: 90, shelfLifeDays: 180, minStockInputValue: 10, minStockInputUnit: "Kg", minStock: 10000, notes: "Contoh konversi stok minimum 10 Kg menjadi 10.000 Gram.", isActive: true },
  { id: "pack-plastik", code: "KP-001", name: "Plastik Roti", type: "Kemasan", purchaseUnit: "Pack", purchaseContentValue: 100, purchaseContentUnit: "Pcs", stockUnit: "Pcs", conversionValue: 100, purchasePrice: 35000, agent1Price: 0, agent2Price: 0, cost: 350, shelfLifeDays: 730, minStockInputValue: 3000, minStockInputUnit: "Pcs", minStock: 3000, notes: "1 Pack berisi 100 Pcs.", isActive: true },
];

export const stocks: StockItem[] = [
  { id: "stk-001", productId: "raw-tepung", warehouse: "Gudang Bahan", lot: "TPG-260815-A", expiryDate: "2027-02-11", onHand: 324, reserved: 0, status: "Tersedia" },
  { id: "stk-002", productId: "raw-gula", warehouse: "Gudang Bahan", lot: "GLA-260801-B", expiryDate: "2027-08-01", onHand: 72, reserved: 0, status: "Tersedia" },
  { id: "stk-003", productId: "raw-mentega", warehouse: "Gudang Bahan", lot: "MTG-260820-C", expiryDate: "2026-12-18", onHand: 72, reserved: 0, status: "Tersedia" },
  { id: "stk-004", productId: "raw-ragi", warehouse: "Gudang Bahan", lot: "RGI-260710-A", expiryDate: "2026-09-03", onHand: 12000, reserved: 0, status: "Tersedia" },
  { id: "stk-005", productId: "pack-plastik", warehouse: "Gudang Bahan", lot: "PKG-260803", expiryDate: "2028-08-03", onHand: 3810, reserved: 0, status: "Tersedia" },
  { id: "stk-top-001", productId: "topping-cokelat", warehouse: "Gudang Bahan", lot: "TOP-260820-A", expiryDate: "2027-02-20", onHand: 25000, reserved: 0, status: "Tersedia" },
  { id: "stk-stage-prod-002-flour", productId: "raw-tepung", warehouse: "Staging Produksi", lot: "TPG-260815-A", expiryDate: "2027-02-11", onHand: 52, reserved: 0, status: "Staging Produksi", referenceId: "prod-002" },
  { id: "stk-stage-prod-002-sugar", productId: "raw-gula", warehouse: "Staging Produksi", lot: "GLA-260801-B", expiryDate: "2027-08-01", onHand: 12, reserved: 0, status: "Staging Produksi", referenceId: "prod-002" },
  { id: "stk-stage-prod-002-yeast", productId: "raw-ragi", warehouse: "Staging Produksi", lot: "RGI-260710-A", expiryDate: "2026-09-03", onHand: 1000, reserved: 0, status: "Staging Produksi", referenceId: "prod-002" },
  { id: "stk-stage-prod-002-packaging", productId: "pack-plastik", warehouse: "Staging Produksi", lot: "PKG-260803", expiryDate: "2028-08-03", onHand: 520, reserved: 0, status: "Staging Produksi", referenceId: "prod-002" },
  { id: "stk-prod-003-keju", productId: "prd-roti-keju", warehouse: "Gudang Produk Jadi", lot: "LOT-RK-260823-P3-01", expiryDate: "2026-08-26", onHand: 408, reserved: 120, status: "Tersedia", referenceId: "prod-003" },
  { id: "stk-006", productId: "prd-roti-susu", warehouse: "Gudang Produk Jadi", lot: "RS-260823-P1", expiryDate: "2026-08-26", onHand: 340, reserved: 0, status: "Tersedia" },
  { id: "stk-007", productId: "prd-roti-cokelat", warehouse: "Gudang Produk Jadi", lot: "RC-260822-P4", expiryDate: "2026-08-25", onHand: 268, reserved: 0, status: "Tersedia" },
  { id: "stk-008", productId: "prd-roti-susu", warehouse: "Gudang Produk Jadi", lot: "RS-260822-P3", expiryDate: "2026-08-25", onHand: 142, reserved: 0, status: "Tersedia" },
  { id: "stk-009", productId: "prd-tawar", warehouse: "Gudang Produk Jadi", lot: "RT-260822-P2", expiryDate: "2026-08-27", onHand: 131, reserved: 0, status: "Tersedia" },
  { id: "stk-011", productId: "prd-roti-susu", warehouse: "Barang Dalam Pengiriman", lot: "RS-260823-P1", expiryDate: "2026-08-26", onHand: 80, reserved: 0, status: "Dalam Pengiriman", referenceId: "sale-004" },
  { id: "stk-012", productId: "prd-roti-cokelat", warehouse: "Barang Dalam Pengiriman", lot: "RC-260822-P4", expiryDate: "2026-08-25", onHand: 80, reserved: 0, status: "Dalam Pengiriman", referenceId: "sale-004" },
];

export const stockMovements: StockMovement[] = [
  { id: "mov-001", type: "Pengeluaran Produksi", productId: "raw-tepung", lot: "TPG-260815-A", quantity: 52, unit: "Kg", fromWarehouse: "Gudang Bahan", toWarehouse: "Staging Produksi", reference: "PRD-RC-260823-P2", actorId: "usr-yudi", createdAt: "2026-08-23T05:40:00+07:00" },
  { id: "mov-002", type: "Pengeluaran Produksi", productId: "raw-gula", lot: "GLA-260801-B", quantity: 12, unit: "Kg", fromWarehouse: "Gudang Bahan", toWarehouse: "Staging Produksi", reference: "PRD-RC-260823-P2", actorId: "usr-yudi", createdAt: "2026-08-23T05:42:00+07:00" },
  { id: "mov-003", type: "Output Produksi", productId: "prd-roti-keju", lot: "LOT-RK-260823-P3-01", quantity: 408, unit: "Box", toWarehouse: "Gudang Produk Jadi", reference: "PRD-RK-260823-P3", actorId: "usr-aulia", createdAt: "2026-08-23T08:16:00+07:00", notes: "Hasil berhasil langsung masuk Gudang Produk Jadi." },
  { id: "mov-004", type: "Waste Produksi", productId: "prd-roti-keju", lot: "LOT-RK-260823-P3-01", quantity: 12, unit: "Box", reference: "PRD-RK-260823-P3", actorId: "usr-aulia", createdAt: "2026-08-23T08:16:00+07:00", notes: "Bentuk produk tidak sesuai." },
];

export const sales: Sale[] = [
  { id: "sale-001", number: "POS-PST-260823-0148", salesAdminId: "usr-rina", customerId: "cust-sari", customerCategory: "Agen 2", createdAt: "2026-08-23T09:42:00+07:00", items: [{ productId: "prd-roti-susu", quantity: 12, unitPrice: 8500 }, { productId: "prd-roti-cokelat", quantity: 8, unitPrice: 9500 }], subtotal: 178000, discount: 0, total: 178000, paidAmount: 178000, paymentMethod: "QRIS", orderSource: "POS", fulfillmentMethod: "Diambil", status: "Selesai", paymentTermsDaysSnapshot: 0, creditLimitSnapshot: 0, receivedAt: "2026-08-23T09:42:00+07:00", deliveryProof: "Serah terima POS" },
  { id: "sale-002", number: "POS-PST-260823-0147", salesAdminId: "usr-rina", customerId: "cust-koperasi", customerCategory: "Agen 1", createdAt: "2026-08-23T09:31:00+07:00", items: [{ productId: "prd-tawar", quantity: 10, unitPrice: 17000 }], subtotal: 170000, discount: 0, total: 170000, paidAmount: 170000, paymentMethod: "Tunai", orderSource: "POS", fulfillmentMethod: "Diambil", status: "Selesai", paymentTermsDaysSnapshot: 14, creditLimitSnapshot: 15000000, receivedAt: "2026-08-23T09:31:00+07:00", deliveryProof: "Serah terima POS" },
  { id: "sale-003", number: "SO-PST-260823-0020", salesAdminId: "usr-rina", customerId: "cust-berkah", customerCategory: "Agen 2", createdAt: "2026-08-23T08:55:00+07:00", neededAt: "2026-08-23T09:00:00+07:00", items: [{ productId: "prd-roti-keju", quantity: 20, unitPrice: 10000 }], subtotal: 200000, discount: 0, total: 200000, paidAmount: 200000, paymentMethod: "Transfer", orderSource: "WhatsApp", fulfillmentMethod: "Dikirim", status: "Selesai", paymentTermsDaysSnapshot: 0, creditLimitSnapshot: 0, dispatchedAt: "2026-08-23T09:05:00+07:00", receivedAt: "2026-08-23T10:14:00+07:00", deliveryProof: "Foto surat jalan diterima Pak Dedi" },
  { id: "sale-006", number: "POS-PST-260828-001", salesAdminId: "usr-rina", customerId: "cust-sari", customerCategory: "Agen 2", createdAt: "2026-08-28T15:40:00+07:00", items: [{ productId: "prd-roti-susu", quantity: 470, unitPrice: 8500 }, { productId: "prd-roti-cokelat", quantity: 150, unitPrice: 9500 }], subtotal: 5420000, discount: 0, total: 5420000, paidAmount: 5420000, paymentMethod: "Tunai", orderSource: "POS", fulfillmentMethod: "Diambil", status: "Selesai", paymentTermsDaysSnapshot: 0, creditLimitSnapshot: 0, receivedAt: "2026-08-28T15:40:00+07:00", deliveryProof: "Rekap penjualan tunai pusat; cocok dengan KAS-260828-001" },
  { id: "sale-004", number: "SO-PST-260823-0021", salesAdminId: "usr-rina", customerId: "cust-koperasi", customerCategory: "Agen 1", createdAt: "2026-08-23T08:22:00+07:00", neededAt: "2026-08-23T12:00:00+07:00", items: [{ productId: "prd-roti-susu", quantity: 80, unitPrice: 8000 }, { productId: "prd-roti-cokelat", quantity: 80, unitPrice: 9000 }], subtotal: 1360000, discount: 0, total: 1360000, paidAmount: 500000, paymentMethod: "Kredit/Tempo", orderSource: "WhatsApp", fulfillmentMethod: "Dikirim", status: "Dalam Pengiriman", paymentTermsDaysSnapshot: 14, creditLimitSnapshot: 15000000, dueDate: "2026-09-06", dispatchedAt: "2026-08-23T10:00:00+07:00" },
  { id: "sale-005", number: "SO-PST-260823-0022", salesAdminId: "usr-rina", customerId: "cust-mitra", customerCategory: "Agen 1", createdAt: "2026-08-23T09:05:00+07:00", neededAt: "2026-08-24T08:00:00+07:00", items: [{ productId: "prd-roti-keju", quantity: 120, unitPrice: 9500 }, { productId: "prd-pisang", quantity: 90, unitPrice: 7000 }], stockAllocations: [{ id: "sale-allocation-005-keju", productId: "prd-roti-keju", stockId: "stk-prod-003-keju", lot: "LOT-RK-260823-P3-01", quantity: 120, productionOrderId: "prod-003", allocatedAt: "2026-08-23T09:06:00+07:00" }], subtotal: 1770000, discount: 0, total: 1770000, paidAmount: 350000, paymentMethod: "Transfer", orderSource: "Telepon", fulfillmentMethod: "Diambil", status: "Menunggu Produksi", deliveryStatus: "Belum Disiapkan", paymentTermsDaysSnapshot: 14, creditLimitSnapshot: 12000000, dueDate: "2026-09-07" },
];

export const salesShifts: SalesShift[] = [
  { id: "shift-001", salesAdminId: "usr-rina", openedAt: "2026-08-23T06:55:00+07:00", openingCash: 500000, expectedCash: 670000, status: "Buka" },
];

export const productionOrders: ProductionOrder[] = [
  { id: "prod-001", batchNumber: "PRD-RS-260823-P1", materials: [], outputs: [{ id: "output-prod-001-susu", productId: "prd-roti-susu", goodQty: 584, failedQty: 16, failureReason: "Bentuk tidak sesuai." }], resultNotes: "Hasil aktual batch dicatat langsung oleh Staff Produksi.", reportedBy: "usr-aulia", reportedAt: "2026-08-23T05:48:00+07:00", scheduledAt: "2026-08-23T02:00:00+07:00", startedAt: "2026-08-23T02:04:00+07:00", completedAt: "2026-08-23T05:48:00+07:00", machine: "Oven Rotary 01", team: "Tim Pagi A", status: "Selesai", priority: "Tinggi" },
  {
    id: "prod-002", batchNumber: "PRD-RC-260823-P2", outputs: [], materialRequestNumber: "MR-PRD-002", materialRequestedAt: "2026-08-23T05:10:00+07:00", warehouseConfirmedBy: "usr-yudi", warehouseConfirmedAt: "2026-08-23T05:30:00+07:00", materialsConfirmedBy: "usr-aulia", materialsConfirmedAt: "2026-08-23T05:45:00+07:00", scheduledAt: "2026-08-23T06:00:00+07:00", startedAt: "2026-08-23T06:12:00+07:00", machine: "Oven Rotary 02", team: "Tim Pagi B", status: "Berjalan", priority: "Mendesak",
    materials: [
      { id: "req-prod-002-flour", materialProductId: "raw-tepung", role: "Bahan Baku", requestedQty: 52, shortageQty: 0, allocations: [{ id: "alloc-prod-002-flour", stockId: "stk-001", lot: "TPG-260815-A", warehouse: "Gudang Bahan", approvedQty: 52, issuedQty: 52, usedQty: 0 }] },
      { id: "req-prod-002-sugar", materialProductId: "raw-gula", role: "Bahan Baku", requestedQty: 12, shortageQty: 0, allocations: [{ id: "alloc-prod-002-sugar", stockId: "stk-002", lot: "GLA-260801-B", warehouse: "Gudang Bahan", approvedQty: 12, issuedQty: 12, usedQty: 0 }] },
      { id: "req-prod-002-yeast", materialProductId: "raw-ragi", role: "Bahan Baku", requestedQty: 1000, shortageQty: 0, allocations: [{ id: "alloc-prod-002-yeast", stockId: "stk-004", lot: "RGI-260710-A", warehouse: "Gudang Bahan", approvedQty: 1000, issuedQty: 1000, usedQty: 0 }] },
      { id: "req-prod-002-packaging", materialProductId: "pack-plastik", role: "Kemasan", requestedQty: 520, shortageQty: 0, allocations: [{ id: "alloc-prod-002-packaging", stockId: "stk-005", lot: "PKG-260803", warehouse: "Gudang Bahan", approvedQty: 520, issuedQty: 520, usedQty: 0 }] },
    ],
  },
  { id: "prod-003", batchNumber: "PRD-RK-260823-P3", materials: [], outputs: [{ id: "output-prod-003-keju", productId: "prd-roti-keju", goodQty: 408, failedQty: 12, failureReason: "Bentuk produk tidak sesuai.", stockItemId: "stk-prod-003-keju" }], resultNotes: "Hasil berhasil masuk Gudang Produk Jadi; hasil gagal menjadi waste.", reportedBy: "usr-aulia", reportedAt: "2026-08-23T08:16:00+07:00", scheduledAt: "2026-08-23T04:30:00+07:00", startedAt: "2026-08-23T04:42:00+07:00", completedAt: "2026-08-23T08:16:00+07:00", machine: "Oven Deck 03", team: "Tim Pagi A", status: "Selesai", priority: "Normal" },
  {
    id: "prod-004", batchNumber: "PRD-RT-260823-P4", outputs: [], materialRequestNumber: "MR-PRD-004", materialRequestedAt: "2026-08-28T10:00:00+07:00", materialRequestExpiresAt: "2026-08-29T10:00:00+07:00", scheduledAt: "2026-08-28T10:00:00+07:00", machine: "Oven Deck 01", team: "Tim Siang", status: "Menunggu Gudang", priority: "Normal",
    materials: [
      { id: "req-prod-004-flour", materialProductId: "raw-tepung", role: "Bahan Baku", requestedQty: 35, shortageQty: 0, allocations: [] },
      { id: "req-prod-004-sugar", materialProductId: "raw-gula", role: "Bahan Baku", requestedQty: 5, shortageQty: 0, allocations: [] },
      { id: "req-prod-004-yeast", materialProductId: "raw-ragi", role: "Bahan Baku", requestedQty: 650, shortageQty: 0, allocations: [] },
      { id: "req-prod-004-packaging", materialProductId: "pack-plastik", role: "Kemasan", requestedQty: 260, shortageQty: 0, allocations: [] },
    ],
  },
];

export const materialPurchaseRequests: MaterialPurchaseRequest[] = [];

export const goodsReceipts: GoodsReceipt[] = [];
export const stockCounts: StockCount[] = [];

export const purchaseOrders: PurchaseOrder[] = [
  { id: "po-001", number: "PO-PST-260823-017", supplierId: "sup-sumber", supplierNameSnapshot: "CV Sumber Pangan Jaya", createdAt: "2026-08-23", expectedAt: "2026-08-24", paymentTermsDaysSnapshot: 14, items: [{ productId: "raw-tepung", quantity: 2, purchaseUnit: "Karung", purchaseContentValue: 25, purchaseContentUnit: "Kg", stockUnit: "Kg", conversionValue: 25, unitPrice: 300000, receivedQty: 0 }, { productId: "raw-ragi", quantity: 3, purchaseUnit: "Pack", purchaseContentValue: 500, purchaseContentUnit: "Gram", stockUnit: "Gram", conversionValue: 500, unitPrice: 40000, receivedQty: 0 }], total: 720000, status: "Dipesan" },
  { id: "po-002", number: "PO-PST-260822-016", supplierId: "sup-mentega", supplierNameSnapshot: "PT Mentega Nusantara", createdAt: "2026-08-22", expectedAt: "2026-08-23", paymentTermsDaysSnapshot: 14, items: [{ productId: "raw-mentega", quantity: 12, purchaseUnit: "Karton", purchaseContentValue: 10, purchaseContentUnit: "Kg", stockUnit: "Kg", conversionValue: 10, unitPrice: 565000, receivedQty: 12 }], total: 6780000, status: "Diterima" },
  { id: "po-003", number: "PO-PST-260823-018", supplierId: "sup-kemasan", supplierNameSnapshot: "CV Kemasan Prima", createdAt: "2026-08-23", expectedAt: "2026-08-26", paymentTermsDaysSnapshot: 21, items: [{ productId: "pack-plastik", quantity: 100, purchaseUnit: "Pack", purchaseContentValue: 100, purchaseContentUnit: "Pcs", stockUnit: "Pcs", conversionValue: 100, unitPrice: 35000, receivedQty: 0 }], total: 3500000, status: "Dipesan" },
];

export const cashAccounts: CashAccount[] = [
  { id: "cash-account-pusat", name: "Kas Pusat", kind: "Kas", balance: 14350000, updatedAt: "2026-08-28T08:15:00+07:00" },
  { id: "cash-account-bca", name: "Bank BCA Operasional", kind: "Bank", balance: 125000000, updatedAt: "2026-08-28T08:10:00+07:00" },
  { id: "cash-account-bri", name: "Bank BRI Payroll", kind: "Bank", balance: 45000000, updatedAt: "2026-08-28T08:05:00+07:00" },
];

export const cashTransactions: CashTransaction[] = [
  { id: "cash-txn-001", number: "KAS-260828-001", accountId: "cash-account-pusat", direction: "Masuk", amount: 5420000, description: "Penjualan tunai pusat", source: "POS-PST-260828-001", date: "2026-08-28" },
  { id: "cash-txn-002", number: "KAS-260827-002", accountId: "cash-account-bca", direction: "Keluar", amount: 2850000, description: "Pembayaran gas produksi", source: "EXP-PST-260823-021", date: "2026-08-27" },
  { id: "cash-txn-003", number: "KAS-260820-003", accountId: "cash-account-bca", direction: "Masuk", amount: 12500000, description: "Pembayaran piutang agen", source: "INV-SO-260820-018", date: "2026-08-20" },
  { id: "cash-txn-004", number: "KAS-260812-004", accountId: "cash-account-bri", direction: "Keluar", amount: 18750000, description: "Pembayaran payroll mingguan", source: "PAYROLL-AGUSTUS-2026", date: "2026-08-12" },
  { id: "cash-txn-005", number: "KAS-260805-005", accountId: "cash-account-bca", direction: "Masuk", amount: 27600000, description: "Penerimaan penjualan agen", source: "INV-SO-260805-011", date: "2026-08-05" },
];

export const costOfGoodsSold: CostOfGoodsSold[] = sales.flatMap((sale) => buildAutomaticHppForSale(sale, products));

export const invoices: Invoice[] = [
  { id: "inv-001", number: "INV-SO-260823-021", type: "Piutang", party: "Koperasi Sejahtera", customerId: "cust-koperasi", source: "SO-PST-260823-0021", issueDate: "2026-08-23", dueDate: "2026-09-06", total: 1360000, paid: 500000, status: "Dibayar Sebagian" },
  { id: "inv-002", number: "BILL-260822-114", type: "Utang", party: "PT Mentega Nusantara", supplierId: "sup-mentega", source: "PO-PST-260822-016", issueDate: "2026-08-22", dueDate: "2026-09-05", total: 6780000, paid: 0, status: "Belum Bayar" },
  { id: "inv-003", number: "BILL-260810-107", type: "Utang", party: "CV Sumber Pangan Jaya", supplierId: "sup-sumber", source: "PO-PST-260810-009", issueDate: "2026-08-10", dueDate: "2026-08-22", total: 8200000, paid: 4000000, status: "Jatuh Tempo" },
];

export const expenses: Expense[] = [
  { id: "exp-001", number: "EXP-PST-260823-021", department: "Produksi", category: "Gas Produksi", payee: "PT Energi Bandung", amount: 2850000, date: "2026-08-23", status: "Dibayar" },
  { id: "exp-002", number: "EXP-PST-260823-022", department: "Penjualan", category: "Perlengkapan POS", payee: "Toko Perkakas Bandung", amount: 780000, date: "2026-08-23", status: "Disetujui" },
];

export const employees: Employee[] = [
  { id: "emp-001", number: "RH-001", name: "Asep", department: "Manajemen", jobTitle: "Owner", employmentType: "Tetap", basePay: 0, attendanceStatus: "Hadir", overtimeHours: 0 },
  { id: "emp-002", number: "RH-014", name: "Siti Nurhayati", department: "HR & Finance", jobTitle: "Admin HR/Finance", employmentType: "Tetap", basePay: 7200000, attendanceStatus: "Hadir", overtimeHours: 1.5 },
  { id: "emp-003", number: "RH-027", name: "Rina Marlina", department: "Penjualan", jobTitle: "Admin Penjualan/Sales", employmentType: "Tetap", basePay: 4300000, attendanceStatus: "Hadir", overtimeHours: 0 },
  { id: "emp-004", number: "RH-018", name: "Yudi Hermawan", department: "Gudang", jobTitle: "Staff Gudang", employmentType: "Tetap", basePay: 4700000, attendanceStatus: "Terlambat", overtimeHours: 2 },
  { id: "emp-005", number: "RH-022", name: "Aulia Rahman", department: "Produksi", jobTitle: "Staff Produksi", employmentType: "Tetap", basePay: 4850000, attendanceStatus: "Hadir", overtimeHours: 2.5 },
  { id: "emp-006", number: "RH-011", name: "Fikri Ramadhan", department: "Produksi", jobTitle: "Staff Produksi", employmentType: "Tetap", basePay: 5600000, attendanceStatus: "Hadir", overtimeHours: 1 },
  { id: "emp-007", number: "RH-009", name: "Ratna Wulandari", department: "Purchasing", jobTitle: "Staff Purchasing", employmentType: "Tetap", basePay: 5900000, attendanceStatus: "Cuti", overtimeHours: 0, contractEnd: "2026-11-30" },
  { id: "emp-008", number: "RH-034", name: "Dedi Supriadi", department: "Produksi", jobTitle: "Operator Oven", employmentType: "Kontrak", basePay: 4200000, attendanceStatus: "Hadir", overtimeHours: 3, contractEnd: "2026-09-15" },
];

export const payrolls: Payroll[] = employees.filter((employee) => employee.basePay > 0).map((employee, index) => ({
  id: `pay-${index + 1}`,
  period: "Agustus 2026",
  employeeId: employee.id,
  grossPay: employee.basePay + employee.overtimeHours * 35000,
  deductions: employee.attendanceStatus === "Terlambat" ? 50000 : 0,
  netPay: employee.basePay + employee.overtimeHours * 35000 - (employee.attendanceStatus === "Terlambat" ? 50000 : 0),
  status: "Draft",
}));

export const notifications: AppNotification[] = [
  { id: "ntf-001", title: "Stok ragi di bawah minimum", message: "Tersedia 10 kg setelah reservasi. Minimum 18 kg.", type: "critical", module: "Inventori", createdAt: "2026-08-23T09:35:00+07:00", read: false },
  { id: "ntf-002", title: "Pesanan masih kekurangan produk", message: "SO-PST-260823-0022 masih membutuhkan 90 Box Roti Pisang.", type: "warning", module: "Produksi", createdAt: "2026-08-23T09:10:00+07:00", read: false },
  { id: "ntf-003", title: "Pesanan agen dalam pengiriman", message: "SO-PST-260823-0021 menunggu bukti penerimaan Agen 1.", type: "info", module: "Pemenuhan", createdAt: "2026-08-23T10:05:00+07:00", read: false },
  { id: "ntf-004", title: "Piutang melewati jatuh tempo", message: "Tagihan CV Mitra Niaga terlambat 2 hari.", type: "critical", module: "Keuangan", createdAt: "2026-08-23T07:00:00+07:00", read: true },
];

export const salesTrend = [
  { day: "Sen", sales: 18200000, target: 19000000 },
  { day: "Sel", sales: 19600000, target: 19000000 },
  { day: "Rab", sales: 18800000, target: 19000000 },
  { day: "Kam", sales: 21300000, target: 20000000 },
  { day: "Jum", sales: 23800000, target: 22000000 },
  { day: "Sab", sales: 28600000, target: 27000000 },
  { day: "Min", sales: 15420000, target: 26500000 },
];

export const customerCategoryPerformance = [
  { name: "Agen 1", sales: 9840000, margin: 47.8 },
  { name: "Agen 2", sales: 5580000, margin: 51.4 },
];

export const productionTrend = [
  { label: "02:00", target: 600, actual: 584 },
  { label: "06:00", target: 520, actual: 412 },
  { label: "10:00", target: 420, actual: 0 },
  { label: "14:00", target: 260, actual: 0 },
];
