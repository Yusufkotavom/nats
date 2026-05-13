---
title: Modul Purchase
module: purchase
order: 130
updatedAt: 2026-05-13
summary: Panduan lengkap proses pembelian dari PO sampai pembayaran dengan contoh praktis.
related: modules/inventory,modules/cash-bank,modules/accounting
---

# Modul Purchase

## 🎯 Tujuan
Modul Purchase mengelola seluruh proses pembelian dari supplier, mulai dari order sampai pembayaran. Sistem ini memastikan stok terupdate otomatis dan jurnal akuntansi tercatat dengan benar.

## 📋 Fungsi Utama
- **Purchase Order (PO)** - Order pembelian ke supplier
- **Receive** - Penerimaan barang dari supplier
- **Invoice** - Tagihan dari supplier
- **Return** - Retur barang ke supplier
- **Payment** - Pembayaran ke supplier
- **Quick Purchase** - Pembelian cepat untuk transaksi harian

## 🔄 Alur Pembelian Standar

```
Purchase Order → Receive → Invoice → Payment
     (Order)      (Stok +)   (Hutang +)  (Hutang -)
```

## 🚀 Langkah 1: Purchase Order (PO)

### 1.1 Buat Purchase Order
1. **Navigasi**: Purchase → Purchase Orders
2. **Klik "Create New PO"**

### 1.2 Isi Header PO
```
PO Number: PO-2024-001 (auto generate)
Vendor: Toko Beras Pak Budi
PO Date: (tanggal hari ini)
Expected Date: (tanggal dibutuhkan)
Warehouse: Gudang Utama
Payment Terms: Net 30
Status: Draft
Notes: Pembelian rutin bulanan
```

### 1.3 Tambah Items ke PO
**Klik "Add Item"** dan isi:

| No | Product | Qty | Unit | Price | Total |
|----|---------|-----|------|-------|-------|
| 1 | Beras Premium 5KG | 10 | DUS | 275.000 | 2.750.000 |
| 2 | Minyak Goreng 2L | 5 | BTL | 24.000 | 120.000 |
| 3 | Gula Pasir 1KG | 20 | PCS | 15.000 | 300.000 |

**Total PO**: Rp 3.170.000

### 1.4 Submit PO
1. **Review semua data**
2. **Klik "Submit"** - Status berubah ke "Submitted"
3. **Klik "Send to Vendor"** (opsional) - Kirim PO via email

### 1.5 Approve PO
1. **Login sebagai Manager/Approver**
2. **Buka PO yang submitted**
3. **Klik "Approve"** - Status berubah ke "Approved"

## 📦 Langkah 2: Receive (Penerimaan Barang)

### 2.1 Akses Receive
1. **Navigasi**: Purchase → Receives
2. **Klik "Create New Receive"**
3. **Pilih PO**: PO-2024-001

### 2.2 Input Penerimaan
**Sistem akan load items dari PO**:

| Product | PO Qty | Received | Remaining | Notes |
|---------|--------|----------|-----------|-------|
| Beras Premium | 10 DUS | 10 DUS | 0 | Kondisi baik |
| Minyak Goreng | 5 BTL | 5 BTL | 0 | Kondisi baik |
| Gula Pasir | 20 PCS | 18 PCS | 2 | 2 pcs rusak kemasan |

### 2.3 Proses Receive
1. **Isi Received Quantity** sesuai barang yang diterima
2. **Tambah Notes** jika ada masalah
3. **Klik "Process Receive"**

### 2.4 Verifikasi Stock Movement
- **Cek Inventory**: Stok bertambah otomatis
- **Beras**: +50 KG (10 DUS x 5 KG)
- **Minyak**: +10 L (5 BTL x 2 L)
- **Gula**: +18 KG (18 PCS x 1 KG)

## 📜 Langkah 3: Purchase Invoice

### 3.1 Buat Invoice dari Receive
1. **Buka Receive yang sudah diproses**
2. **Klik "Create Invoice"**

### 3.2 Isi Data Invoice
```
Invoice Number: INV-BUDI-001 (dari supplier)
Invoice Date: (tanggal invoice supplier)
Due Date: (tanggal jatuh tempo)
Vendor: Toko Beras Pak Budi
Reference: PO-2024-001
```

**Items otomatis terisi dari receive**:
| Product | Qty | Price | Total |
|---------|-----|-------|-------|
| Beras Premium | 10 DUS | 275.000 | 2.750.000 |
| Minyak Goreng | 5 BTL | 24.000 | 120.000 |
| Gula Pasir | 18 PCS | 15.000 | 270.000 |

**Subtotal**: Rp 3.140.000
**PPN 11%**: Rp 345.400
**Total**: Rp 3.485.400

### 3.3 Post Invoice
1. **Review semua data**
2. **Klik "Post Invoice"**
3. **Jurnal otomatis**:
   - Debit: Persediaan Bahan Baku Rp 3.140.000
   - Debit: PPN Masukan Rp 345.400
   - Kredit: Hutang Dagang Rp 3.485.400

## 💰 Langkah 4: Payment (Pembayaran)

### 4.1 Buat Payment
1. **Navigasi**: Purchase → Payments
2. **Klik "Create New Payment"**

### 4.2 Pilih Invoice untuk Dibayar
```
Vendor: Toko Beras Pak Budi
Payment Date: (tanggal bayar)
Payment Method: Bank Transfer
Bank Account: Bank BCA
Reference: TRF-001
```

**Outstanding Invoices**:
| Invoice | Date | Due Date | Amount | Pay |
|---------|------|----------|--------|-----|
| INV-BUDI-001 | 13/05/2024 | 12/06/2024 | 3.485.400 | ✓ |

### 4.3 Process Payment
1. **Centang invoice yang dibayar**
2. **Input Payment Amount**: Rp 3.485.400
3. **Klik "Process Payment"**
4. **Jurnal otomatis**:
   - Debit: Hutang Dagang Rp 3.485.400
   - Kredit: Bank BCA Rp 3.485.400

## ⚡ Quick Purchase (Pembelian Cepat)

### Kapan Menggunakan Quick Purchase
- Pembelian harian/mingguan rutin
- Supplier yang sudah terpercaya
- Barang langsung diterima dan dibayar
- Tidak perlu approval khusus

### Mode Quick Purchase

#### Mode 1: Cash Daily
**Untuk**: Pembelian tunai harian
**Proses**: Receive → Invoice → Payment (otomatis)

1. **Navigasi**: Purchase → Quick Purchase
2. **Pilih Mode**: Cash Daily
3. **Isi data**:
```
Vendor: Pasar Sayur Segar
Date: (hari ini)
Warehouse: Gudang Utama
Payment Method: Cash
Cash Account: Kas Toko
```

4. **Add Items**:
| Product | Qty | Unit | Price | Total |
|---------|-----|------|-------|-------|
| Bawang Merah | 5 | KG | 25.000 | 125.000 |
| Cabai Merah | 2 | KG | 45.000 | 90.000 |
| Tomat | 3 | KG | 15.000 | 45.000 |

**Total**: Rp 260.000

5. **Klik "Process"** - Semua dokumen dibuat otomatis

#### Mode 2: Monthly Credit
**Untuk**: Pembelian kredit bulanan
**Proses**: Receive → Invoice (payment nanti)

```
Mode: Monthly Credit
Vendor: Supplier Daging Segar
Payment Terms: Net 30
(Payment akan dibuat terpisah nanti)
```

#### Mode 3: Preorder DP
**Untuk**: Pembelian dengan uang muka
**Proses**: Receive → Invoice → Partial Payment

```
Mode: Preorder DP
DP Amount: 50% dari total
Remaining: Akan dibayar saat delivery
```

## 🔄 Return (Retur Barang)

### Kapan Melakukan Return
- Barang rusak/cacat
- Salah kirim dari supplier
- Kelebihan quantity
- Expired/mendekati expired

### Proses Return

1. **Navigasi**: Purchase → Returns
2. **Klik "Create New Return"**
3. **Pilih Receive** yang akan diretur
4. **Isi items return**:

| Product | Received | Return Qty | Reason |
|---------|----------|------------|--------|
| Gula Pasir | 20 PCS | 2 PCS | Kemasan rusak |

5. **Process Return**:
   - Stok berkurang: Gula -2 KG
   - Hutang berkurang: -Rp 30.000
   - Return note dikirim ke supplier

## 📋 Laporan Purchase

### 1. Purchase Summary Report
**Navigasi**: Reports → Purchase → Summary

**Filter**:
- Period: Bulan ini
- Vendor: Semua
- Status: All

**Output**:
- Total PO Amount
- Total Received
- Total Invoiced
- Total Paid
- Outstanding Payables

### 2. Vendor Performance Report
**Navigasi**: Reports → Purchase → Vendor Performance

**Metrics**:
- On-time delivery rate
- Quality score (return rate)
- Payment terms compliance
- Average order value

### 3. Purchase Analysis
**Navigasi**: Reports → Purchase → Analysis

**Analysis**:
- Top products by value
- Top vendors by volume
- Price trend analysis
- Seasonal purchase patterns

## ⚙️ Settings & Configuration

### Document Numbering
1. **Navigasi**: Admin → Settings → Document Numbering
2. **Setup format**:
   - **PO**: PO-{YYYY}-{####}
   - **Receive**: RCV-{YYYY}-{####}
   - **Invoice**: PINV-{YYYY}-{####}
   - **Payment**: PAY-{YYYY}-{####}

### Approval Workflow
1. **Navigasi**: Admin → Settings → Approval Rules
2. **Setup rules**:
   - PO > Rp 1.000.000 butuh approval Manager
   - PO > Rp 5.000.000 butuh approval Owner
   - Payment > Rp 2.000.000 butuh dual approval

### Default Accounts
1. **Navigasi**: Admin → Settings → Default Accounts
2. **Mapping akun**:
   - **Purchase**: 5100 - Persediaan Bahan Baku
   - **PPN Input**: 1180 - PPN Masukan
   - **Accounts Payable**: 2100 - Hutang Dagang

## ✅ Validasi & Quality Control

### Checklist Setiap Transaksi
- [ ] **PO**: Vendor, items, prices, terms sudah benar
- [ ] **Receive**: Quantity sesuai fisik, kondisi barang OK
- [ ] **Invoice**: Nomor, tanggal, amount sesuai supplier
- [ ] **Payment**: Method, account, amount sudah benar
- [ ] **Stock**: Movement tercatat di inventory
- [ ] **Journal**: Posting akuntansi sudah benar

### Monthly Reconciliation
- [ ] **Outstanding PO**: Review PO yang belum complete
- [ ] **Pending Receives**: Follow up barang yang belum datang
- [ ] **Unpaid Invoices**: Cek invoice yang belum dibayar
- [ ] **Vendor Statements**: Cocokkan dengan statement supplier
- [ ] **Stock Variance**: Investigasi selisih stok vs sistem

## 🚑 Troubleshooting

### Masalah Umum & Solusi

**1. PO tidak bisa di-approve**
- **Penyebab**: User tidak punya permission atau amount melebihi limit
- **Solusi**: Cek role permission atau minta approval level lebih tinggi

**2. Receive error saat process**
- **Penyebab**: Warehouse tidak aktif atau product tidak ada
- **Solusi**: Verifikasi master data warehouse dan product

**3. Stock tidak bertambah setelah receive**
- **Penyebab**: Product setting "Track Inventory" = No
- **Solusi**: Edit product, set "Track Inventory" = Yes

**4. Invoice amount tidak sesuai PO**
- **Penyebab**: Harga berubah atau ada additional charges
- **Solusi**: Adjust invoice amount atau buat separate invoice

**5. Payment tidak bisa diproses**
- **Penyebab**: Insufficient balance atau account tidak aktif
- **Solusi**: Cek saldo account atau aktifkan account

### Error Messages

**"Insufficient stock for return"**
- Return quantity melebihi available stock
- Cek stock balance di inventory

**"PO already fully received"**
- Semua items PO sudah diterima
- Buat receive baru atau adjust PO

**"Invoice already paid"**
- Invoice sudah lunas
- Cek payment history

## 📊 Best Practices

### Vendor Management
1. **Maintain vendor database** yang akurat
2. **Negotiate payment terms** yang menguntungkan
3. **Monitor vendor performance** secara berkala
4. **Diversify suppliers** untuk mengurangi risiko
5. **Build good relationships** dengan key suppliers

### Purchase Planning
1. **Forecast demand** berdasarkan historical data
2. **Set reorder points** untuk automatic alerts
3. **Bulk purchase** untuk discount tapi perhatikan cash flow
4. **Seasonal planning** untuk items musiman
5. **Emergency suppliers** untuk situasi urgent

### Cost Control
1. **Compare prices** dari multiple suppliers
2. **Monitor price trends** dan market conditions
3. **Negotiate volume discounts** untuk regular items
4. **Track purchase variance** vs budget
5. **Regular cost analysis** untuk optimization

### Process Efficiency
1. **Standardize procedures** untuk consistency
2. **Use quick purchase** untuk routine items
3. **Automate approvals** dengan proper limits
4. **Digital documentation** untuk audit trail
5. **Regular training** untuk purchase team
