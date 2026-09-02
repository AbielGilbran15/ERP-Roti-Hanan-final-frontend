export type StatusKind = "positive" | "warning" | "danger" | "neutral";

const positive = ["Selesai", "Siap Dipenuhi", "Siap dipakai", "Diterima", "Lunas", "Disetujui", "Dibayar", "Dikunci", "Diposting", "Tersedia", "Hadir", "Buka", "Aktif", "Aman", "Direkomendasikan", "Bahan Dikonfirmasi", "Output Produksi", "Siap Diposting"];
const warning = ["Menunggu", "Dalam Pengiriman", "Dipesan", "Sebagian", "Belum Bayar", "Pre-order", "Dalam Perjalanan", "Terlambat", "Cuti", "Picking", "Siap Kirim", "Berjalan", "Ditunda Gudang", "Disetujui Gudang", "Staging Produksi", "Diserahkan ke Produksi", "Di bawah stok minimum", "Pengeluaran Produksi", "Tinggi", "Diproses", "PO Dibuat"];
const danger = ["Bermasalah", "Kekurangan Bahan", "Tidak mencukupi", "Permintaan Kedaluwarsa", "Waste Produksi", "Jatuh Tempo", "Tidak Hadir", "Gagal", "Nonaktif", "Kritis", "Mendesak", "Perlu Tindakan", "Dibalik", "Rusak"];

export function getStatusKind(status: string): StatusKind {
  if (danger.some((item) => status.includes(item))) return "danger";
  if (warning.some((item) => status.includes(item))) return "warning";
  if (positive.some((item) => status.includes(item))) return "positive";
  return "neutral";
}
