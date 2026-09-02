import type {
  DeliveryStatus,
  Expense,
  GoodsReceiptStatus,
  MaterialPurchaseRequestStatus,
  Payroll,
  ProductionStatus,
  PurchaseOrder,
  SalesReturnStatus,
  SaleStatus,
  StockCountStatus,
} from "@/lib/types";

type TransitionMap<T extends string> = Record<T, readonly T[]>;

export const saleOrderTransitions: TransitionMap<SaleStatus> = {
  "Menunggu Produksi": ["Siap Dipenuhi"],
  "Siap Dipenuhi": ["Dalam Pengiriman", "Selesai"],
  "Dalam Pengiriman": ["Selesai", "Bermasalah"],
  Selesai: ["Retur Sebagian", "Diretur"],
  Bermasalah: ["Selesai", "Siap Dipenuhi", "Retur Sebagian", "Diretur"],
  "Retur Sebagian": ["Retur Sebagian", "Diretur"],
  Diretur: [],
};

export const deliveryTransitions: TransitionMap<DeliveryStatus> = {
  "Belum Disiapkan": ["Siap Dikirim"],
  "Siap Dikirim": ["Dikirim", "Diterima"],
  Dikirim: ["Diterima", "Bermasalah"],
  Diterima: [],
  Bermasalah: ["Diterima", "Siap Dikirim"],
};

export const salesReturnTransitions: TransitionMap<SalesReturnStatus> = {
  "Menunggu Refund": ["Selesai"],
  Selesai: [],
};

export const purchaseRequestTransitions: TransitionMap<MaterialPurchaseRequestStatus> = {
  Baru: ["Diproses", "Ditolak"],
  Diproses: ["PO Dibuat", "Ditolak"],
  "PO Dibuat": ["Selesai"],
  Selesai: [],
  Ditolak: ["Diproses"],
};

export const purchaseOrderTransitions: TransitionMap<PurchaseOrder["status"]> = {
  Draft: ["Dipesan"],
  Dipesan: ["Diterima Sebagian", "Diterima"],
  "Diterima Sebagian": ["Diterima Sebagian", "Diterima"],
  Diterima: ["Ditutup"],
  Ditutup: [],
};

export const goodsReceiptTransitions: TransitionMap<GoodsReceiptStatus> = {
  "Diterima Fisik": ["Selesai"],
  Selesai: [],
};

export const productionTransitions: TransitionMap<ProductionStatus> = {
  "Menunggu Gudang": ["Ditunda Gudang", "Kekurangan Bahan", "Disetujui Gudang", "Permintaan Kedaluwarsa"],
  "Ditunda Gudang": ["Ditunda Gudang", "Kekurangan Bahan", "Disetujui Gudang", "Permintaan Kedaluwarsa"],
  "Kekurangan Bahan": ["Menunggu Pembelian", "Disetujui Gudang"],
  "Menunggu Pembelian": ["Kekurangan Bahan", "Disetujui Gudang"],
  "Disetujui Gudang": ["Bahan Dikonfirmasi"],
  "Bahan Dikonfirmasi": ["Berjalan"],
  "Permintaan Kedaluwarsa": ["Menunggu Gudang"],
  Berjalan: ["Selesai"],
  Selesai: [],
};

export const expenseTransitions: TransitionMap<Expense["status"]> = {
  Draft: ["Disetujui"],
  Disetujui: ["Dibayar"],
  Dibayar: [],
};

export const payrollTransitions: TransitionMap<Payroll["status"]> = {
  Draft: ["Disetujui"],
  Disetujui: ["Dibayar"],
  Dibayar: ["Dikunci"],
  Dikunci: [],
};

export const stockCountTransitions: TransitionMap<StockCountStatus> = {
  Draft: ["Sedang Dihitung"],
  "Sedang Dihitung": ["Siap Diposting"],
  "Siap Diposting": ["Diposting"],
  Diposting: [],
};

export const assertWorkflowTransition = <T extends string>(
  workflow: string,
  transitions: TransitionMap<T>,
  from: T,
  to: T,
) => {
  if (from === to && transitions[from].includes(to)) return;
  if (!transitions[from].includes(to)) {
    throw new Error(`Transisi ${workflow} dari ${from} ke ${to} tidak diizinkan.`);
  }
};
