---
title: Master Data
module: general
order: 20
updatedAt: 2026-05-08
summary: Data fondasi yang wajib dibuat sebelum transaksi.
related: 01-setup-awal,03-operasional-harian,modules/inventory,modules/production,modules/admin
---

# Master Data

## Data Wajib

1. Unit of Measure (contoh: PCS, GR, KG, ML, L, PRS, BTL)
2. Kategori produk
3. Produk (bahan baku + produk jual)
4. Warehouse dan lokasi
5. Kontak (customer/vendor/employee)
6. Role dan user

## Aturan Unit & Konversi

- Base unit menentukan satuan dasar biaya dan stok.
- Jika memakai purchase/sales unit berbeda, isi conversion factor.
- `1 DZN = 12 PCS` harus diatur pada produk terkait, tidak otomatis global.

## BOM (Resep)

- Buat BOM untuk menu yang dikonsumsi dari bahan baku.
- Pastikan qty BOM sesuai base unit bahan.

## Checklist Lulus Master Data

- Semua produk aktif punya unit valid.
- Produk yang butuh resep sudah punya BOM aktif.
- Warehouse default siap digunakan POS.

## Lanjutkan

- [Operasional Harian](./03-operasional-harian)
- [Inventory Module](./modules/inventory)
- [Production Module](./modules/production)
