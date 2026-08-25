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
| Kasir | `kasir.dago` |
| Staff Gudang | `gudang.pusat` |
| Staff Produksi | `produksi.pusat` |
| QC Inspector | `qc.pusat` |
| Staff Purchasing | `purchasing.pusat` |
| Admin HR/Finance | `siti.finance` |

Login juga menerima Gmail yang tercantum di data dummy.

## Cakupan frontend

- Penjualan, POS, pre-order, pembayaran, shift kasir, dan riwayat
- Inventori per lot, FEFO, permintaan cabang, transfer, dan stok opname
- Produksi per batch, resep, waste, QC, hold, dan ketertelusuran
- Purchasing, saran kebutuhan, perbandingan supplier, PO, dan penerimaan
- Keuangan, kas, utang-piutang, biaya, jurnal, dan arus kas
- HR, karyawan, absensi, lembur, kontrak, pelatihan, dan payroll
- Dashboard analitik dan temuan untuk pengambilan keputusan
- Persetujuan Owner lintas modul
- Manajemen pengguna, role, lokasi, dan status akun
- Tema terang/gelap serta layout mobile dan desktop

Gunakan menu **Reset data demo** pada akun pengguna untuk mengembalikan seluruh data ke kondisi awal.
