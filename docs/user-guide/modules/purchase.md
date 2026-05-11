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
- Quick Purchase (cash harian / credit bulanan / preorder DP)

## Alur Umum
PO -> Receive (stok naik) -> Invoice -> Payment.

## Quick Purchase
- Path: `/purchase/quick`.
- Mode `Cash Daily`: otomatis membuat Receive -> Invoice -> Payment (posting otomatis).
- Mode `Monthly Credit`: otomatis membuat Receive -> Invoice (posting otomatis, bayar nanti).
- Mode `Preorder DP`: otomatis membuat Receive -> Invoice -> Payment DP parsial, sisa tagihan tetap outstanding.

## Validasi
- Receive menghasilkan pergerakan stok masuk.
- Invoice/payment terhubung ke vendor.
- Nomor `Purchase Invoice` bisa diisi manual (nomor dari vendor) atau dikosongkan agar auto-generate dari `Admin > Settings > Document Numbering` untuk entitas `PURCHASE_INVOICE`.
