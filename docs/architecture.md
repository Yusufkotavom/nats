# Architecture Overview

## Layer Struktur

1. `app/`
- Next.js routes, page, layout, dan action endpoint.
- Tidak untuk business logic besar.

2. `modules/`
- Domain logic utama per modul (inventory, sales, pos, production, accounting, dll).
- Service class di `modules/*/services` adalah source of truth behavior domain.

3. `lib/`
- Shared utility, auth/session helper, prisma client wrapper, validation helper.

4. `prisma/`
- Skema data tersegmentasi per domain (`prisma/schema/*.prisma`).
- Seed script dan bootstrap data.

5. `docs/`
- Dokumen arsitektur, domain rules, dan operational governance.
- `docs/docs-index.json` adalah registry dokumen yang dapat diproses otomatis.

## Prinsip Integrasi Antar Layer

1. `app` memanggil `modules` service untuk proses bisnis.
2. `modules` berinteraksi dengan DB via Prisma transaction/client.
3. Side effect integrasi (outbox/event) dilakukan di service domain, bukan UI.
4. Validasi kontrak input sedapat mungkin konsisten melalui schema/helper shared.

## Alur Kritis Restoran: POS -> Inventory

Implementasi saat ini:
1. POS transaksi diproses di `modules/pos/services/pos-transaction.service.ts`.
2. Sistem membuat Sales Order, Invoice, Payment, Shipment.
3. Pengurangan stok dilakukan lewat `InventoryService.createInventoryMovement`.
4. Jika BOM aktif tersedia untuk produk jual:
- stok yang dikurangi adalah bahan baku (hasil agregasi BOM).
5. Jika BOM tidak tersedia:
- fallback ke pengurangan stok produk jual (backward compatible).
6. Jika hasil konsumsi BOM pecahan desimal:
- transaksi ditolak karena kuantitas stok saat ini masih integer.

Rujukan detail: `docs/restaurant-pos-inventory-sync.md`.

