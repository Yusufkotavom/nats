---
title: Modul POS
module: pos
order: 110
updatedAt: 2026-05-14
summary: Operasional POS terpadu untuk restoran dan service workflow (DP/pelunasan) dalam satu halaman.
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

## Mode Kasir: Produk vs Service
Di tab **Kasir**, tersedia dua mode:

- **Produk**: flow POS reguler (product grid + cart + checkout instan / kirim ke dapur).
- **Service**: flow order jasa bertahap untuk pekerjaan yang butuh proses waktu.

Mode **Service** hanya menampilkan produk dengan flag `Service Item` aktif di master produk.

Untuk operasional jasa yang ingin dipisah dari layar kasir utama, gunakan halaman standalone:
- **`/services`** (menu: `POS > Services`)
- halaman ini memakai engine service order yang sama, tetapi surface UI terpisah agar lebih mudah dikembangkan per lini bisnis jasa.

### Aktivasi Produk Service
1. Buka `Inventory > Products`.
2. Buat/edit produk.
3. Aktifkan switch **Service Item**.
4. Simpan produk.

Produk service dapat dijual walau stok produk service nol.

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

## Alur Service Order (DP dan Pelunasan)
1. Masuk tab `Kasir` lalu pilih mode **Service**.
2. Pilih produk service, qty, harga, target selesai, dan catatan.
3. Isi DP jika ada (opsional) + metode pembayaran DP.
4. Klik **Buat Order Service**.
5. Lanjutkan status antrian sesuai progres: `NEW -> PROCESSING -> READY -> DONE`.
6. Saat status `DONE`, sistem menyelesaikan shipment internal dan proses konsumsi stok sesuai aturan BOM.
7. Jika masih ada sisa tagihan, klik **Pelunasan** sampai `remaining = 0`.
8. Setelah invoice lunas, status bisa ditutup ke `CLOSED`.

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

Sidebar kini hanya berisi: `Cashier` (`/pos`), `Sessions` (`/pos/sessions`), dan `Dining Spots` (`/pos/dining-spots`).

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
- **Produk tidak muncul di mode Service**: cek flag `Service Item` pada master produk.
- **Order service tidak bisa CLOSED**: pastikan invoice service sudah `PAID` (remaining = 0).
