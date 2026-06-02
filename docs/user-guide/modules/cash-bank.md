---
title: Modul Cash & Bank
module: cash-bank
order: 140
updatedAt: 2026-06-02
summary: Monitoring saldo, transfer, dan transaksi kas harian dengan setup akun melalui Payment Method.
related: modules/sales,modules/purchase,modules/accounting
---

# Modul Cash & Bank

## Fungsi
- Monitoring saldo kas/bank
- Cash transaction
- Transfer antar akun operasional

## Setup Akun
- Pengelolaan akun kas/bank operasional sekarang dipusatkan di halaman `Payment Method` (`/payment-method`).
- Halaman `Cash & Bank` tidak lagi menjadi tempat master akun agar tidak terjadi dual pengelolaan.
- Form `Transaction` dan `Transfer` tetap memakai akun kas/bank yang sama di backend, tetapi pilihannya diambil dari katalog `Payment Method`.

## Validasi
- Saldo akun berubah sesuai transaksi.
- Link ke dokumen sumber tercatat.

## Alur Transaksi (Mode Simple)
- Di halaman `Cash & Bank > Transaction > New`, mode default adalah **Simple**.
- User cukup isi:
  - tipe transaksi (`INCOME`/`EXPENSE`),
  - akun kas/bank dari daftar `Payment Method`,
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
- Jika tim accounting butuh detail, gunakan mode **Accounting** untuk input multi-allocation dan pilih akun GL manual.

## Setup Kategori Transaksi
- Kategori sekarang bisa dikelola dari halaman terpisah `Cash & Bank > Transaction Categories` (`/cash-bank/categories`).
- Halaman ini mendukung tambah, edit, dan nonaktifkan kategori transaksi.
- Penghapusan dibatasi: kategori yang sudah dipakai transaksi tidak bisa dihapus agar histori jurnal tetap aman.
