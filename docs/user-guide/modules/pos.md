---
title: Modul POS
module: pos
order: 110
updatedAt: 2026-06-06
summary: Operasional POS terpadu untuk restoran dengan checkout instan dan mode pre-order dalam satu halaman.
related: 03-operasional-harian,modules/inventory,modules/production,modules/sales,modules/purchase,modules/accounting
---

# Modul POS

## Tujuan
Menjalankan transaksi kasir restoran secara cepat, akurat, dan sinkron ke sales, pembayaran, stok, serta alur dapur — semuanya dari satu halaman POS terpadu.

## Prasyarat
- User punya `pos.access`
- Warehouse tersedia
- Stok bahan/produk cukup
- Cash/Bank account untuk pembayaran sudah diset

## Struktur Halaman POS (Unified)
Satu halaman `/pos` menampung seluruh alur restoran lewat 4 tab:

| Tab | URL shortcut | Fungsi |
| --- | --- | --- |
| **Meja** | `/pos?tab=floor` | Pilih/buka/tutup meja. Klik **Ambil Order** untuk lompat ke tab Kasir dengan meja terpilih. |
| **Kasir** | `/pos?tab=cashier` | Product grid + cart. Untuk dine-in: kirim ke dapur dan print tiket. Untuk retail: checkout langsung. |
| **Dapur** | `/pos?tab=kitchen` | Antrian kitchen ticket per station. Status item: `NEW -> COOKING -> READY -> SERVED`. |
| **Billing** | `/pos?tab=billing` | Generate bill, terima pembayaran (cash/card/QRIS), tutup meja setelah lunas. |

Meja yang sedang aktif ditandai dengan chip di header shell POS (bukan dropdown), dan dipakai lintas tab.

## Toggle Fitur Restoran
Admin bisa menyembunyikan semua fungsi restoran dari POS lewat:

- `Admin > Settings > POS`
- switch: **Aktifkan Fitur Restoran di POS**

Jika dimatikan:

- tab `Meja`, `Dapur`, `Billing` hilang (hanya `Kasir`),
- aksi `Kitchen` dan catatan dapur di cart hilang,
- menu `POS > Dining Spots` disembunyikan,
- route restoran legacy otomatis diarahkan ke tab kasir.

## Mode Checkout Kasir: Bayar Sekarang vs Pre-Order
Di dialog **Checkout** tab Kasir, tersedia mode:

- **Bayar Sekarang**: flow POS reguler, transaksi langsung membuat payment.
- **Pre-Order (Invoice Only)**: membuat `SalesOrder + SalesInvoice (ISSUED)` tanpa pembayaran langsung; pelunasan dilakukan belakangan.

Catatan:
- Opsi **Pre-Order** hanya muncul di checkout tab **Kasir**. Dialog pembayaran lain di POS tetap payment-only.
- Modul `/services/*` sudah deprecated permanen dan tidak lagi dipakai untuk operasional aktif.
- Kebutuhan pre-order bertahap diarahkan ke mode checkout POS ini.

### Aktivasi Produk Service
1. Buka `Inventory > Products`.
2. Buat/edit produk.
3. Aktifkan switch **Service Item**.
4. Simpan produk.

Produk service dapat dijual walau stok produk service nol.

## PWA dan Cache Lokal POS

- App bisa di-install sebagai PWA dari browser mobile/desktop.
- Saat online, POS menyimpan master data yang sudah pernah dimuat ke cache lokal: produk, customer picker, dan payment method.
- Saat koneksi gagal, POS mencoba memakai cache lokal sebagai fallback untuk pencarian produk/customer dan pilihan payment method.
- Transaksi posted tetap harus sinkron ke server; cache lokal fase ini hanya mempercepat read/master data dan belum menjadi offline write penuh.

## Komponen Utama POS
- **POS Session**: sesi kasir per shift.
- **Product Grid**: daftar item jual + pencarian + filter kategori (tab Kasir).
- **Cart**: item order aktif (tab Kasir).
- **Held Order**: order yang ditahan sementara.
- **Dining Spot (Meja/Lokasi)**: konteks order restoran — dipilih dari tab Meja.
- **Kitchen Ticket Print Dialog**: dialog print-friendly yang muncul setelah "Kirim ke Dapur".

## Kontrol Produk Tampil di POS
- Produk harus `Active`.
- Produk harus ditandai `Show In POS` pada form master produk.
- Jika `Show In POS` nonaktif, produk tidak akan muncul di Product Grid POS.
- Admin bisa override lewat pengaturan global:
  - `Admin > Settings > POS Settings > POS Product Visibility Mode`
  - `POS products only`: mengikuti `showInPos`.
  - `All active products`: semua produk aktif tampil di POS.

## Pengaturan Biaya POS Terpusat
- Semua setting POS dipusatkan di `Admin > Settings > POS`.
- Fee multi-line (Tax/Fee, Percentage/Fixed) dipakai otomatis di cart POS, billing dine-in, dan ikut ke total invoice POS.

## Alur Harian POS Restoran
1. **Buka POS Session** (pilih warehouse dan opening cash).
2. **Tab Meja**: pilih meja, klik **Buka**, lalu klik **Ambil Order** — tab otomatis pindah ke Kasir dengan meja aktif.
3. **Tab Kasir**: tambahkan item ke cart, klik **Kitchen** untuk kirim order ke dapur. Dialog **Cetak Tiket Dapur** otomatis muncul — klik **Print** untuk fisik, atau **Tutup** untuk lanjut tanpa cetak. Cart dikosongkan setelah dialog ditutup.
4. **Tab Dapur**: staf dapur memproses ticket (`COOKING -> READY -> SERVED`). Saat semua item SERVED, order otomatis pindah ke status `BILLING` dan status meja ikut berubah.
5. **Tab Billing**: klik **Generate Bill** untuk issue invoice, lalu **Bayar Cash / QRIS** untuk settlement. Setelah lunas, **Tutup Meja**.
6. **Akhir shift**: tutup POS session, cek **Cash in Server** (hasil hitung sistem) sebagai pembanding, lalu input **Actual Cash** untuk hitung variance.

### Posting Variance Kas Otomatis
- Jika `Actual Cash` **lebih kecil** dari `Cash in Server`: sistem posting jurnal selisih (`Dr Uncategorized Expense / Cr Cash on Hand`).
- Jika `Actual Cash` **lebih besar** dari `Cash in Server`: sistem posting jurnal selisih (`Dr Cash on Hand / Cr Uncategorized Income`).
- Jika sama: tidak ada jurnal penyesuaian tambahan.

> Untuk transaksi retail (tanpa meja), lewati Tab Meja dan gunakan Tab Kasir langsung — tombol **Checkout (F9)** memproses pembayaran instan tanpa siklus dapur/billing.

## Alur Pre-Order POS (Invoice Dulu, Bayar Belakangan)
1. Tambahkan item ke cart di tab Kasir.
2. Klik **Checkout (F9)**.
3. Pilih mode **Pre-Order (Invoice Only)**.
4. Konfirmasi untuk membuat invoice status `ISSUED`.
5. Buka **History** POS, pilih invoice yang baru dibuat.
6. Di halaman detail invoice POS, klik **Terima Pembayaran** untuk mencatat DP/pelunasan sampai status invoice menjadi `PAID`.

### Notifikasi WA Manual Popup (Service + POS)
Untuk customer yang punya nomor WhatsApp valid, sistem menampilkan popup manual kirim pesan pada momen operasional utama:

1. **Service order dibuat** (termasuk info DP jika ada).
2. Setelah create sukses, sistem menampilkan popup manual kirim notifikasi customer (preview pesan dari `Admin > Settings > Communication`, event `SERVICE_CREATED`).
3. Saat status service berubah ke tahap penting (`READY`, `DONE`, `CLOSED`), sistem menampilkan popup manual kirim notifikasi customer sesuai template event service.
4. Saat pelunasan/payment dicatat, sistem menampilkan popup manual kirim notifikasi customer menggunakan template komunikasi pembayaran.

Catatan:
- Link yang dikirim ke customer kini memakai halaman publik token-based `/id/public/t/[token]`.
- Halaman publik memuat header company, nama + nomor HP customer, nomor order/invoice, status service/invoice/payment, history transaksi terkait customer, dan tombol WhatsApp support ke admin.
- Jika dokumen tersedia, customer juga bisa mengunduh invoice/payment/receipt/work-order langsung dari halaman publik yang sama tanpa login.

Jika channel WA/email tidak tersedia, sistem menampilkan warning agar data contact dilengkapi.

Setiap aksi kirim WA di popup akan dicatat ke log komunikasi agar jejak follow-up tidak hilang.
Status follow-up dapat dipantau bertahap (`Queued`, `Sent`, `Delivered`, `Read`, `Failed`) dari modul Contact.

## Quick Contact & Quick Inform (Marketing Assist)

Untuk mempercepat follow-up customer langsung dari POS:

- Di dialog **Checkout** (mode kasir produk), user bisa:
  - pilih customer dari picker searchable yang sama polanya dengan form `Sales Order`,
  - klik **+ Quick Contact** untuk buat customer baru tanpa keluar dari POS,
  - klik **Quick Inform** untuk kirim pesan cepat promo/update (prioritas WhatsApp, fallback email).
- Di panel **Service Queue**, user bisa:
  - pilih customer sebelum membuat service order,
  - quick create contact langsung dari panel service,
  - kirim **Quick Inform** per order untuk update progres ke customer.
  - melihat indikator **Kontak terakhir** pada setiap order (timestamp follow-up WA terbaru).

Jika customer tidak punya nomor HP/email, tombol inform akan tampil error agar data contact dilengkapi dulu.

## Kitchen Ticket Print
- Dialog cetak menyertakan: nomor tiket, meja (kode + area), kasir, session, waktu kirim, daftar item (qty + nama + SKU + catatan), note order.
- Layout print-only pakai 80mm, font monospace, dash separator — cocok untuk thermal printer.
- Print dipicu via `window.print()` (kompatibel dengan dialog print browser dan kiosk mode).

## Dining Spot (Meja/Lokasi)

### Tujuan
Memastikan transaksi dine-in tidak tercampur, dan order bisa ditelusuri per meja atau kamar/lokasi.

### Master Data Meja/Lokasi
- Kelola area dan spot di menu: **POS > Dining Spots** (`/pos/dining-spots`).
- CRUD tersedia untuk:
  - `DiningArea` (nama, kode, urutan, aktif/nonaktif),
  - `DiningSpot` (kode, nama, tipe meja/kamar, kapasitas, area, aktif/nonaktif).
- Penghapusan area hanya bisa jika belum punya spot.
- Penghapusan spot hanya bisa saat status spot `AVAILABLE`.

### Status Dasar
- `AVAILABLE`: siap dipakai.
- `ORDERING`: meja/lokasi sedang aktif order.
- `BILLING`: proses pembayaran.
- `CLOSED`: sesi meja ditutup (historical state).

## Hold & Resume Order

### Hold Order
Gunakan saat pelanggan belum final, atau ingin pindah ke transaksi lain.
- Data yang disimpan: item, diskon, catatan, nama customer, dan spot (jika dipilih).

### Resume Order
- Buka dialog **Held Orders** dari header POS.
- Pilih order yang ingin dilanjutkan — cart akan terisi kembali, termasuk konteks spot.

## Catatan Restoran
- Jika menu punya BOM aktif, POS mengurangi stok bahan.
- Jika BOM tidak ada, fallback ke stok produk jual.
- Checkout retail (instan) via Tab Kasir valid tanpa meja; kirim ke dapur wajib memilih meja.

## Catatan Service & Stok
- Service + BOM aktif: stok komponen BOM berkurang saat order `DONE`.
- Service tanpa BOM: tidak ada pengurangan stok.
- Non-service tanpa BOM: stok produk langsung berkurang (fallback).

## Migrasi dari Rute Lama
Rute lama otomatis redirect ke tab yang setara:

- `/pos/restaurant` → `/pos?tab=floor`
- `/pos/restaurant/kitchen` → `/pos?tab=kitchen`
- `/pos/restaurant/billing` → `/pos?tab=billing`

Sidebar POS berisi: `Cashier` (`/pos`), `Sessions` (`/pos/sessions`), dan `Dining Spots` (`/pos/dining-spots`).  
Menu `Services` sekarang menjadi modul sidebar terpisah dengan route operasional sendiri.

## Validasi
- Invoice terbuat
- Payment terbuat
- Movement stok tercatat
- Outbox event payment/invoice tercatat untuk proses integrasi.

## Troubleshooting Cepat
- **Tidak bisa checkout**: cek status spot (harus aktif) untuk flow dine-in; retail tidak perlu meja.
- **Meja tidak bisa dibuka**: pastikan status masih `AVAILABLE`.
- **Tiket tidak mau print**: pastikan browser mengizinkan dialog print, atau set default printer thermal 80mm.
- **Hold order tidak muncul**: refresh dialog held orders dan cek session user.
- **Pre-order belum lunas**: pastikan pembayaran lanjutan dicatat pada invoice terkait sampai status `PAID`.
