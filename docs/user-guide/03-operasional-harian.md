---
title: Operasional Harian End-to-End
module: general
order: 30
updatedAt: 2026-05-08
summary: Alur harian dari stok masuk sampai penutupan kasir dan review laporan.
related: modules/purchase,modules/inventory,modules/production,modules/pos,modules/sales,modules/accounting
---

# Operasional Harian End-to-End

## Alur Standar Restoran

1. **Stok masuk**: catat pembelian/penerimaan barang.
2. **Validasi stok**: cek ketersediaan bahan utama.
3. **Aktifkan POS session**: buka kasir dengan warehouse yang benar.
4. **Transaksi penjualan**: menu terjual, stok bahan berkurang via BOM.
5. **Tutup sesi**: cocokkan kas fisik vs sistem.
6. **Review laporan**: sales, margin, pergerakan stok, jurnal.

## Titik Kontrol Harian

- Produk stok kritis
- BOM yang baru diubah
- Error stok tidak cukup saat POS
- Selisih kas di akhir sesi

## Akhir Hari

- Pastikan tidak ada transaksi tertahan.
- Pastikan laporan utama bisa ditarik tanpa error.

## Link Modul

- [Purchase](./modules/purchase)
- [Inventory](./modules/inventory)
- [Production](./modules/production)
- [POS](./modules/pos)
- [Sales](./modules/sales)
- [Accounting](./modules/accounting)
