---
title: Modul Purchase
module: purchase
order: 130
updatedAt: 2026-05-08
summary: Alur pembelian dari PO sampai pembayaran vendor.
related: modules/inventory,modules/cash-bank,modules/accounting
---

# Modul Purchase

## Fungsi
- Purchase Order
- Receive
- Invoice
- Return
- Payment

## Alur Umum
PO -> Receive (stok naik) -> Invoice -> Payment.

## Validasi
- Receive menghasilkan pergerakan stok masuk.
- Invoice/payment terhubung ke vendor.
- Nomor `Purchase Invoice` bisa diisi manual (nomor dari vendor) atau dikosongkan agar auto-generate dari `Admin > Settings > Document Numbering` untuk entitas `PURCHASE_INVOICE`.
