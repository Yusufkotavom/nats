---
title: Modul POS
module: pos
order: 110
updatedAt: 2026-05-13
summary: Operasional kasir restoran dari buka sesi, order meja/lokasi, hold-resume, sampai tutup sesi.
related: 03-operasional-harian,modules/inventory,modules/production,modules/sales,modules/purchase,modules/accounting
---

# Modul POS

## Tujuan
Menjalankan transaksi kasir restoran secara cepat, akurat, dan sinkron ke sales, pembayaran, stok, serta alur dapur.

## Prasyarat
- User punya `pos.access`
- Warehouse tersedia
- Stok bahan/produk cukup
- Cash/Bank account untuk pembayaran sudah diset

## Komponen Utama POS
- **POS Session**: sesi kasir per shift.
- **Product Grid**: daftar item jual + pencarian + filter kategori.
- **Cart**: item order aktif.
- **Held Order**: order yang ditahan sementara.
- **Dining Spot (Meja/Lokasi)**: konteks order restoran.

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
- Pengaturan biaya yang bisa diatur:
  - `Service Charge (%)`
  - `Tax (%)`
  - `Additional Fee Label` (opsional)
  - `Additional Fee Amount`
- Nilai biaya akan dipakai otomatis di cart POS dan ikut ke total invoice POS.

## Alur Harian POS Restoran (Disarankan)
1. Buka POS Session (pilih warehouse dan opening cash).
2. Buka menu `POS > Restaurant Floor`, pilih meja/lokasi, lalu klik **Open**.
3. Input item order di halaman POS (`/pos`) lalu klik **Kitchen** untuk kirim ke dapur.
4. Dapur memproses ticket di `POS > Restaurant Kitchen` (status item: `NEW -> COOKING -> READY -> SERVED`).
5. Saat pelanggan minta bill, kasir buka `POS > Restaurant Billing` lalu klik **Generate Bill**.
6. Terima pembayaran (cash/card/QRIS) di halaman Billing.
7. Setelah lunas, klik **Close Table**.
8. Akhir shift, tutup POS session dan verifikasi selisih kas.

## Menu Baru: Restaurant Service
- `POS > Restaurant Floor` (`/pos/restaurant`): indikator meja aktif, open/close, quick link ke POS.
- `POS > Restaurant Kitchen` (`/pos/restaurant/kitchen`): antrian kitchen per station.
- `POS > Restaurant Billing` (`/pos/restaurant/billing`): generate invoice, settle payment, close table.

## Dining Spot (Meja/Lokasi)

### Tujuan
Memastikan transaksi dine-in tidak tercampur, dan order bisa ditelusuri per meja atau kamar/lokasi.

### Master Data Meja/Lokasi
- Kelola area dan spot di menu dashboard: `/pos/dining-spots`.
- CRUD tersedia untuk:
  - `DiningArea` (nama, kode, urutan, aktif/nonaktif),
  - `DiningSpot` (kode, nama, tipe meja/kamar, kapasitas, area, aktif/nonaktif).
- Penghapusan area hanya bisa jika belum punya spot.
- Penghapusan spot hanya bisa saat status spot `AVAILABLE`.

### Cara Pakai
1. Pilih meja/lokasi di dropdown header POS.
2. Lihat indikator status spot.
3. Klik:
- **Buka** untuk mulai service meja/lokasi.
- **Tutup** saat order di meja/lokasi selesai.

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
- Buka dialog **Held Orders**.
- Pilih order yang ingin dilanjutkan.
- Cart akan terisi kembali, termasuk konteks spot jika ada.

## Catatan Restoran
- Jika menu punya BOM aktif, POS mengurangi stok bahan.
- Jika BOM tidak ada, fallback ke stok produk jual.
- Untuk mode meja/lokasi, checkout hanya valid saat spot aktif order/billing.

## Validasi
- Invoice terbuat
- Payment terbuat
- Movement stok tercatat
- Outbox event payment/invoice tercatat untuk proses integrasi.

## Troubleshooting Cepat
- **Tidak bisa checkout**: cek status spot (harus aktif).
- **Meja tidak bisa dibuka**: pastikan status masih `AVAILABLE`.
- **Hold order tidak muncul**: refresh dialog held orders dan cek session user.
