---
title: Modul Inventory
module: inventory
order: 150
updatedAt: 2026-05-28
summary: Master produk, unit, gudang, dan pergerakan stok.
related: 02-master-data,modules/pos,modules/purchase,modules/production
---

# Modul Inventory

## Fungsi Inti
- Products
- Categories
- UOM
- Warehouses & Locations
- Movements

## Aturan Penting
- Base unit menentukan skala cost.
- Conversion factor diatur per produk.
- Produk punya mode **Manage Stock**:
  - `ON`: produk ikut pergerakan stok dan bisa disesuaikan lewat inventory adjustment.
  - `OFF`: produk tetap bisa dijual/dibeli tapi tidak ditampilkan di daftar stock adjustment.
- Pada **Edit Product**, stok saat ini bisa di-set langsung per warehouse. Saat disimpan, sistem otomatis membuat movement `ADJUSTMENT` sesuai selisih.

## Validasi
- Stok sesuai movement.
- Unit dan konversi konsisten.
