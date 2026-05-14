# Restaurant POS-Inventory Sync: Gap Audit and Implementation Notes

## Tujuan
Menjamin sinkronisasi penjualan POS ke persediaan secara terukur untuk operasional restoran, tanpa membuat modul baru yang duplikatif.

## Kondisi Arsitektur Saat Ini (Fakta)
- POS transaksi diproses di `modules/pos/services/pos-transaction.service.ts`.
- Pengurangan stok dilakukan lewat `InventoryService.createInventoryMovement(...)` tipe `OUT`.
- Struktur BOM sudah ada di `BillOfMaterial` dan `BillOfMaterialItem` (`prisma/schema/16_production.prisma`).
- Movement stok terpusat di `modules/inventory/services/inventory.service.ts`.
- Model kuantitas stok saat ini integer (`Inventory.quantity Int`).

## Gap yang Teridentifikasi
1. POS sebelumnya mengurangi stok produk jual langsung, belum konsumsi bahan berdasarkan BOM.
2. Belum ada guard ketika BOM menghasilkan konsumsi pecahan (desimal) sementara stok hanya menerima integer.
3. Dokumentasi alur restoran (POS -> BOM -> Inventory Movement) belum tersedia.

## Implementasi yang Dilakukan
1. **Reuse service existing (tanpa modul baru)**
- Menambah resolver di `POSTransactionService` untuk menghitung konsumsi bahan dari BOM aktif per item jual.
- Jika BOM ditemukan: movement `OUT` berisi bahan baku hasil agregasi.
- Jika BOM tidak ditemukan: fallback ke perilaku lama (kurangi produk jual).

2. **Guard kuantitas terukur**
- Jika hasil konsumsi BOM non-integer, transaksi ditolak dengan error eksplisit.
- Alasan: mencegah drift stok diam-diam karena mismatch desain data saat ini.

3. **Traceability**
- Notes movement menandai apakah transaksi memakai BOM consumption.

## Kontrak Perilaku Baru
- POS sale dengan BOM aktif -> stok bahan berkurang.
- POS sale tanpa BOM -> stok produk jual berkurang (backward compatible).
- BOM menghasilkan kuantitas pecahan -> transaksi gagal sampai unit-konversi dibenahi.
- Setup awal warehouse otomatis menyiapkan kategori POS baseline (`Menu Makanan`, `Menu Minuman`, `Menu Snack`, `Menu Dessert`) agar segmentasi katalog menu lebih siap pakai.

## Ekstensi Flow Restoran (Bayar Belakangan)

Implementasi lanjut (fase service restoran):
1. `Open Table` -> spot status `ORDERING`.
2. `Send to Kitchen` -> buat `RestaurantOrder` + `KitchenTicket` + `KitchenTicketItem` per station.
3. `Generate Bill` (saat pelanggan minta bill) -> create invoice `ISSUED` via `POSTransactionService.issueInvoiceOnly`.
4. `Settle Bill` -> create payment + update invoice via `POSTransactionService.settleIssuedInvoice`.
5. `Close Table` hanya jika order restoran `PAID`.

Catatan akuntansi:
- Saat send-to-kitchen: belum ada jurnal kas.
- Saat generate bill: jurnal revenue/AR + shipment/COGS diproses melalui flow invoice/shipment.
- Saat settle bill: jurnal kas/bank diproses melalui flow payment.

## Batasan Saat Ini
- Reason code waste/spoilage belum jadi field terstruktur; masih bisa ditulis di notes movement.
- Dukungan pecahan unit belum ada karena model stok integer.

## Langkah Lanjutan (Opsional, terpisah)
1. Tambahkan reason code terstruktur untuk waste (mis. BUSUK/SUSUT/TUMPAH).
2. Rancang migrasi kuantitas stok ke decimal atau strategi konversi base-unit terkecil yang konsisten.
3. Tambah laporan loss/waste berbasis movement metadata.
