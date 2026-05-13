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

## Alur Kritis Restoran: Table -> Kitchen -> Billing -> Inventory

Implementasi saat ini:
1. Service meja/restoran diproses di `modules/pos/services/restaurant-order.service.ts`.
2. `Send to Kitchen` membentuk `RestaurantOrder` + `KitchenTicket` (status item per station).
3. `Generate Bill` memanggil `POSTransactionService.issueInvoiceOnly(...)`:
- membuat Sales Order + Sales Invoice status `ISSUED`,
- membuat Shipment + movement stok (`OUT`) + posting COGS.
4. `Settle Bill` memanggil `POSTransactionService.settleIssuedInvoice(...)`:
- membuat Sales Payment,
- update invoice menjadi `PAID` atau `PARTIALLY_PAID`.
5. Penutupan meja hanya boleh saat order restoran sudah `PAID` (guard di `DiningSpotService.closeSpot`).
6. Jika BOM aktif tersedia untuk produk jual:
- stok yang dikurangi adalah bahan baku (hasil agregasi BOM).
7. Jika BOM tidak tersedia:
- fallback ke pengurangan stok produk jual (backward compatible).
8. Jika hasil konsumsi BOM pecahan desimal:
- transaksi ditolak karena kuantitas stok saat ini masih integer.

Rujukan detail: `docs/restaurant-pos-inventory-sync.md`.
