# Form Perencanaan End-to-End Implementasi

Dokumen ini dipakai saat kick-off dengan client agar penyelarasan software cepat, terstruktur, dan minim revisi ulang.

Cara isi cepat:
- Pilih opsi pada setiap pertanyaan.
- Isi kolom catatan hanya jika ada pengecualian.
- Tandai prioritas `MVP` atau `Phase 2`.

## A. Profil Operasional

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Jenis bisnis utama | Restoran / Cafe / Retail / Jasa / Lainnya |  |  |
| Jumlah outlet saat ini | 1 / 2-5 / >5 |  |  |
| Metode operasional | Single gudang / Multi gudang / Per outlet stock |  |  |
| Target Go-Live | <30 hari / 1-2 bulan / >2 bulan |  |  |

## B. Master Data dan Persediaan Barang Dagang

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Produk disimpan sebagai | Barang jual jadi / Bahan baku + barang jadi / Keduanya |  |  |
| Unit barang | Tanpa konversi / Dengan konversi (cth KG->GR) |  |  |
| Kontrol stok negatif | Dilarang / Boleh dengan warning |  |  |
| Penilaian biaya stok | Average Cost / FIFO (jika tersedia) |  |  |
| Reorder point | Tidak perlu / Per produk / Per gudang+produk |  |  |
| Multi harga jual | Tidak / Ya (eceran, grosir, dine-in, online) |  |  |

## C. Behavior POS (Penjualan)

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Saat transaksi POS sukses | Kurangi stok barang jual / Kurangi bahan via BOM / Hybrid |  |  |
| Metode pembayaran POS | Cash / Bank Transfer / QRIS / E-wallet / Campuran |  |  |
| Split bill | Tidak / Ya |  |  |
| Hold order | Tidak / Ya |  |  |
| Void transaksi | Supervisor only / Kasir+Supervisor |  |  |
| Sinkron stok real-time | Wajib / Boleh delay end-of-day |  |  |

## D. Pencatatan Dapur dan Produksi

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Pemakaian bahan | Otomatis dari BOM saat jual / Manual issue harian / Hybrid |  |  |
| BOM per menu | Tidak perlu / Wajib untuk menu utama / Wajib semua menu |  |  |
| Toleransi waste | Tidak dicatat / Dicatat per shift / Dicatat per item |  |  |
| Produksi batch (prep) | Tidak / Ya (contoh bumbu dasar, saus) |  |  |
| Approval perubahan BOM | Tidak / Head Chef / Owner |  |  |

## E. Pembelian dan Penerimaan

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Alur pembelian utama | Quick Purchase / PO -> Receive -> Invoice / Campuran |  |  |
| Pembelian harian | Cash daily / Hutang bulanan / Campuran |  |  |
| Wajib receive sebelum invoice | Ya / Tidak |  |  |
| Partial receive | Tidak / Ya |  |  |
| Retur pembelian | Tidak / Ya |  |  |

## F. Akuntansi dan Jurnal

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Posting jurnal | Otomatis realtime / Approval lalu post / End-of-day batch |  |  |
| Kebutuhan costing | Dasar / Menengah / Detail (per menu/per shift) |  |  |
| Pajak transaksi | Non-PKP / PPN / Custom |  |  |
| Tutup buku periodik | Bulanan / Mingguan / Tidak fixed |  |  |
| Akun default per modul | Ikuti standar seed / Custom chart of accounts |  |  |

## G. Kontrol, Approval, dan Akses

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Struktur approval | Tanpa approval / 1 level / 2 level+ |  |  |
| Akses role | Standard (Admin/Manager/Cashier) / Custom role |  |  |
| Batas diskon POS | Tidak ada / Per kasir / Per role |  |  |
| Audit trail | Basic / Detail per field |  |  |

## H. Laporan dan KPI

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| KPI utama | Sales / Margin / COGS / Waste / Cashflow |  |  |
| Frekuensi laporan | Harian / Mingguan / Bulanan |  |  |
| Format ekspor | PDF / Excel / Keduanya |  |  |
| Dashboard manajemen | Ringkas / Lengkap |  |  |

## I. Migrasi Data dan Integrasi

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Sumber data lama | Excel / POS lain / ERP lain / Tidak ada |  |  |
| Scope migrasi awal | Master only / Master+saldo / Full history |  |  |
| Integrasi eksternal | Tidak ada / Payment / E-commerce / Lainnya |  |  |
| Kebutuhan API | Tidak / Ya (read-only) / Ya (read-write) |  |  |

## J. Prioritas Implementasi

| Area | Prioritas | Catatan Client |
|---|---|---|
| POS + Pembayaran | MVP / Phase 2 |  |
| Inventory + Gudang | MVP / Phase 2 |  |
| Dapur + BOM + Waste | MVP / Phase 2 |  |
| Purchase + Supplier | MVP / Phase 2 |  |
| Accounting + Laporan | MVP / Phase 2 |  |
| HR/Payroll | MVP / Phase 2 |  |

## K. Catatan Khusus dan Risiko

- Constraint operasional (jam sibuk, internet, perangkat):
- Policy internal (approval, limit diskon, tutup kasir):
- Risiko terbesar menurut client:
- Keputusan yang harus final sebelum development:

## L. Ringkasan Keputusan (Diisi Tim Implementasi)

- Behavior POS final:
- Behavior persediaan final:
- Behavior dapur/BOM final:
- Alur pembelian final:
- Alur posting jurnal final:
- Scope MVP final:
- Scope Phase 2 final:
