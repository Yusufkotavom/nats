# Quick Purchase: Needs, Audit, and Implementation Status

## Tujuan
Menyiapkan mode `Quick Purchase` yang ringkas untuk operasional restoran agar pembelian harian, bulanan, dan pre-order/DP dapat diproses cepat tanpa memecah user flow menjadi banyak halaman.

Dokumen ini digunakan sebagai sumber tunggal untuk audit kebutuhan dan status implementasi fitur.

## Status Implementasi Saat Ini
- Status umum: `IN_PROGRESS`
- Fase 1 (`CASH_DAILY`, `MONTHLY_CREDIT`): `IMPLEMENTED`
- Fase 2 (`PREORDER_DP`): `IMPLEMENTED` (partial payment ke invoice sudah jalan)
- Fase 3 (UX simplification lanjutan): `PARTIAL`

### Yang Sudah Diimplementasikan (Fase 1)
- Route baru `Quick Purchase`: `/purchase/quick`.
- Form ringkas satu halaman untuk:
  - `CASH_DAILY`
  - `MONTHLY_CREDIT`
- Orkestrasi otomatis berbasis action existing:
  - `CASH_DAILY`: create+complete receive -> create+post invoice -> create+post payment
  - `MONTHLY_CREDIT`: create+complete receive -> create+post invoice
- Navigasi sidebar ditambahkan: `Purchase > Quick Purchase`.
- Label i18n ditambahkan (`en`/`id`).

### Yang Belum / Lanjutan
- Hardening `PREORDER_DP` lanjutan:
  - skenario DP sebelum barang datang (tanpa receive),
  - flow apply DP lintas tahap jika dipisah dokumen.
- Idempotency key anti double submit yang eksplisit.
- Reason code waste/vendor-quality terstruktur + reason detail wajib.
- Penyempurnaan test end-to-end level action untuk skenario retry/idempotency.

## Latar Belakang (Kondisi Saat Ini)
- Alur pembelian standar saat ini: `Purchase Order` (opsional) -> `Purchase Receive` -> `Purchase Invoice` -> `Purchase Payment`.
- Untuk transaksi pasar/tunai harian, alur saat ini terasa lambat karena user harus pindah beberapa modul.
- Stok naik melalui `Purchase Receive`; invoice dan payment berdampak ke AP/Kas/Bank.

## Scope Fitur Quick Purchase (Target)
Satu form ringkas untuk mengeksekusi alur pembelian cepat berdasarkan tipe transaksi:

1. `Cash Daily` (belanja harian tunai: sayur, bumbu, bahan segar)
2. `Monthly Credit` (belanja bulanan tempo)
3. `Preorder / DP` (uang muka pembelian)

## Use Cases Prioritas

### 1) Cash Daily
- Contoh: belanja sayur pagi di pasar.
- Ekspektasi user:
  - Input vendor sederhana (boleh vendor default seperti "Pasar Tunai").
  - Input item, qty, unit cost.
  - Pilih akun kas/bank.
  - Satu submit langsung menghasilkan dokumen lengkap.
- Dokumen hasil yang diharapkan:
  - `Purchase Receive` (stok naik)
  - `Purchase Invoice` (tagihan tercatat)
  - `Purchase Payment` (langsung lunas)

### 2) Monthly Credit
- Contoh: supplier bulanan bahan baku.
- Ekspektasi user:
  - Barang datang dan stok langsung naik.
  - Invoice tercatat dengan due date.
  - Tidak ada payment langsung.
- Dokumen hasil:
  - `Purchase Receive`
  - `Purchase Invoice`
  - Status payable outstanding.

### 3) Preorder / DP
- Contoh: pesanan bahan tertentu dengan uang muka.
- Ekspektasi user:
  - Bisa catat DP dulu sebelum barang datang.
  - Nanti saat barang diterima, invoice final bisa dipotong DP.
- Kebutuhan akuntansi minimum:
  - DP harus tercatat terpisah (tidak langsung dianggap beban final).
  - Harus ada jejak referensi antar dokumen.

## Non-Goals (Batasan)
- Tidak membuat modul domain baru yang duplikatif.
- Tidak mengubah engine inventory/accounting inti.
- Tidak mengubah model stok menjadi decimal pada fase ini.

## Reuse Arsitektur Existing (Wajib)
- `modules/purchase/services/*`
- `modules/inventory/services/inventory.service.ts`
- `modules/integration/outbox` (event posting)
- `app/[locale]/(dashboard)/purchase/*/actions.ts`

Quick Purchase harus menjadi orchestration layer yang memanggil service existing, bukan bypass logic ke UI.

## Kontrak Data Minimum di Form Quick Purchase
- Header:
  - `transactionType`: `CASH_DAILY | MONTHLY_CREDIT | PREORDER_DP`
  - `vendorId` (opsional dengan fallback vendor default)
  - `transactionDate`
  - `dueDate` (wajib untuk monthly credit/invoice tempo)
  - `cashAccountId` (wajib untuk cash daily / DP payment)
  - `notes`
- Items:
  - `productId`
  - `quantity`
  - `unitCost`
  - `taxRateId` (opsional)
  - `departmentId` / `projectId` (opsional)

## Mapping Per Tipe Transaksi

### CASH_DAILY
- Create `Purchase Receive` (posted/issued)
- Create `Purchase Invoice` (posted/billed)
- Create `Purchase Payment` (full amount)
- Result: stok naik, AP nol (atau langsung tertutup), kas berkurang.

### MONTHLY_CREDIT
- Create `Purchase Receive`
- Create `Purchase Invoice` (with due date)
- No payment
- Result: stok naik, AP outstanding.

### PREORDER_DP (implementasi saat ini)
- Create `Purchase Receive`
- Create `Purchase Invoice`
- Create + post `Purchase Payment` sebesar `downPaymentAmount`
- Sisa tagihan tetap outstanding (`remainingPayableAmount`)

Catatan:
- Mode ini sekarang mendukung DP parsial pada invoice yang sama.
- Untuk model operasional dua tahap (DP dulu, barang datang belakangan) masih jadi backlog hardening.

## Dependency & Gap Check (Pra-Implementasi)
1. Verifikasi endpoint/service create untuk receive/invoice/payment bisa dipanggil dalam 1 transaksi orkestrasi.
2. Verifikasi idempotency (hindari dokumen ganda saat submit ulang/network retry).
3. Verifikasi default account wajib sudah lengkap:
   - `GOODS_RECEIVED_NOT_INVOICED`
   - `ACCOUNTS_PAYABLE`
   - `INVENTORY_ASSET`
   - `PURCHASE_TAX_RECEIVABLE`
4. Verifikasi behaviour untuk vendor opsional (fallback vendor default).
5. Verifikasi skenario rollback saat langkah ke-2/ke-3 gagal.

## Gap Check Pasca Implementasi Fase 1
1. **Atomicity lintas dokumen**
   - Saat ini orkestrasi memanggil action berurutan; belum single DB transaction lintas semua dokumen.
2. **Idempotency submit**
   - Belum ada `idempotencyKey`; potensi duplikasi jika user double-click/retry.
3. **Observability trace**
   - Perlu penguatan reference silang konsisten di semua dokumen turunan.
4. **Test otomatis**
   - Belum ada test service/action khusus quick purchase.

## Error Surface yang Harus User-Friendly
- Default account belum terkonfigurasi.
- Cash account belum dipilih.
- Item kosong / qty invalid.
- Duplicate invoice number (jika manual input).
- Gagal posting event integration outbox.

## Acceptance Criteria (Audit)
1. User kasir bisa menyelesaikan pembelian harian tunai <= 1 form submit.
2. Stok bertambah tepat setelah quick purchase sukses (cash daily/monthly credit).
3. Jurnal/AP/Kas konsisten terhadap tipe transaksi.
4. Semua dokumen turunan punya referensi silang (traceability).
5. Retry aman (idempotent) tanpa duplikasi dokumen.

## Test Plan Minimum (Nanti Saat Implementasi)
- Service tests:
  - quick purchase cash daily sukses (receive+invoice+payment)
  - quick purchase monthly credit sukses (receive+invoice only)
  - gagal di langkah payment -> rollback/kompensasi terdefinisi
- Action/API tests:
  - validasi field wajib per transaction type
  - permission checks
- Integration tests:
  - outbox event tercatat untuk dokumen yang diposting

## Test Plan Aktual (Tambahan untuk Progress Saat Ini)
- Tambah unit/integration test untuk action `createQuickPurchase`:
  - jalur sukses `CASH_DAILY`
  - jalur sukses `MONTHLY_CREDIT`
  - fail path saat posting invoice/payment gagal
- Tambah test anti-regresi:
  - status invoice untuk `MONTHLY_CREDIT` harus outstanding (tanpa payment).
  - status invoice untuk `CASH_DAILY` harus paid/tertutup setelah payment.

## Rekomendasi Fase Implementasi
1. Fase 1: `CASH_DAILY` dan `MONTHLY_CREDIT`
2. Fase 2: `PREORDER_DP` (setelah verifikasi mekanisme DP allocation existing)
3. Fase 3: penyederhanaan UX lanjutan (shortcut vendor, template item belanja harian)

## Rencana Implementasi Berikutnya (Prioritas)
1. Hardening Fase 1:
   - idempotency key,
   - error handling per step,
   - reference silang yang konsisten.
2. Implement Fase 2 (`PREORDER_DP`):
   - catat DP via cash transaction/account khusus uang muka pembelian,
   - apply DP ke invoice final.
3. Implement reason code untuk waste/vendor quality:
   - `BUSUK`, `RUSAK`, `QUALITY_VENDOR`, `HILANG`, `LAINNYA`,
   - `reasonDetail` wajib singkat.
