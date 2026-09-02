# ERP Roti Hanan Frontend

Frontend demo end-to-end untuk operasional Pabrik Roti Hanan Bandung dan cabangnya. Aplikasi menggunakan data dummy yang tersimpan di `localStorage`. Belum ada koneksi backend atau InsForge.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan oleh Next.js. Untuk pemeriksaan produksi:

```bash
npm test
npm run typecheck
npm run build
```

## Akun demo

Semua akun menggunakan password `hanan123`.

| Role | Username |
| --- | --- |
| Owner | `asep` |
| Admin Penjualan/Sales | `sales.pusat` |
| Staff Gudang | `gudang.pusat` |
| Staff Produksi | `produksi.pusat` |
| Staff Produksi tambahan | `produksi.fikri` |
| Staff Purchasing | `purchasing.pusat` |
| Admin HR/Finance | `siti.finance` |

Login juga menerima Gmail yang tercantum di data dummy.

## Cakupan frontend

- Penjualan, POS, pre-order, pembayaran, shift kasir, dan riwayat
- Inventori terpisah antara Gudang Bahan dan Gudang Produk Jadi, per lot, FEFO, transfer, dan stok opname
- Reservasi stok untuk pesanan agen serta validasi penjualan langsung agar stok tidak pernah minus
- Produksi per batch dengan permintaan bahan manual, hasil multi-SKU, hasil berhasil, waste, dan ketertelusuran pesanan–batch
- Purchasing, saran kebutuhan bahan, perbandingan supplier, PO langsung, dan penerimaan ke Gudang Bahan
- Keuangan, kas, utang-piutang, biaya, jurnal, dan arus kas
- HR, karyawan, absensi, lembur, kontrak, pelatihan, dan payroll
- Dashboard dan analitik harian, mingguan, bulanan, tahunan, serta rentang tanggal khusus
- Manajemen pengguna, role, lokasi, dan status akun
- Tema terang/gelap serta layout mobile dan desktop

Gunakan menu **Reset data demo** pada akun pengguna untuk mengembalikan seluruh data ke kondisi awal.
