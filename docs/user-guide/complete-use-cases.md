---
title: Panduan Use Case Lengkap
module: general
order: 40
updatedAt: 2026-05-13
summary: Skenario lengkap penggunaan sistem dari setup sampai operasional harian.
related: 01-setup-awal,02-master-data,03-operasional-harian,quick-daily-operations
---

# Panduan Use Case Lengkap

## 🎯 Tujuan
Panduan ini memberikan skenario lengkap penggunaan sistem restoran dari setup awal sampai operasional harian dengan contoh nyata dan step-by-step detail.

## 📋 Skenario: Restoran "Warung Nusantara"

### Profil Bisnis
- **Nama**: Warung Nusantara
- **Jenis**: Restoran Indonesia casual dining
- **Kapasitas**: 50 seats, 15 meja
- **Menu**: Nasi gudeg, ayam bakar, soto ayam, minuman tradisional
- **Operasional**: 10:00 - 22:00, 7 hari seminggu
- **Staff**: 1 owner, 2 kasir, 3 kitchen staff, 2 waiters

## 🚀 Use Case 1: Setup Awal Restoran

### Langkah 1: Login & Company Setup
```
Scenario: Owner pertama kali setup sistem
Given: Sistem baru terinstall
When: Owner login pertama kali
Then: Setup company profile dan basic settings
```

**Detailed Steps:**
1. **Login dengan akun default**
   - URL: https://warung-nusantara.sistem.com
   - Username: admin
   - Password: admin123 (ganti segera)

2. **Setup Company Profile**
   - Company Name: Warung Nusantara
   - Address: Jl. Malioboro No. 15, Yogyakarta
   - Phone: 0274-123456
   - Email: info@warungnusantara.com
   - NPWP: 12.345.678.9-123.000

3. **System Settings**
   - Currency: IDR
   - Timezone: Asia/Jakarta
   - Date Format: DD/MM/YYYY

### Langkah 2: User Management
```
Scenario: Buat akun untuk semua staff
Given: Company profile sudah setup
When: Owner buat user accounts
Then: Setiap staff punya akun sesuai role
```

**Create Users:**
1. **Manager (Owner)**
   - Username: owner_budi
   - Role: Manager (full access)
   - Email: budi@warungnusantara.com

2. **Kasir 1**
   - Username: kasir_sari
   - Role: Kasir (POS, sales view)
   - Email: sari@warungnusantara.com

3. **Kasir 2**
   - Username: kasir_andi
   - Role: Kasir
   - Email: andi@warungnusantara.com

4. **Chef**
   - Username: chef_joko
   - Role: Kitchen (production, inventory view)
   - Email: joko@warungnusantara.com

### Langkah 3: Master Data Setup
```
Scenario: Input semua master data yang dibutuhkan
Given: Users sudah dibuat
When: Input products, categories, BOM
Then: Sistem siap untuk transaksi
```

**Categories:**
- Makanan Utama
- Minuman
- Bahan Pokok
- Protein
- Sayuran
- Bumbu & Rempah

**Products (Bahan Baku):**
- Beras Gudeg (5KG/dus) - Rp 275.000/dus
- Daging Ayam Kampung (1KG) - Rp 45.000/kg
- Santan Kelapa (1L) - Rp 15.000/L
- Gula Jawa (500GR) - Rp 12.000/pack

**Products (Menu):**
- Nasi Gudeg Komplit - Rp 28.000
- Ayam Bakar Bumbu Kecap - Rp 32.000
- Soto Ayam Kampung - Rp 25.000
- Es Teh Manis - Rp 8.000

## 🍽️ Use Case 2: Operasional Harian

### Skenario Pagi: Persiapan Operasional
```
Time: 08:00 AM
Actor: Chef Joko
Goal: Persiapan bahan dan produksi untuk hari ini
```

**Step 1: Stock Check**
1. **Login sebagai chef_joko**
2. **Navigasi**: Inventory → Stock Report
3. **Check stock bahan kritis**:
   - Beras Gudeg: 15 KG (cukup untuk 100 porsi)
   - Daging Ayam: 8 KG (cukup untuk 160 porsi)
   - Santan: 5 L (cukup untuk 50 porsi) ⚠️ **PERLU BELI**

**Step 2: Purchase Bahan Kurang**
1. **Navigasi**: Purchase → Quick Purchase
2. **Mode**: Cash Daily
3. **Vendor**: Pasar Beringharjo
4. **Items**:
   - Santan Kelapa: 10 L @ Rp 15.000 = Rp 150.000
   - Sayuran segar: Rp 75.000
   - **Total**: Rp 225.000
5. **Payment**: Cash dari kas toko
6. **Process** → Stock otomatis bertambah

**Step 3: Production Planning**
1. **Navigasi**: Production → Production Orders
2. **Buat production order**:
   - **Product**: Nasi Gudeg Komplit
   - **Quantity**: 30 porsi (estimasi lunch)
   - **Planned Date**: Hari ini 11:00 AM
3. **Release order** untuk kitchen

### Skenario Siang: Operasional POS
```
Time: 12:00 PM (Lunch Rush)
Actor: Kasir Sari
Goal: Melayani customer dine-in dan takeaway
```

**Customer 1: Dine-in Family (Meja 5)**
1. **Login sebagai kasir_sari**
2. **Navigasi**: POS
3. **Buka POS Session**:
   - Opening Cash: Rp 500.000
   - Warehouse: Gudang Utama
4. **Pilih Dining Spot**: Meja 5
5. **Klik "Buka Meja"**
6. **Add items ke cart**:
   - Nasi Gudeg Komplit x 2 = Rp 56.000
   - Ayam Bakar x 1 = Rp 32.000
   - Es Teh Manis x 3 = Rp 24.000
   - **Subtotal**: Rp 112.000
7. **Apply discount**: Member 10% = Rp 11.200
8. **Total**: Rp 100.800
9. **Payment Method**: Cash Rp 105.000
10. **Change**: Rp 4.200
11. **Process Payment**
12. **Print receipt** untuk customer
13. **Send order** ke kitchen display

**Customer 2: Takeaway (Walk-in)**
1. **Pilih Dining Spot**: Takeaway Counter
2. **Add items**:
   - Soto Ayam x 2 = Rp 50.000
   - Es Teh Manis x 2 = Rp 16.000
   - **Total**: Rp 66.000
3. **Payment**: QRIS Rp 66.000
4. **Process & print receipt**

**Customer 3: Hold Order (Belum Bayar)**
1. **Add items**:
   - Nasi Gudeg x 1 = Rp 28.000
   - Ayam Bakar x 1 = Rp 32.000
2. **Customer belum ready bayar**
3. **Klik "Hold Order"**
4. **Input customer name**: "Pak Ahmad"
5. **Order tersimpan** untuk dilanjutkan nanti

### Skenario Sore: Resume Order & Tutup Meja
```
Time: 02:00 PM
Actor: Kasir Sari
Goal: Lanjutkan held order dan tutup meja yang selesai
```

**Resume Held Order**
1. **Klik "Held Orders"**
2. **Pilih order "Pak Ahmad"**
3. **Resume order** → Cart terisi kembali
4. **Total**: Rp 60.000
5. **Payment**: Cash Rp 60.000
6. **Process payment**

**Tutup Meja 5**
1. **Pilih Dining Spot**: Meja 5
2. **Status**: Currently "Billing"
3. **Klik "Tutup Meja"**
4. **Meja status** kembali "Available"

### Skenario Malam: Tutup Operasional
```
Time: 10:00 PM
Actor: Kasir Sari
Goal: Tutup POS session dan reconcile kas
```

**Close POS Session**
1. **Klik "Close Session"**
2. **Hitung kas fisik**: Rp 1.245.000
3. **System expected**: Rp 1.250.000
4. **Variance**: -Rp 5.000 (kurang)
5. **Input actual cash**: Rp 1.245.000
6. **Add note**: "Kembalian lebih Rp 5.000"
7. **Close session**

**Daily Reports**
1. **Print laporan harian**:
   - Sales Summary: Rp 2.150.000
   - Transaction Count: 45 orders
   - Average Transaction: Rp 47.778
   - Food Cost: 32% (target < 35%)
2. **Backup data** ke cloud storage

## 🛒 Use Case 3: Pembelian Bulanan

### Skenario: Purchase Order ke Supplier Utama
```
Time: Awal bulan
Actor: Owner Budi
Goal: Stock up bahan pokok untuk 1 bulan
```

**Step 1: Create Purchase Order**
1. **Login sebagai owner_budi**
2. **Navigasi**: Purchase → Purchase Orders
3. **Create New PO**:
   - **Vendor**: Toko Beras Pak Harto
   - **Expected Date**: 3 hari dari sekarang
   - **Payment Terms**: Net 30

**Step 2: Add Items**
| Product | Qty | Unit | Price | Total |
|---------|-----|------|-------|-------|
| Beras Gudeg 5KG | 20 | DUS | 275.000 | 5.500.000 |
| Gula Jawa 500GR | 40 | PACK | 12.000 | 480.000 |
| Minyak Goreng 2L | 10 | BTL | 24.000 | 240.000 |

**Total PO**: Rp 6.220.000

**Step 3: Approval Process**
1. **Submit PO** → Status: Submitted
2. **Owner approve** → Status: Approved
3. **Send PO** ke vendor via email

**Step 4: Receive Goods**
1. **3 hari kemudian**: Barang datang
2. **Create Receive** dari PO
3. **Check quantity**:
   - Beras: 20 dus ✓
   - Gula Jawa: 38 pack (2 pack rusak)
   - Minyak: 10 botol ✓
4. **Process receive** → Stock bertambah otomatis

**Step 5: Process Invoice**
1. **Vendor kirim invoice**: INV-HARTO-001
2. **Create invoice** dari receive
3. **Adjust amount** untuk gula yang rusak: -Rp 24.000
4. **Final amount**: Rp 6.196.000
5. **Post invoice** → Hutang bertambah

**Step 6: Payment (30 hari kemudian)**
1. **Navigasi**: Purchase → Payments
2. **Create payment**:
   - **Method**: Bank Transfer
   - **Account**: Bank BCA
   - **Amount**: Rp 6.196.000
3. **Process payment** → Hutang lunas

## 🎂 Use Case 4: Catering Order Besar

### Skenario: Corporate Catering 100 Pax
```
Customer: PT. Teknologi Nusantara
Event: Monthly meeting
Quantity: 100 pax
Delivery: Besok jam 12:00
```

**Step 1: Sales Order**
1. **Login sebagai owner_budi**
2. **Navigasi**: Sales → Sales Orders
3. **Create order**:
   - **Customer**: PT. Teknologi Nusantara
   - **Delivery Date**: Besok 12:00
   - **Delivery Address**: Jl. Sudirman No. 50

**Step 2: Menu Planning**
| Menu | Qty | Price | Total |
|------|-----|-------|-------|
| Nasi Gudeg Box | 100 | 25.000 | 2.500.000 |
| Ayam Bakar Box | 100 | 30.000 | 3.000.000 |
| Es Teh Botol | 100 | 6.000 | 600.000 |
| Box Packaging | 100 | 3.000 | 300.000 |

**Subtotal**: Rp 6.400.000
**Discount 5%**: Rp 320.000
**Delivery Fee**: Rp 100.000
**Total**: Rp 6.180.000

**Step 3: Production Planning**
1. **Check material availability**:
   - Beras: Need 15 KG (available 25 KG) ✓
   - Ayam: Need 10 KG (available 8 KG) ❌
   - Santan: Need 8 L (available 5 L) ❌

2. **Emergency purchase**:
   - Daging Ayam: 5 KG @ Rp 45.000 = Rp 225.000
   - Santan: 5 L @ Rp 15.000 = Rp 75.000

3. **Create production orders**:
   - Nasi Gudeg: 100 porsi
   - Ayam Bakar: 100 porsi
   - Es Teh: 100 botol

**Step 4: Production Execution**
1. **Hari H-1 sore**: Start prep
   - Marinasi ayam: 3 jam
   - Prep bumbu gudeg: 2 jam
   - Setup packaging area

2. **Hari H pagi 06:00**: Start cooking
   - Masak gudeg: 4 jam
   - Bakar ayam: 2 jam batch
   - Siapkan es teh: 1 jam

3. **Hari H 10:00**: Packaging
   - Pack nasi gudeg + ayam per box
   - Label setiap box
   - Load ke delivery vehicle

**Step 5: Delivery & Invoice**
1. **11:30 AM**: Berangkat delivery
2. **12:00 PM**: Sampai lokasi customer
3. **Customer confirm** quantity dan quality OK
4. **Create shipment** di sistem
5. **Create invoice** dari shipment
6. **Send invoice** ke customer finance

**Step 6: Payment Follow-up**
1. **Payment terms**: Net 14 days
2. **Day 7**: Follow up via WhatsApp
3. **Day 14**: Payment received Rp 6.180.000
4. **Process payment** di sistem

## 📊 Use Case 5: Monthly Reporting

### Skenario: Laporan Bulanan untuk Owner
```
Time: Akhir bulan
Actor: Owner Budi
Goal: Review performa bisnis bulan ini
```

**Step 1: Sales Performance**
1. **Navigasi**: Reports → Sales → Summary
2. **Filter**: Bulan ini
3. **Key Metrics**:
   - Total Sales: Rp 125.000.000
   - Transaction Count: 2.150 orders
   - Average Transaction: Rp 58.140
   - Growth vs last month: +12%

**Step 2: Food Cost Analysis**
1. **Navigasi**: Reports → Purchase → Analysis
2. **Food Cost Ratio**: 31.5%
   - Target: < 35% ✓
   - Best performing: Es Teh (18%)
   - Worst performing: Soto Ayam (38%)

**Step 3: Inventory Analysis**
1. **Navigasi**: Reports → Inventory → Movement
2. **Key Findings**:
   - Fast moving: Beras, Ayam, Santan
   - Slow moving: Bumbu khusus
   - Dead stock: Rp 150.000 (1.2% of inventory)

**Step 4: Financial Summary**
1. **Navigasi**: Reports → Accounting → P&L
2. **Profit & Loss**:
   - Revenue: Rp 125.000.000
   - COGS: Rp 39.375.000 (31.5%)
   - Gross Profit: Rp 85.625.000 (68.5%)
   - Operating Expenses: Rp 45.000.000
   - Net Profit: Rp 40.625.000 (32.5%)

**Step 5: Action Items**
1. **Menu Engineering**:
   - Review Soto Ayam recipe (high food cost)
   - Promote high-margin items
   - Consider price adjustment

2. **Inventory Optimization**:
   - Reduce slow-moving items
   - Negotiate better prices with suppliers
   - Implement FIFO more strictly

3. **Operational Improvements**:
   - Staff training for portion control
   - Waste reduction initiatives
   - Customer satisfaction survey

## ⚠️ Use Case 6: Troubleshooting Scenarios

### Scenario 1: System Down During Rush Hour
```
Problem: POS system tidak bisa akses database
Time: 12:30 PM (lunch rush)
Impact: Tidak bisa process payment
```

**Immediate Actions:**
1. **Switch to manual mode**:
   - Gunakan kalkulator + nota manual
   - Catat semua transaksi di buku backup
   - Inform customer tentang situasi

2. **Contact IT support**:
   - Call: 0800-1234-5678
   - WhatsApp: 081234567890
   - Email: support@sistempos.com

3. **Manual transaction log**:
   ```
   12:35 - Meja 3: Gudeg x2, Ayam x1, Teh x2 = Rp 88.000 (Cash)
   12:37 - Takeaway: Soto x1, Teh x1 = Rp 33.000 (QRIS)
   12:40 - Meja 7: Gudeg x3, Ayam x2, Teh x3 = Rp 148.000 (Cash)
   ```

4. **System recovery**:
   - 13:15: System back online
   - Input semua manual transactions
   - Reconcile cash dengan system
   - Continue normal operations

### Scenario 2: Stock Discrepancy
```
Problem: Physical stock tidak sesuai system
Item: Daging Ayam
System: 15 KG
Physical: 12 KG
Difference: -3 KG
```

**Investigation Steps:**
1. **Check recent transactions**:
   - Review purchase receipts: OK
   - Review production issues: OK
   - Review sales with BOM: Found issue

2. **Root cause analysis**:
   - Kitchen staff pakai extra ayam untuk catering
   - Tidak ada production order untuk extra usage
   - BOM quantity tidak diikuti strictly

3. **Corrective actions**:
   - Create stock adjustment: -3 KG
   - Retrain kitchen staff on BOM compliance
   - Implement daily stock check
   - Update procedures for extra usage

### Scenario 3: Customer Complaint
```
Problem: Customer komplain makanan tidak sesuai standar
Item: Nasi Gudeg terlalu asin
Time: 19:30 PM
Customer: Meja 12 (family with kids)
```

**Immediate Response:**
1. **Apologize to customer**:
   - Acknowledge the issue
   - Offer immediate replacement
   - Waive the charge for affected item

2. **Kitchen investigation**:
   - Check batch yang sama
   - Taste test remaining portions
   - Identify root cause: New staff error

3. **System documentation**:
   - Create sales return for affected item
   - Document complaint in customer notes
   - Update training records

4. **Follow-up actions**:
   - Call customer next day to ensure satisfaction
   - Offer discount for next visit
   - Implement additional quality checks

## 📚 Best Practices Summary

### Daily Operations
1. **Morning checklist** - Stock, equipment, staff briefing
2. **Hourly monitoring** - Sales, kitchen queue, customer satisfaction
3. **Evening reconciliation** - Cash, inventory, reports

### Weekly Reviews
1. **Performance metrics** - Sales, costs, efficiency
2. **Inventory management** - Stock levels, waste, ordering
3. **Staff feedback** - Training needs, process improvements

### Monthly Analysis
1. **Financial review** - P&L, cash flow, profitability
2. **Menu engineering** - Cost analysis, popularity, pricing
3. **Strategic planning** - Growth opportunities, investments

### Continuous Improvement
1. **Customer feedback** - Regular surveys, complaint analysis
2. **Staff training** - Skill development, system updates
3. **Process optimization** - Efficiency improvements, cost reduction
4. **Technology updates** - System upgrades, new features