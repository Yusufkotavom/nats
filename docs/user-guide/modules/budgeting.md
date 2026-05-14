---
title: Modul Budgeting
module: budgeting
order: 180
updatedAt: 2026-05-14
summary: Penyusunan budget operasional dan target dana internal (celengan) terhadap realisasi.
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
- Saving target (target dana internal/celengan)
- Akses route utama dari sidebar: `Budgeting`, `Budgets`, `Saving Targets`.

## Saving Target Dana Internal
- Saving target dibuat dari menu `Budgeting > Saving Targets`.
- Secara teknis target ini tetap memakai engine budgeting existing (bukan modul akuntansi baru) dengan tipe `SAVING_TARGET`.
- Item utama target wajib memilih akun existing yang ingin dipantau akumulasinya.
- Nilai progres dihitung:
1. `Target` = planned amount item utama.
2. `Actual` = total jurnal akun pada periode target.
3. `Remaining` = `Target - Actual`.
4. `Progress %` = `Actual / Target`.

## Aturan Edit Budget
- Budget dapat diedit hanya saat status `DRAFT` atau `REJECTED`.
- Setelah `PENDING_APPROVAL` atau `APPROVED`, edit langsung tidak diizinkan.
- Jika perlu perubahan setelah approved, lakukan proses revisi sesuai kebijakan internal.

## Periode Fleksibel
- Budget/target bisa memakai periode custom per dokumen (`periodStart`/`periodEnd`) untuk deadline spesifik.
- Jika periode custom diisi, kalkulasi variance dan budget availability memakai periode custom ini.
- Jika periode custom kosong, sistem fallback ke rentang fiscal year seperti behavior sebelumnya.

## Validasi
- Budget aktif sesuai periode.
- Variance bisa dianalisis per kategori.
