---
title: Modul Cash & Bank
module: cash-bank
order: 140
updatedAt: 2026-05-30
summary: Manajemen kas, bank, transfer, dan transaksi kas harian.
related: modules/sales,modules/purchase,modules/accounting
---

# Modul Cash & Bank

## Fungsi
- Cash account
- Cash transaction
- Transfer antar akun

## Validasi
- Saldo akun berubah sesuai transaksi.
- Link ke dokumen sumber tercatat.

## Alur UMKM (Mode Sederhana)
- Di halaman `Cash & Bank > Transaction > New`, gunakan mode default **Sederhana (UMKM)**.
- User cukup isi:
  - tipe transaksi (`INCOME`/`EXPENSE`),
  - akun kas/bank,
  - kategori,
  - nominal,
  - deskripsi.
- Sistem otomatis membuat alokasi jurnal 1 baris ke akun kategori yang dipilih, tanpa wajib memilih akun GL manual per baris.

## Kategori & Mapping Akun
- Kategori transaksi diambil dari akun posting di bawah parent default account:
  - `UNCATEGORIZED_EXPENSE` untuk transaksi keluar.
  - `UNCATEGORIZED_INCOME` untuk transaksi masuk.
- Saat membuka halaman transaksi baru, sistem melakukan auto-seed kategori minimal UMKM (idempotent), misalnya:
  - Operasional Umum
  - Belanja Bahan/Barang
  - Transport
  - Penjualan Tunai
  - Pendapatan Lainnya
- Jika tim accounting butuh detail, gunakan **Mode Akuntansi Lanjutan** untuk input multi-allocation dan pilih akun GL manual.
