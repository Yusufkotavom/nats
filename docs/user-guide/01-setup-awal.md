---
title: Setup Awal
module: general
order: 10
updatedAt: 2026-05-08
summary: Setup akun, environment, database, seed, dan login pertama.
related: 00-start-here,02-master-data,modules/admin,modules/inventory
---

# Setup Awal

## Urutan Input Pertama (Untuk User Non-Akuntansi)

Ikuti urutan ini dari atas ke bawah. Jangan lompat.

1. Profil perusahaan:
- Nama perusahaan, alamat, NPWP (jika ada), timezone, mata uang.

2. Akun user dan role:
- Buat minimal: `superadmin`, `admin operasional`, `kasir`, `purchasing`.
- Semua akun wajib ganti password awal.

3. Struktur dasar operasional:
- Warehouse utama.
- Unit dasar: `pcs`, `gr`, `ml`, `kg`, `l`.
- Kategori produk (bahan baku, minuman, menu jadi, perlengkapan).

4. Produk master:
- Input bahan baku dulu (contoh: beras, gula, teh, ikan, minyak).
- Input menu jual setelah bahan baku ada (contoh: nasi goreng, gurami bakar, es teh).

5. BOM (Bill of Materials):
- Hubungkan menu jual ke bahan baku.
- Tanpa BOM, konsumsi bahan saat jual tidak akurat.

6. Harga awal:
- Isi harga jual menu.
- Isi harga beli perkiraan bahan baku (boleh awal sederhana, nanti disempurnakan dari transaksi beli nyata).

7. Budget minimum (agar warning tidak muncul):
- Buat 1 budget `Default/Global` untuk tahun berjalan.
- Status harus `APPROVED`.
- Opsional tahap awal: budget per departemen.

8. Saldo awal kas/bank (jika sudah beroperasi sebelumnya):
- Isi saldo awal akun kas/bank agar laporan tidak nol semua.
- Jika bisnis benar-benar baru, bisa mulai dari nol.
- Arah jurnal saldo awal:
  - Kas/Tunai/Bank diisi sebagai `Debit`.
  - Lawan jurnalnya ke `Ekuitas Saldo Awal` atau `Modal Pemilik` sebagai `Kredit`.
- Contoh:
  - Debit Kas: Rp10.000.000
  - Kredit Ekuitas Saldo Awal: Rp10.000.000

9. Test transaksi end-to-end:
- Buat 1 purchase order + receive (stok masuk).
- Buat 1 transaksi POS/sales (stok bahan berkurang via BOM).
- Cek jurnal dan laporan ringkas.

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
   - minimal restoran (tanpa transaksi, termasuk master bahan dapur lanjutan seperti bumbu/minyak/LPG serta konfigurasi unit base/purchase/sales + conversion factor)

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
