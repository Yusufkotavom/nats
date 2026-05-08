---
title: Setup Awal
module: general
order: 10
updatedAt: 2026-05-08
summary: Setup akun, environment, database, seed, dan login pertama.
related: 00-start-here,02-master-data,modules/admin,modules/inventory
---

# Setup Awal

## 1. Akses Aplikasi

1. Buka URL aplikasi.
2. Login dengan akun yang tersedia.
3. Pastikan role sesuai fungsi (superadmin/admin/kasir/manager).

## 2. Cek Konfigurasi Dasar

1. Company profile
2. Currency dan timezone
3. Session/auth berjalan normal

## 3. Setup Database (untuk environment baru)

1. Sinkron schema database.
2. Jalankan seeder sesuai kebutuhan:
   - minimal umum
   - minimal restoran (tanpa transaksi)

## 4. Verifikasi Akun Default

Pastikan akun default bisa login, lalu ganti password produksi.

## 5. Verifikasi Wajib Sebelum Go-Live

- Cash account tersedia
- Warehouse tersedia
- Unit dan kategori tersedia
- Produk dan BOM inti tersedia

## Lanjutkan

- [Master Data](./02-master-data)
- [Admin Module](./modules/admin)
