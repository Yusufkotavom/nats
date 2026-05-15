---
title: Modul Sales
module: sales
order: 120
updatedAt: 2026-05-15
summary: Panduan lengkap proses penjualan dari order sampai payment dengan contoh praktis.
related: modules/pos,modules/inventory,modules/accounting
---

# Modul Sales

## 🎯 Tujuan
Modul Sales mengelola penjualan non-POS seperti catering, delivery, atau corporate orders. Berbeda dengan POS yang untuk transaksi langsung, Sales untuk order yang butuh proses lebih panjang.

## 📋 Fungsi Utama
- **Sales Order** - Order dari customer
- **Sales Invoice** - Tagihan ke customer
- **Sales Shipment** - Pengiriman barang
- **Sales Return** - Retur dari customer
- **Sales Payment** - Pembayaran dari customer

## 🔄 Alur Penjualan Standar

```
Sales Order → Shipment → Invoice → Payment
   (Order)     (Stok -)   (Piutang +)  (Piutang -)
```

## 🚀 Langkah 1: Sales Order

### 1.1 Kapan Menggunakan Sales Order
- **Catering orders** untuk acara/event
- **Corporate lunch** untuk kantor
- **Bulk orders** dalam jumlah besar
- **Pre-orders** yang butuh persiapan khusus
- **Delivery orders** yang dijadwalkan

### 1.2 Buat Sales Order
1. **Navigasi**: Sales → Sales Orders
2. **Klik "Create New Order"**

### 1.3 Isi Header Order
```
Order Number: SO-2024-001 (auto generate)
Customer: PT. Catering Nusantara
Order Date: (tanggal order)
Delivery Date: (tanggal kirim)
Delivery Address: Jl. Sudirman No. 100, Jakarta
Salesperson: Budi (staff sales)
Payment Terms: Net 14
Status: Draft
Notes: Catering meeting bulanan
```

### 1.4 Tambah Items ke Order
**Klik "Add Item"** dan isi:

| No | Product | Qty | Unit | Price | Discount | Total |
|----|---------|-----|------|-------|----------|-------|
| 1 | Nasi Gudeg | 50 | PRS | 25.000 | 5% | 1.187.500 |
| 2 | Ayam Bakar | 50 | PRS | 30.000 | 5% | 1.425.000 |
| 3 | Es Teh Manis | 50 | PRS | 8.000 | 0% | 400.000 |
| 4 | Kemasan Takeaway | 50 | PCS | 2.000 | 0% | 100.000 |

**Subtotal**: Rp 3.112.500
**Delivery Fee**: Rp 50.000
**Total**: Rp 3.162.500

### 1.5 Submit & Approve Order
1. **Review semua data**
2. **Klik "Submit"** - Status berubah ke "Submitted"
3. **Manager approve** - Status berubah ke "Approved"
4. **Send confirmation** ke customer

## 📦 Langkah 2: Sales Shipment

### 2.1 Persiapan Shipment
1. **Navigasi**: Sales → Shipments
2. **Klik "Create New Shipment"**
3. **Pilih Sales Order**: SO-2024-001

### 2.2 Production Planning
**Sebelum shipment, pastikan produksi selesai**:

| Product | Order Qty | Available Stock | Need Production |
|---------|-----------|-----------------|------------------|
| Nasi Gudeg | 50 PRS | 10 PRS | 40 PRS |
| Ayam Bakar | 50 PRS | 5 PRS | 45 PRS |
| Es Teh Manis | 50 PRS | 0 PRS | 50 PRS |

**Buat Production Order** untuk items yang kurang stock.

### 2.3 Process Shipment
```
Shipment Number: SH-2024-001
Shipment Date: (tanggal kirim)
Delivery Method: Company Vehicle
Driver: Pak Joko
Vehicle: B 1234 CD
Estimated Arrival: 11:00 AM
```

**Items to Ship**:
| Product | Order Qty | Ship Qty | Notes |
|---------|-----------|----------|-------|
| Nasi Gudeg | 50 | 50 | Siap kirim |
| Ayam Bakar | 50 | 50 | Siap kirim |
| Es Teh Manis | 50 | 50 | Siap kirim |
| Kemasan | 50 | 50 | Siap kirim |

### 2.4 Confirm Shipment
1. **Klik "Process Shipment"**
2. **Print delivery note** untuk driver
3. **Update tracking** untuk customer
4. **Stock berkurang otomatis**

### 2.5 Delivery Confirmation
1. **Driver konfirmasi** setelah sampai
2. **Customer sign** delivery note
3. **Update status** ke "Delivered"
4. **Upload proof of delivery** (foto/signature)

## 📜 Langkah 3: Sales Invoice

### 3.1 Buat Invoice dari Shipment
1. **Buka Shipment yang delivered**
2. **Klik "Create Invoice"**

### 3.2 Isi Data Invoice
```
Invoice Number: INV-2024-001 (auto generate)
Invoice Date: (tanggal invoice)
Due Date: (14 hari dari invoice date)
Customer: PT. Catering Nusantara
Reference: SO-2024-001
PO Customer: PO-CATERING-001 (jika ada)
```

**Items otomatis terisi dari shipment**:
| Product | Qty | Price | Discount | Total |
|---------|-----|-------|----------|-------|
| Nasi Gudeg | 50 | 25.000 | 5% | 1.187.500 |
| Ayam Bakar | 50 | 30.000 | 5% | 1.425.000 |
| Es Teh Manis | 50 | 8.000 | 0% | 400.000 |
| Kemasan | 50 | 2.000 | 0% | 100.000 |
| Delivery Fee | 1 | 50.000 | 0% | 50.000 |

**Subtotal**: Rp 3.162.500
**PPN 11%**: Rp 347.875
**Total**: Rp 3.510.375

### 3.3 Post Invoice
1. **Review semua data**
2. **Klik "Post Invoice"**
3. **Send invoice** ke customer (email/WhatsApp)
4. **Jurnal otomatis**:
   - Debit: Piutang Dagang Rp 3.510.375
   - Kredit: Penjualan Makanan Rp 3.162.500
   - Kredit: PPN Keluaran Rp 347.875

### 3.4 Kirim Invoice via WhatsApp (MVP)
Di halaman detail/edit Sales Invoice, gunakan tombol **Kirim WA** untuk komunikasi cepat ke customer:

1. Pastikan contact invoice punya nomor telepon valid.
2. Klik **Kirim WA** di header action Sales Invoice.
3. Sistem akan membuka WhatsApp dengan pesan siap kirim yang berisi:
   - nomor invoice,
   - total invoice,
   - sisa tagihan,
   - link **PDF Invoice**,
   - link **Nota POS** (sebagai referensi transaksi).

Catatan:
- Fitur ini fokus untuk komunikasi operasional (info invoice/tagihan), bukan campaign promo.
- Jika nomor telepon kosong/tidak valid, sistem menampilkan warning dan WA tidak dibuka.

## 💰 Langkah 4: Sales Payment

### 4.1 Receive Payment
1. **Navigasi**: Sales → Payments
2. **Klik "Create New Payment"**

### 4.2 Input Payment Details
```
Customer: PT. Catering Nusantara
Payment Date: (tanggal terima bayar)
Payment Method: Bank Transfer
Bank Account: Bank BCA
Reference: TRF-CATERING-001
Amount: Rp 3.510.375
```

### 4.3 Apply Payment to Invoices
**Outstanding Invoices**:
| Invoice | Date | Due Date | Amount | Pay |
|---------|------|----------|--------|-----|
| INV-2024-001 | 13/05/2024 | 27/05/2024 | 3.510.375 | ✓ |

### 4.4 Process Payment
1. **Centang invoice yang dibayar**
2. **Klik "Process Payment"**
3. **Jurnal otomatis**:
   - Debit: Bank BCA Rp 3.510.375
   - Kredit: Piutang Dagang Rp 3.510.375

## 🔄 Sales Return

### 4.1 Kapan Terjadi Return
- **Produk rusak** saat delivery
- **Salah order** dari kitchen
- **Customer tidak puas** dengan kualitas
- **Kelebihan quantity** yang dipesan

### 4.2 Process Return
1. **Navigasi**: Sales → Returns
2. **Klik "Create New Return"**
3. **Pilih Invoice** yang akan diretur

### 4.3 Input Return Details
```
Return Number: SR-2024-001
Return Date: (tanggal return)
Customer: PT. Catering Nusantara
Reason: Produk rusak saat delivery
Return Type: Credit Note (potong invoice berikutnya)
```

**Items to Return**:
| Product | Invoiced | Return Qty | Reason |
|---------|----------|------------|--------|
| Nasi Gudeg | 50 PRS | 5 PRS | Kemasan bocor |

**Return Value**: Rp 125.000

### 4.4 Process Return
1. **Klik "Process Return"**
2. **Credit note** dibuat otomatis
3. **Adjust inventory** jika barang bisa dipakai
4. **Jurnal adjustment**:
   - Debit: Sales Return Rp 125.000
   - Kredit: Piutang Dagang Rp 125.000

## 📋 Laporan Sales

### 1. Sales Summary Report
**Navigasi**: Reports → Sales → Summary

**Filter**:
- Period: Bulan ini
- Customer: Semua
- Salesperson: Semua

**Output**:
- Total Orders
- Total Invoiced
- Total Collected
- Outstanding Receivables
- Average Order Value

### 2. Customer Analysis
**Navigasi**: Reports → Sales → Customer Analysis

**Metrics**:
- Top customers by value
- Customer payment behavior
- Repeat order frequency
- Customer lifetime value

### 3. Product Performance
**Navigasi**: Reports → Sales → Product Performance

**Analysis**:
- Best selling products
- Product profitability
- Seasonal trends
- Return rates by product

### 4. Salesperson Performance
**Navigasi**: Reports → Sales → Salesperson Report

**KPIs**:
- Sales target vs actual
- Number of orders
- Average deal size
- Customer acquisition

## 📱 Integration dengan POS

### Perbedaan Sales vs POS

| Aspect | Sales Module | POS Module |
|--------|--------------|------------|
| **Use Case** | B2B, Catering, Bulk | B2C, Dine-in, Takeaway |
| **Process** | Order → Ship → Invoice | Direct payment |
| **Payment** | Credit terms | Immediate |
| **Documentation** | Formal invoice | Receipt |
| **Approval** | May need approval | Direct process |

### Kapan Menggunakan Masing-Masing

**Gunakan Sales Module untuk**:
- Corporate catering orders
- Event catering
- Bulk orders > 20 portions
- Credit customers
- Scheduled deliveries

**Gunakan POS Module untuk**:
- Walk-in customers
- Dine-in orders
- Takeaway orders
- Cash transactions
- Immediate service

## ⚙️ Settings & Configuration

### Document Numbering
1. **Navigasi**: Admin → Settings → Document Numbering
2. **Setup format**:
   - **Sales Order**: SO-{YYYY}-{####}
   - **Shipment**: SH-{YYYY}-{####}
   - **Invoice**: INV-{YYYY}-{####}
   - **Payment**: PAY-{YYYY}-{####}

### Credit Limits
1. **Navigasi**: Contacts → Customers
2. **Set credit limit** per customer
3. **Payment terms** default
4. **Credit hold** jika overdue

### Pricing Rules
1. **Navigasi**: Sales → Price Lists
2. **Customer-specific pricing**
3. **Volume discounts**
4. **Seasonal pricing**

### Sales Team Setup
1. **Navigasi**: Admin → Users
2. **Assign salesperson** role
3. **Territory assignment**
4. **Commission structure**

## ✅ Quality Control

### Order Validation
- [ ] **Customer credit** tidak melebihi limit
- [ ] **Product availability** untuk delivery date
- [ ] **Pricing accuracy** sesuai price list
- [ ] **Delivery address** lengkap dan benar
- [ ] **Special requirements** tercatat jelas

### Shipment Validation
- [ ] **Production completed** sesuai order
- [ ] **Quality check** sebelum pack
- [ ] **Packaging proper** untuk delivery
- [ ] **Delivery note** lengkap dan akurat
- [ ] **Driver briefing** tentang delivery

### Invoice Validation
- [ ] **Amount accuracy** sesuai order
- [ ] **Tax calculation** benar
- [ ] **Customer PO** reference included
- [ ] **Payment terms** sesuai agreement
- [ ] **Contact details** untuk payment

## 🚑 Troubleshooting

### Masalah Umum & Solusi

**1. Order tidak bisa di-approve**
- **Penyebab**: Customer credit limit exceeded
- **Solusi**: Increase credit limit atau collect outstanding

**2. Shipment error saat process**
- **Penyebab**: Insufficient stock
- **Solusi**: Complete production atau adjust order quantity

**3. Invoice amount tidak sesuai**
- **Penyebab**: Price changes atau additional charges
- **Solusi**: Adjust pricing atau create separate invoice

**4. Payment tidak ter-apply ke invoice**
- **Penyebab**: Currency mismatch atau amount difference
- **Solusi**: Check currency dan exact amount matching

### Error Messages

**"Credit limit exceeded"**
- Customer order melebihi credit limit
- Review customer credit standing

**"Insufficient stock for shipment"**
- Stock tidak cukup untuk fulfill order
- Complete production atau adjust quantity

**"Invoice already paid"**
- Invoice sudah lunas
- Check payment history

## 📊 Best Practices

### Customer Relationship
1. **Maintain customer database** yang akurat
2. **Regular communication** untuk repeat orders
3. **Feedback collection** untuk improvement
4. **Loyalty programs** untuk retention
5. **Credit management** yang ketat

### Order Management
1. **Confirm orders** dalam 24 jam
2. **Production planning** yang realistic
3. **Quality control** sebelum shipment
4. **Delivery tracking** real-time
5. **Follow up** setelah delivery

### Financial Management
1. **Credit terms** yang jelas
2. **Invoice promptly** setelah delivery
3. **Follow up** overdue accounts
4. **Cash flow** monitoring
5. **Bad debt** provision

### Performance Monitoring
1. **Sales targets** yang achievable
2. **KPI tracking** regular
3. **Customer satisfaction** surveys
4. **Profitability analysis** per order
5. **Market trend** analysis
