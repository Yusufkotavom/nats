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
2. `Send to Kitchen` membentuk `RestaurantOrder` + `KitchenTicket` (status item per station) dan mengembalikan `{orderId, orderNumber, kitchenTicketId, ticketNumber}` untuk dipakai UI print.
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

## Unified POS Shell (2026-05-13)

Halaman `/pos` (`app/[locale]/pos`) adalah satu shell tabbed yang menampung seluruh alur restoran — tidak ada lagi halaman terpisah untuk floor / kitchen / billing:

- `Meja` tab: `FloorTab` (`_components/floor-tab.tsx`) → `RestaurantOrderService.getFloorOverview`, `DiningSpotService.openSpot` / `closeSpot`.
- `Kasir` tab: `ProductGrid` + `CartView` (`_components/cart-view.tsx`) → `POSTransactionService.process` untuk retail instan; `RestaurantOrderService.sendToKitchen` untuk dine-in.
- `Dapur` tab: `KitchenTab` (`_components/kitchen-tab.tsx`) → `RestaurantOrderService.getKitchenTickets` + `updateKitchenItemStatus`; reprint via `getKitchenTicketForPrint`.
- `Billing` tab: `BillingTab` (`_components/billing-tab.tsx`) → `generateBill` / `settleBill` / `closePaidOrder`.
- `Tutup Sesi` (menu profil): `POSSessionService.close` menghitung `system cash` (`openingCash + cash payment`) dan jika ada variance otomatis posting jurnal penyesuaian kas memakai default account existing (`CASH_ON_HAND` vs `UNCATEGORIZED_EXPENSE/UNCATEGORIZED_INCOME`).

Aturan layer tetap berlaku:

- Seluruh panggilan data dari tab dilakukan lewat server action di `app/[locale]/pos/actions.ts`, yang thin-forward ke service di `modules/pos/services`.
- Tidak ada logic domain di tab component — hanya orkestrasi UI + `useQuery` cache invalidation lintas tab (keys: `pos-floor-overview`, `pos-kitchen-tickets`, `pos-billing-queue`, `diningSpots`).
- Rute lama `/pos/restaurant`, `/pos/restaurant/kitchen`, `/pos/restaurant/billing` dipertahankan sebagai Next.js server component yang `redirect()` ke `/pos?tab=...` untuk backward-compat.
- `prisma.config.ts` mengeksplisitkan `migrations.path = "prisma/migrations"` (wajib pada Prisma 7 saat `schema` berupa folder), sehingga sidecar `migrate` di `docker-compose.yml` dapat menjalankan `prisma migrate deploy` tanpa fallback.

## Budgeting: Budget Operasional + Saving Target (2026-05-13)

- Modul budgeting tetap reuse service/action existing di `app/[locale]/(dashboard)/budgeting/actions.ts`.
- Ditambahkan klasifikasi dokumen budget: `Budget.kind` (`BUDGET` dan `SAVING_TARGET`) untuk pemisahan view tanpa membuat modul domain baru.
- Periode kalkulasi kini mendukung:
1. Periode custom per dokumen (`periodStart`/`periodEnd`).
2. Fallback ke periode fiscal year jika periode custom kosong.
- Progres saving target dihitung dari agregasi jurnal akun item utama pada rentang periode target (target vs actual vs remaining).
