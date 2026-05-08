---
title: Modul Budgeting
module: budgeting
order: 180
updatedAt: 2026-05-08
summary: Penyusunan dan monitoring budget terhadap realisasi.
related: modules/accounting,modules/admin
---

# Modul Budgeting

## Kapan Wajib Diisi
- Budgeting tidak memblokir transaksi secara hard.
- Tetapi tanpa budget aktif, sistem akan menampilkan warning "No budget defined for this period" pada alur tertentu.
- Untuk setup baru, minimal wajib:
1. Buat 1 budget `Default/Global`.
2. Periode tahun berjalan.
3. Status `APPROVED`.

## Fungsi
- Budget plan
- Budget tracking
- Variance analysis

## Aturan Edit Budget
- Budget dapat diedit hanya saat status `DRAFT` atau `REJECTED`.
- Setelah `PENDING_APPROVAL` atau `APPROVED`, edit langsung tidak diizinkan.
- Jika perlu perubahan setelah approved, lakukan proses revisi sesuai kebijakan internal.

## Validasi
- Budget aktif sesuai periode.
- Variance bisa dianalisis per kategori.
