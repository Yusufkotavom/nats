# POS Restaurant Extension Plan

## Tujuan
Mengembangkan POS agar sesuai operasional restoran secara end-to-end:
- order by meja/lokasi kamar,
- status okupansi meja,
- alur kitchen (KOT),
- kontrol buka/tutup meja,
- tetap reuse arsitektur existing (`app -> modules -> lib -> prisma`).

## Kondisi Saat Ini (Fakta Implementasi)
- POS sudah punya `POSSession` dan `HeldOrder`.
- Belum ada master meja/area/ruangan.
- Belum ada status meja real-time.
- Belum ada kitchen ticket/station tracking.
- Held order belum terikat ke meja/kamar.

## Prinsip Implementasi
1. Reuse domain existing POS, sales, inventory, accounting.
2. Tambahan model data fokus ke restoran; tidak duplikasi transaksi sales/invoice/payment.
3. Semua perubahan behavior wajib test + changelog + update docs.

## Scope Fitur Restoran

### 1) Floor Layout + Master Meja/Lokasi
- Master `DiningArea` (contoh: Indoor, Outdoor, VIP, Lt2).
- Master `DiningSpot` untuk mode:
  - `TABLE` (T01, T02, dst),
  - `ROOM` (kamar/lokasi privat).
- Konfigurasi:
  - label, kapasitas, urutan tampilan, koordinat layout (x/y/w/h), aktif/nonaktif.

### 2) Status Meja/Lokasi
- Status spot:
  - `AVAILABLE`
  - `SEATED`
  - `ORDERING`
  - `SENT_TO_KITCHEN`
  - `SERVING`
  - `BILLING`
  - `CLEANING`
  - `CLOSED`
- Simpan waktu transisi status untuk KPI durasi okupansi.

### 3) Order Binding ke Meja/Kamar
- Held order dan transaksi POS harus bisa attach ke `diningSpotId`.
- Support:
  - pindah meja (`move spot`),
  - gabung meja (`merge`),
  - pisah tagihan (`split bill`).

### 4) Kitchen Flow (KOT)
- Buat tiket kitchen saat order submit.
- Routing item ke station:
  - `BAR`, `HOT_KITCHEN`, `GRILL`, `FRY`, `DESSERT` (configurable).
- Status item kitchen:
  - `NEW`, `PREPARING`, `READY`, `SERVED`, `VOID`.

### 5) Open/Close Spot Cycle
- Open spot saat mulai service.
- Close spot saat semua bill selesai.
- Otomatis lock spot saat open; release saat close.

## Desain Data (Usulan Prisma)

Catatan: nama final menyesuaikan style schema existing.

### Model Baru
1. `DiningArea`
- `id`, `name`, `code`, `sortOrder`, `isActive`, timestamps.

2. `DiningSpot`
- `id`, `areaId`, `spotCode`, `spotName`, `spotType(TABLE|ROOM)`, `capacity`, `isActive`.
- `layoutX`, `layoutY`, `layoutW`, `layoutH` (opsional untuk visual map).

3. `DiningSpotSession`
- jejak okupansi per kunjungan:
- `id`, `diningSpotId`, `openedAt`, `closedAt`, `openedBy`, `closedBy`, `status`.
- `guestCount`, `notes`.

4. `KitchenTicket`
- `id`, `ticketNumber`, `posSessionId`, `diningSpotId`, `status`, `createdAt`, `sentAt`, `completedAt`.

5. `KitchenTicketItem`
- `id`, `kitchenTicketId`, `salesOrderItemId` (atau reference item POS), `station`, `status`, `note`.

### Perubahan Model Existing
1. `HeldOrder`
- tambah `diningSpotId` (nullable untuk take-away).
- tambah `serviceType` (`DINE_IN`, `TAKE_AWAY`, `DELIVERY`).

2. `SalesOrder`/`SalesInvoice` (opsional bertahap)
- tambah `diningSpotId` untuk trace report.

## Alur Operasional (Target)

### Dine-In
1. Kasir/Waiter pilih area -> pilih meja.
2. Klik `Open Table`.
3. Input order -> `Hold` atau `Send to Kitchen`.
4. Kitchen proses per station.
5. Saat selesai, waiter serve -> status spot `SERVING`.
6. Saat minta bill -> `BILLING`.
7. Payment selesai -> `CLOSED` -> meja kembali `AVAILABLE`/`CLEANING`.

### Room Service
1. Pilih `ROOM` sebagai dining spot.
2. Flow identik dine-in, beda label lokasi.

### Take Away
1. Tanpa `diningSpotId`.
2. Langsung flow POS existing.

## Perubahan Layer Implementasi

### app/
- `app/[locale]/pos`:
  - tambah panel layout meja/spot,
  - filter order berdasarkan spot/status,
  - aksi open/close/move/merge/split.
- action baru:
  - `openDiningSpot`,
  - `closeDiningSpot`,
  - `moveHeldOrderToSpot`,
  - `sendOrderToKitchen`,
  - `updateKitchenItemStatus`.

### modules/
- `modules/pos/services`:
  - `dining-spot.service.ts`
  - `kitchen-ticket.service.ts`
  - extend `held-order.service.ts` dan `pos-transaction.service.ts`.
- Reuse `inventory` dan `accounting` service tanpa perubahan kontrak inti.

### prisma/
- schema file baru domain POS restoran (atau extend `10_pos.prisma`).
- migration bertahap, backward-compatible.

## Roadmap Bertahap

### Phase 1 (MVP Restoran)
- Master area + dining spot.
- Open/close spot.
- Bind held order ke spot.
- Status spot dasar: `AVAILABLE`, `ORDERING`, `BILLING`, `CLOSED`.
- UI list spot + indikator warna.

### Phase 2 (Kitchen + Advanced Table Ops)
- Kitchen ticket + station routing.
- Status kitchen item.
- Move/merge/split order.
- Status spot lengkap (`SEATED` s/d `CLEANING`).

### Phase 3 (Optimisasi Operasional)
- Reservasi + waiting list.
- KPI dashboard restoran:
  - turnover meja,
  - rata-rata durasi makan,
  - kitchen SLA,
  - peak occupancy.

## Test Plan Minimum

### Service Tests
- Open/close dining spot lifecycle.
- Hold order with `diningSpotId`.
- Send to kitchen creates ticket+items.
- Move/merge/split menjaga total amount dan integritas item.

### Action/API Tests
- Permission check (`pos.access` + override manager untuk aksi sensitif).
- Validasi status transisi spot.

### UI/Integration Tests
- Meja berubah status real-time setelah aksi.
- Checkout dari meja menutup spot dengan benar.
- Take-away tetap berjalan tanpa spot.

## Risiko dan Mitigasi
1. Konflik status meja saat multi-user:
- mitigasi: optimistic locking + status transition guard.

2. Double submit order:
- mitigasi: idempotency key per aksi submit.

3. Kerusakan flow lama POS:
- mitigasi: feature flag `restaurantMode` dan rollout bertahap.

## Gap-Check Sebelum Coding
1. Konfirmasi apakah 1 outlet bisa punya banyak layout area.
2. Konfirmasi kebutuhan room service wajib atau opsional.
3. Konfirmasi apakah split bill per item atau per nominal.
4. Konfirmasi station dapur default per kategori produk.
