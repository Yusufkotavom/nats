---
title: Kuesioner Kickoff Client (E2E)
module: general
order: 20
updatedAt: 2026-05-09
summary: Daftar pertanyaan cepat untuk menyelaraskan scope implementasi sebelum development.
related: modules/pos,modules/inventory,modules/production,modules/purchase,modules/accounting
---

# Kuesioner Kickoff Client (E2E)

Gunakan dokumen ini saat meeting awal client agar kebutuhan cepat terkumpul dan tidak miss.

## Dokumen yang Dipakai
- Form tabel cepat: `docs/client-e2e-alignment-form.md`
- Versi Google Form: `docs/client-e2e-alignment-google-form.md`

## Pertanyaan Wajib (Ringkas)
1. Operasional:
- jumlah outlet, single/multi gudang, target go-live.

2. POS:
- order berbasis meja/lokasi atau tidak,
- metode pembayaran,
- split bill, hold order, dan otorisasi void.

3. Persediaan:
- produk jadi vs bahan baku,
- BOM wajib atau tidak,
- kontrol stok negatif.

4. Dapur:
- konsumsi bahan otomatis dari BOM atau manual,
- perlu tracking waste atau tidak.

5. Purchase:
- quick purchase vs alur PO lengkap,
- cash harian vs hutang bulanan.

6. Accounting:
- posting realtime vs approval,
- kebutuhan costing,
- setup akun default vs custom COA.

7. Prioritas:
- tetapkan area mana masuk `MVP`, `Phase 2`, `Phase 3`.

## Output yang Harus Final Setelah Meeting
- Behavior POS final.
- Behavior inventory + dapur final.
- Alur purchase + pembayaran final.
- Aturan posting akuntansi final.
- Daftar fitur MVP yang disetujui client.
