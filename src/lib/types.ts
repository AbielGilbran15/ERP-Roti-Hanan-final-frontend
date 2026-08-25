export type Role =
  | "Owner"
  | "Admin Penjualan/Sales"
  | "Staff Gudang"
  | "Staff Produksi"
  | "QC Inspector"
  | "Staff Purchasing"
  | "Admin HR/Finance";

export type BusinessProfile = {
  id: string;
  code: string;
  name: string;
  address: string;
};

export type AppUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  employeeId?: string;
  phone: string;
  role: Role;
  isActive: boolean;
  mustChangePassword?: boolean;
  lastLogin?: string;
};

export type CustomerCategory = "Agen 1" | "Agen 2";

export type Customer = {
  id: string;
  code: string;
  name: string;
  contactName: string;
  category: CustomerCategory;
  phone: string;
  address: string;
  city: string;
  paymentTermsDays: number;
  creditLimit: number;
  notes: string;
  isActive: boolean;
};

export type Supplier = {
  id: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  address: string;
  city: string;
  paymentTermsDays: number;
  notes: string;
  isActive: boolean;
};

export type MaterialType = "Bahan Baku" | "Kemasan";
export type ProductType = MaterialType | "Produk Jadi";

export type Product = {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  productType?: string;
  purchaseUnit?: string;
  purchaseContentValue?: number;
  purchaseContentUnit?: string;
  stockUnit: string;
  /** Nilai akhir satu satuan beli dalam satuan stok; dihitung otomatis. */
  conversionValue: number;
  purchasePrice: number;
  salesUnit?: string;
  weightValue?: number;
  weightUnit?: string;
  agent1Price: number;
  agent2Price: number;
  cost: number;
  shelfLifeDays: number;
  minStock: number;
  requiresQc: boolean;
  notes: string;
  isActive: boolean;
};

export type StockStatus = "Tersedia" | "Karantina" | "Ditahan" | "Ditolak" | "Dalam Pengiriman";

export type StockItem = {
  id: string;
  productId: string;
  warehouse: string;
  lot: string;
  expiryDate?: string;
  onHand: number;
  reserved: number;
  status: StockStatus;
  referenceId?: string;
};

export type CartLine = {
  productId: string;
  quantity: number;
};

export type SaleLine = CartLine & {
  unitPrice: number;
};

export type PaymentMethod = "Tunai" | "QRIS" | "Transfer" | "Cicilan" | "Kredit/Tempo";
export type OrderSource = "POS" | "WhatsApp" | "Telepon" | "Datang Langsung";
export type FulfillmentMethod = "Diambil" | "Dikirim";
export type SaleStatus =
  | "Menunggu Produksi"
  | "Siap Dipenuhi"
  | "Dalam Pengiriman"
  | "Selesai"
  | "Bermasalah"
  | "Diretur";

export type DeliveryAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  storageKey?: string;
  url?: string;
};

export type Sale = {
  id: string;
  number: string;
  salesAdminId: string;
  customerId: string;
  customerCategory: CustomerCategory;
  createdAt: string;
  neededAt?: string;
  items: SaleLine[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  orderSource: OrderSource;
  fulfillmentMethod: FulfillmentMethod;
  status: SaleStatus;
  paymentTermsDaysSnapshot?: number;
  creditLimitSnapshot?: number;
  dueDate?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  deliveryProof?: string;
  deliveryAttachments?: DeliveryAttachment[];
  deliveryIssue?: string;
};

export type SalesShift = {
  id: string;
  salesAdminId: string;
  openedAt: string;
  openingCash: number;
  expectedCash: number;
  actualCash?: number;
  closedAt?: string;
  status: "Buka" | "Ditutup";
};

export type ProductionStatus = "Dijadwalkan" | "Berjalan" | "Menunggu QC" | "Selesai" | "Ditahan";

export type ProductionOrder = {
  id: string;
  batchNumber: string;
  productId: string;
  recipeVersion: string;
  targetQty: number;
  actualQty: number;
  wasteQty: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  machine: string;
  team: string;
  status: ProductionStatus;
  priority: "Normal" | "Tinggi" | "Mendesak";
};

export type QualityInspection = {
  id: string;
  number: string;
  type: "Bahan Masuk" | "Proses" | "Produk Jadi" | "Sanitasi";
  reference: string;
  itemName: string;
  lot: string;
  inspector: string;
  createdAt: string;
  status: "Menunggu" | "Lulus" | "Ditahan" | "Ditolak";
  sampleSize?: string;
  supplierId?: string;
  notes?: string;
  checks: Array<{ name: string; value: string; result: "Lulus" | "Gagal" }>;
};

export type PurchaseOrder = {
  id: string;
  number: string;
  supplierId: string;
  supplierNameSnapshot: string;
  createdAt: string;
  expectedAt: string;
  paymentTermsDaysSnapshot: number;
  items: Array<
    CartLine & {
      purchaseUnit: string;
      purchaseContentValue: number;
      purchaseContentUnit: string;
      stockUnit: string;
      conversionValue: number;
      unitPrice: number;
      receivedQty: number;
    }
  >;
  total: number;
  status: "Draft" | "Menunggu Persetujuan" | "Dipesan" | "Diterima Sebagian" | "Diterima";
};

export type Invoice = {
  id: string;
  number: string;
  type: "Piutang" | "Utang";
  party: string;
  customerId?: string;
  supplierId?: string;
  source: string;
  issueDate: string;
  dueDate: string;
  total: number;
  paid: number;
  status: "Belum Bayar" | "Dibayar Sebagian" | "Lunas" | "Jatuh Tempo";
};

export type Expense = {
  id: string;
  number: string;
  department: string;
  category: string;
  payee: string;
  amount: number;
  date: string;
  status: "Draft" | "Menunggu Persetujuan" | "Disetujui" | "Dibayar";
};

export type Employee = {
  id: string;
  number: string;
  name: string;
  department: string;
  jobTitle: string;
  employmentType: "Tetap" | "Kontrak" | "Harian";
  basePay: number;
  attendanceStatus: "Hadir" | "Terlambat" | "Izin" | "Cuti" | "Tidak Hadir";
  overtimeHours: number;
  contractEnd?: string;
};

export type Payroll = {
  id: string;
  period: string;
  employeeId: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: "Draft" | "Menunggu Persetujuan" | "Disetujui" | "Dibayar";
};

export type Approval = {
  id: string;
  type: "Pembelian" | "Biaya" | "Diskon" | "Koreksi Stok" | "Kredit" | "Payroll";
  reference: string;
  title: string;
  requester: string;
  context: string;
  amount: number;
  requestedAt: string;
  reason: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "critical" | "success";
  module: string;
  createdAt: string;
  read: boolean;
};

export type AuditLog = {
  id: string;
  entityType: "Pelanggan" | "Supplier" | "Barang/Bahan" | "Barang Jadi";
  recordId: string;
  recordLabel: string;
  action: "Dibuat" | "Diubah";
  changes: string[];
  actorId: string;
  actorName: string;
  createdAt: string;
};
