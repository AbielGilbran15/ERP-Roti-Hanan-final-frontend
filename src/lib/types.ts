export type Role =
  | "Owner"
  | "Admin Penjualan/Sales"
  | "Staff Gudang"
  | "Staff Produksi"
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

export type SupplierQuotationDraft = {
  referenceNumber: string;
  supplierId: string;
  productId: string;
  unitPrice: number;
  minimumOrderQuantity: number;
  leadTimeDays: number;
  quotedAt: string;
  validUntil?: string;
  notes: string;
};

export type SupplierQuotation = SupplierQuotationDraft & {
  id: string;
  supplierNameSnapshot: string;
  productNameSnapshot: string;
  purchaseUnitSnapshot: string;
  paymentTermsDaysSnapshot: number;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
};

export type MaterialType = "Bahan Baku" | "Bahan Baku Toping" | "Kemasan";
export type ProductType = MaterialType | "Produk Jadi";

export type FinishedProductCategory = {
  id: string;
  code: string;
  name: string;
  requiresType: boolean;
  requiresVariant: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type FinishedProductTypeDefinition = {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type FinishedProductVariant = {
  id: string;
  typeId: string;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  finishedProductCategoryId?: string;
  finishedProductTypeId?: string;
  finishedProductVariantId?: string;
  purchaseUnit?: string;
  purchaseContentValue?: number;
  purchaseContentUnit?: string;
  stockUnit: string;
  /** Nilai akhir satu satuan beli dalam satuan stok; dihitung otomatis. */
  conversionValue: number;
  purchasePrice: number;
  salesUnit?: string;
  contentQuantity?: number;
  contentUnit?: string;
  packagingDescription?: string;
  weightValue?: number;
  weightUnit?: string;
  agent1Price: number;
  agent2Price: number;
  cost: number;
  shelfLifeDays: number;
  /** Nilai input stok minimum dalam satuan isi. */
  minStockInputValue?: number;
  minStockInputUnit?: string;
  /** Nilai stok minimum yang sudah dikonversi dan disimpan dalam satuan stok. */
  minStock: number;
  notes: string;
  isActive: boolean;
};

export type StockStatus =
  | "Tersedia"
  | "Staging Produksi"
  | "Rusak"
  | "Dalam Pengiriman";

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

export type StockMovementType =
  | "Penerimaan"
  | "Reservasi"
  | "Pelepasan Reservasi"
  | "Pengeluaran Produksi"
  | "Konsumsi Produksi"
  | "Output Produksi"
  | "Waste Produksi"
  | "Penjualan"
  | "Pengiriman"
  | "Kerusakan Pengiriman"
  | "Retur Penjualan"
  | "Koreksi Stok";

export type StockMovement = {
  id: string;
  type: StockMovementType;
  productId: string;
  lot: string;
  quantity: number;
  unit: string;
  fromWarehouse?: string;
  toWarehouse?: string;
  reference: string;
  actorId: string;
  createdAt: string;
  notes?: string;
};

export type CartLine = {
  productId: string;
  quantity: number;
};

export type SaleLine = CartLine & {
  unitPrice: number;
};

export type SaleStockAllocation = {
  id: string;
  productId: string;
  stockId: string;
  lot: string;
  quantity: number;
  productionOrderId?: string;
  allocatedAt: string;
};

export type PaymentMethod = "Tunai" | "QRIS" | "Transfer" | "Cicilan" | "Kredit/Tempo";
export type OrderSource = "POS" | "WhatsApp" | "Telepon" | "Datang Langsung";
export type FulfillmentMethod = "Diambil" | "Dikirim";
export type DeliveryStatus = "Belum Disiapkan" | "Siap Dikirim" | "Dikirim" | "Diterima" | "Bermasalah";
export type DeliveryIssueType = "Selisih" | "Rusak" | "Retur";
export type DeliveryResolution = "Diterima dengan Catatan" | "Kirim Pengganti" | "Retur";
export type SaleStatus =
  | "Menunggu Produksi"
  | "Siap Dipenuhi"
  | "Dalam Pengiriman"
  | "Selesai"
  | "Bermasalah"
  | "Retur Sebagian"
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
  /** Reservasi stok per lot untuk pesanan ini. */
  stockAllocations?: SaleStockAllocation[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  orderSource: OrderSource;
  fulfillmentMethod: FulfillmentMethod;
  status: SaleStatus;
  deliveryStatus?: DeliveryStatus;
  paymentTermsDaysSnapshot?: number;
  creditLimitSnapshot?: number;
  dueDate?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  deliveryProof?: string;
  deliveryAttachments?: DeliveryAttachment[];
  deliveryIssue?: string;
  deliveryIssueType?: DeliveryIssueType;
  deliveryResolution?: DeliveryResolution;
  deliveryResolutionNote?: string;
  deliveryResolvedBy?: string;
  deliveryResolvedAt?: string;
  salesReturnId?: string;
};

export type SalesReturnCondition = "Layak Jual" | "Rusak";
export type SalesReturnStatus = "Menunggu Refund" | "Selesai";

export type SalesReturn = {
  id: string;
  number: string;
  saleId: string;
  saleNumber: string;
  customerId: string;
  createdBy: string;
  createdAt: string;
  reason: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    condition: SalesReturnCondition;
    stockItemId: string;
  }>;
  returnValue: number;
  refundAmount: number;
  status: SalesReturnStatus;
  receivedAt: string;
  refundAccountId?: string;
  refundTransactionId?: string;
  refundedBy?: string;
  refundedAt?: string;
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

export type ProductionMaterialAllocation = {
  id: string;
  stockId: string;
  lot: string;
  warehouse: string;
  /** Jumlah yang disiapkan Gudang saat menyetujui permintaan; belum mengurangi stok. */
  approvedQty: number;
  issuedQty: number;
  usedQty: number;
};

export type ProductionMaterialRequirement = {
  id: string;
  materialProductId: string;
  role: MaterialType;
  /** Jumlah yang diminta manual oleh Staff Produksi dalam satuan stok barang. */
  requestedQty: number;
  shortageQty: number;
  allocations: ProductionMaterialAllocation[];
};

export type ProductionOutput = {
  id: string;
  productId: string;
  goodQty: number;
  failedQty: number;
  failureReason?: string;
  stockItemId?: string;
};

export type ProductionStatus =
  | "Menunggu Gudang"
  | "Ditunda Gudang"
  | "Kekurangan Bahan"
  | "Menunggu Pembelian"
  | "Disetujui Gudang"
  | "Bahan Dikonfirmasi"
  | "Permintaan Kedaluwarsa"
  | "Berjalan"
  | "Selesai";

export type ProductionOrder = {
  id: string;
  batchNumber: string;
  materials: ProductionMaterialRequirement[];
  outputs: ProductionOutput[];
  materialRequestNumber?: string;
  materialRequestedAt?: string;
  materialRequestExpiresAt?: string;
  materialRequestDeferredUntil?: string;
  materialRequestNote?: string;
  warehouseConfirmedBy?: string;
  warehouseConfirmedAt?: string;
  materialsConfirmedBy?: string;
  materialsConfirmedAt?: string;
  purchaseRequestId?: string;
  resultNotes?: string;
  reportedBy?: string;
  reportedAt?: string;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  machine: string;
  team: string;
  status: ProductionStatus;
  priority: "Normal" | "Tinggi" | "Mendesak";
};

export type ProductionResultDraft = {
  outputs: Array<{
    productId: string;
    goodQty: number;
    failedQty: number;
    failureReason: string;
  }>;
  notes: string;
};

export type MaterialPurchaseRequestStatus = "Baru" | "Diproses" | "PO Dibuat" | "Selesai" | "Ditolak";

export type MaterialPurchaseRequest = {
  id: string;
  number: string;
  productionOrderId: string;
  productionBatchNumber: string;
  requestedBy: string;
  requestedAt: string;
  neededAt: string;
  priority: ProductionOrder["priority"];
  reason: string;
  status: MaterialPurchaseRequestStatus;
  purchaseOrderId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unit: string;
  }>;
};

export type PurchaseOrder = {
  id: string;
  number: string;
  supplierId: string;
  supplierNameSnapshot: string;
  createdAt: string;
  expectedAt: string;
  paymentTermsDaysSnapshot: number;
  sourcePurchaseRequestId?: string;
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
  status: "Draft" | "Dipesan" | "Diterima Sebagian" | "Diterima" | "Ditutup";
};

export type GoodsReceiptStatus = "Diterima Fisik" | "Selesai";

export type GoodsReceipt = {
  id: string;
  number: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  receivedBy: string;
  receivedAt: string;
  status: GoodsReceiptStatus;
  items: Array<{
    id: string;
    purchaseOrderItemIndex: number;
    productId: string;
    receivedQty: number;
    purchaseUnit: string;
    stockQuantity: number;
    stockUnit: string;
    lot: string;
    expiryDate?: string;
    stockItemId: string;
  }>;
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

export type CashAccount = {
  id: string;
  name: string;
  kind: "Kas" | "Bank";
  balance: number;
  updatedAt: string;
};

export type CashTransaction = {
  id: string;
  number: string;
  accountId: string;
  direction: "Masuk" | "Keluar";
  amount: number;
  description: string;
  source: string;
  date: string;
  status?: "Aktif" | "Dibalik";
  createdBy?: string;
  reversedByTransactionId?: string;
  reversesTransactionId?: string;
  reversalReason?: string;
};

export type CostOfGoodsSold = {
  id: string;
  number: string;
  date: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitCost: number;
  description?: string;
  amount: number;
  source?: "Otomatis Penjualan" | "Otomatis Retur" | "Koreksi Manual";
  saleId?: string;
  reference?: string;
};

export type Expense = {
  id: string;
  number: string;
  department: string;
  category: string;
  payee: string;
  amount: number;
  date: string;
  status: "Draft" | "Disetujui" | "Dibayar";
  requestedBy?: string;
  paidFromAccountId?: string;
  paidAt?: string;
  paidBy?: string;
  paymentTransactionId?: string;
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
  status: "Draft" | "Disetujui" | "Dibayar" | "Dikunci";
  paymentTransactionId?: string;
  paidFromAccountId?: string;
  paidBy?: string;
  paidAt?: string;
  payslipNumber?: string;
  lockedBy?: string;
  lockedAt?: string;
};

export type StockCountStatus = "Draft" | "Sedang Dihitung" | "Siap Diposting" | "Diposting";

export type StockCountLine = {
  id: string;
  stockId: string;
  productId: string;
  warehouse: string;
  lot: string;
  systemQty: number;
  countedQty?: number;
  varianceQty: number;
  reason?: string;
};

export type StockCount = {
  id: string;
  number: string;
  warehouse: string;
  createdBy: string;
  createdAt: string;
  status: StockCountStatus;
  lines: StockCountLine[];
  submittedAt?: string;
  postedBy?: string;
  postedAt?: string;
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

export type SalesTarget = {
  id: string;
  effectiveFrom: string;
  effectiveUntil: string;
  agent1DailyTarget: number;
  agent2DailyTarget: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  entityType: "Pelanggan" | "Supplier" | "Barang/Bahan" | "Barang Jadi" | "Klasifikasi Barang Jadi" | "Purchase Order" | "Biaya" | "Stok Opname" | "Target Penjualan" | "Retur Penjualan" | "Pengiriman" | "Payroll" | "Mutasi Kas" | "Produksi";
  recordId: string;
  recordLabel: string;
  action: "Dibuat" | "Diubah";
  changes: string[];
  actorId: string;
  actorName: string;
  createdAt: string;
};
