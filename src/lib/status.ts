export type StatusKind = "positive" | "warning" | "danger" | "neutral";

const positive = ["Selesai", "Siap Dipenuhi", "Lulus", "Diterima", "Lunas", "Disetujui", "Dibayar", "Tersedia", "Hadir", "Buka", "Aktif", "Aman", "Direkomendasikan"];
const warning = ["Menunggu", "Dalam Pengiriman", "Dijadwalkan", "Dipesan", "Sebagian", "Belum Bayar", "Pre-order", "Karantina", "Dalam Perjalanan", "Terlambat", "Cuti", "Diajukan", "Picking", "Siap Kirim", "Berjalan", "Tinggi", "Perlu dicek"];
const danger = ["Bermasalah", "Ditolak", "Ditahan", "Jatuh Tempo", "Tidak Hadir", "Gagal", "Nonaktif", "Kritis", "Mendesak", "Perlu Tindakan"];

export function getStatusKind(status: string): StatusKind {
  if (danger.some((item) => status.includes(item))) return "danger";
  if (warning.some((item) => status.includes(item))) return "warning";
  if (positive.some((item) => status.includes(item))) return "positive";
  return "neutral";
}
