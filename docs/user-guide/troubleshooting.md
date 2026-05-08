---
title: Troubleshooting
module: general
order: 900
updatedAt: 2026-05-08
summary: Daftar masalah umum operasional dan tindakan cepat.
related: 03-operasional-harian,modules/pos,modules/inventory,modules/production
---

# Troubleshooting

## POS gagal transaksi: stok tidak cukup

Penyebab umum:
- Stok bahan 0
- BOM aktif tapi komponen kurang

Tindakan:
1. Cek stok bahan di Inventory.
2. Input stok masuk.
3. Cek qty BOM sesuai unit.

## Menu Edit BOM tidak muncul

Penyebab umum:
- Permission tidak sesuai
- UI belum refresh

Tindakan:
1. Login superadmin/admin dengan hak edit.
2. Refresh halaman daftar BOM.

## Nilai biaya BOM tidak realistis

Penyebab umum:
- Cost masih dalam skala per KG tetapi base unit GR.

Tindakan:
1. Sesuaikan cost ke biaya per base unit.
2. Validasi total cost per porsi.

## Login gagal

Tindakan:
1. Verifikasi email/password.
2. Reset password via admin jika perlu.

## Butuh bantuan lanjut

Laporkan dengan format:
- modul
- langkah sebelum error
- pesan error exact
- waktu kejadian
