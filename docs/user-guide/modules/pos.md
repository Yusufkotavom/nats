---
title: Modul POS
module: pos
order: 110
updatedAt: 2026-05-08
summary: Operasional kasir dari buka sesi, transaksi, sampai tutup sesi.
related: 03-operasional-harian,modules/inventory,modules/production,modules/sales
---

# Modul POS

## Tujuan
Menjalankan transaksi kasir cepat dan tercatat otomatis ke sales, pembayaran, dan stok.

## Prasyarat
- User punya `pos.access`
- Warehouse tersedia
- Stok bahan/produk cukup

## Alur Utama
1. Buka POS Session
2. Pilih item dan proses pembayaran
3. Cetak/lihat invoice
4. Tutup session dan cek selisih kas

## Catatan Restoran
- Jika menu punya BOM aktif, POS mengurangi stok bahan.
- Jika BOM tidak ada, fallback ke stok produk jual.

## Validasi
- Invoice terbuat
- Payment terbuat
- Movement stok tercatat
