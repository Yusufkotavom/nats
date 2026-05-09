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
| Data barang yang dipakai harian | Hanya menu jadi / Hanya bahan baku / Keduanya |  |  |
| Cara hitung satuan barang | Satuan sederhana (pcs, porsi) / Campuran (kg-gram, liter-ml) |  |  |
| Jika stok habis saat jual | Harus ditolak / Boleh lanjut dengan peringatan |  |  |
| Titik stok minimum | Tidak pakai batas minimum / Pakai batas minimum per barang |  |  |
| Harga jual | Satu harga / Beda harga per channel (dine-in, takeaway, online) |  |  |
| Barang yang sering kosong | Jarang / Kadang / Sering |  |  |
| Frekuensi stock opname | Harian / Mingguan / Bulanan / Tidak terjadwal |  |  |

## C. Behavior POS (Penjualan)

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Jenis layanan utama | Dine-in / Takeaway / Delivery / Campuran |  |  |
| Pemesanan berdasarkan | Tanpa meja / Meja restoran / Kamar-lokasi / Campuran |  |  |
| Proses meja/lokasi | Tidak perlu buka-tutup / Perlu status buka-tutup meja |  |  |
| Metode pembayaran yang dipakai | Cash / Transfer / QRIS / E-wallet / Kartu / Campuran |  |  |
| Pembayaran gabungan (split bill) | Tidak perlu / Kadang perlu / Sering perlu |  |  |
| Menahan pesanan sementara (hold) | Tidak perlu / Perlu |  |  |
| Pembatalan item/transaksi | Bebas kasir / Harus supervisor / Harus manager |  |  |
| Kecepatan update stok setelah transaksi | Langsung saat transaksi / Boleh di akhir shift |  |  |

## D. Pencatatan Dapur dan Produksi

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Pengurangan bahan saat menu terjual | Otomatis / Manual / Campuran |  |  |
| Kebutuhan resep standar per menu | Tidak perlu / Per menu utama / Semua menu |  |  |
| Pencatatan bahan terbuang/rusak | Tidak dicatat / Dicatat per shift / Dicatat per item |  |  |
| Persiapan batch (prep) harian | Tidak ada / Ada untuk item tertentu / Ada untuk banyak item |  |  |
| Perubahan resep/harga pokok | Siapa saja / Head Chef / Owner |  |  |
| Estimasi kebutuhan dapur | Manual / Ingin dibantu sistem |  |  |

## E. Pembelian dan Penerimaan

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Cara belanja paling sering | Belanja cepat harian / PO formal / Campuran |  |  |
| Pola pembayaran supplier | Tunai langsung / Tempo bulanan / Campuran |  |  |
| Barang datang tidak sesuai | Langsung ditolak / Tetap diterima sebagian / Tergantung supplier |  |  |
| Retur ke supplier | Jarang / Kadang / Sering |  |  |
| Approval pembelian | Tidak perlu / Perlu untuk nominal tertentu / Selalu perlu |  |  |
| Bukti pembelian | Kertas / Digital / Campuran |  |  |

## F. Akuntansi dan Jurnal

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Pencatatan transaksi ke laporan keuangan | Otomatis langsung / Dicek dulu lalu disahkan / Rekap akhir hari |  |  |
| Detail laporan biaya yang diinginkan | Ringkas / Menengah / Sangat detail (per menu/per shift) |  |  |
| Pengaturan pajak | Tidak pakai pajak / Pajak standar / Pajak khusus |  |  |
| Penutupan laporan | Harian / Mingguan / Bulanan |  |  |
| Struktur akun | Pakai default sistem / Disesuaikan dengan bisnis |  |  |
| Siapa yang review laporan | Owner / Admin keuangan / Manager outlet |  |  |

## G. Kontrol, Approval, dan Akses

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Level persetujuan | Tidak perlu approval / 1 level / 2 level atau lebih |  |  |
| Pengaturan hak akses user | Standar / Per jabatan detail / Per orang |  |  |
| Batas diskon di kasir | Tidak dibatasi / Dibatasi per kasir / Dibatasi per jabatan |  |  |
| Riwayat perubahan data | Dasar / Lengkap per perubahan |  |  |
| Kebutuhan PIN supervisor di kasir | Tidak perlu / Per aksi tertentu / Wajib |  |  |

## H. Laporan dan KPI

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Laporan paling penting | Penjualan / Laba kotor / Biaya bahan / Waste / Arus kas |  |  |
| Kapan laporan dibutuhkan | Real-time / Akhir shift / Harian / Mingguan / Bulanan |  |  |
| Format laporan yang disukai | Di layar saja / PDF / Excel / Keduanya |  |  |
| Tingkat detail dashboard | Ringkas untuk owner / Detail untuk operasional |  |  |
| Laporan per outlet | Tidak perlu / Perlu |  |  |

## I. Migrasi Data dan Integrasi

| Pertanyaan | Opsi Cepat | Pilihan | Catatan Client |
|---|---|---|---|
| Data lama berasal dari | Excel / Aplikasi POS lama / Sistem lain / Tidak ada |  |  |
| Data yang mau dipindahkan di awal | Data master saja / Master + saldo awal / Full histori |  |  |
| Integrasi yang dibutuhkan | Tidak ada / Payment / Marketplace / Delivery app / Lainnya |  |  |
| Kebutuhan sinkron data ke sistem lain | Tidak perlu / Perlu lihat data / Perlu kirim dan terima data |  |  |
| Siapa pemilik data final | Tetap di sistem lama / Pindah ke sistem baru / Campuran sementara |  |  |

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
