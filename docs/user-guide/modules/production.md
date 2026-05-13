---
title: Modul Production
module: production
order: 160
updatedAt: 2026-05-13
summary: Panduan lengkap BOM, production order, dan manajemen produksi restoran.
related: modules/inventory,modules/pos
---

# Modul Production

## 🎯 Tujuan
Modul Production mengelola proses produksi makanan/minuman, mulai dari resep (BOM) sampai produksi massal. Untuk restoran, ini memastikan konsistensi resep dan akurasi cost calculation.

## 📋 Fungsi Utama
- **BOM (Bill of Materials)** - Resep standar menu
- **Production Order** - Order produksi untuk stok
- **Production Issue** - Pengeluaran bahan baku
- **Production Receipt** - Penerimaan produk jadi

## 🔄 Alur Produksi

```
BOM (Resep) → Production Order → Issue Bahan → Receipt Produk
   (Recipe)      (Plan)           (Bahan -)     (Produk +)
```

## 🍳 Langkah 1: BOM (Bill of Materials)

### 1.1 Apa itu BOM?
BOM adalah **resep digital** yang mencatat:
- Bahan apa saja yang dibutuhkan
- Berapa quantity masing-masing bahan
- Berapa cost per porsi
- Instruksi produksi (opsional)

### 1.2 Kapan Membuat BOM?
- **Menu baru** yang akan dijual
- **Resep berubah** karena improvement
- **Cost calculation** untuk pricing
- **Standardisasi** proses dapur

### 1.3 Buat BOM Baru
1. **Navigasi**: Production → BOM
2. **Klik "Create New BOM"**

### 1.4 Setup Header BOM
```
Product: Nasi Goreng Ayam
BOM Code: BOM-NGR-001 (auto generate)
Quantity: 1 PRS (output per batch)
Status: Draft
Effective Date: (tanggal mulai berlaku)
Expiry Date: (kosong = permanent)
Description: Resep standar nasi goreng ayam
Notes: Porsi standar untuk dine-in
```

### 1.5 Tambah Materials (Bahan)
**Klik "Add Material"** untuk setiap bahan:

| No | Material | Quantity | Unit | Cost/Unit | Total Cost | Notes |
|----|----------|----------|------|-----------|------------|-------|
| 1 | Beras Premium | 150 | GR | 60 | 9.000 | Nasi matang ~300gr |
| 2 | Daging Ayam Fillet | 80 | GR | 35 | 2.800 | Potong dadu 1cm |
| 3 | Telur Ayam | 1 | PCS | 2.500 | 2.500 | Kocok lepas |
| 4 | Minyak Goreng | 15 | ML | 12 | 180 | Untuk menumis |
| 5 | Bawang Merah | 8 | GR | 25 | 200 | Iris tipis |
| 6 | Bawang Putih | 5 | GR | 30 | 150 | Cincang halus |
| 7 | Kecap Manis | 12 | ML | 15 | 180 | Sesuai selera |
| 8 | Garam | 2 | GR | 5 | 10 | Secukupnya |
| 9 | Merica Bubuk | 1 | GR | 50 | 50 | Secukupnya |

**Total Material Cost**: Rp 15.070
**Labor Cost** (20%): Rp 3.014
**Overhead Cost** (10%): Rp 1.507
**Total Production Cost**: Rp 19.591

### 1.6 Tambah Production Steps (Opsional)
**Untuk standardisasi proses**:

```
Step 1: Persiapan (5 menit)
- Cuci beras, masak nasi
- Potong ayam dadu 1cm
- Iris bawang merah tipis
- Cincang bawang putih halus

Step 2: Memasak (10 menit)
- Panaskan minyak di wajan
- Tumis bawang putih sampai harum
- Masukkan ayam, masak sampai matang
- Kocok telur, scramble di wajan

Step 3: Finishing (5 menit)
- Masukkan nasi, aduk rata
- Tambah kecap manis, garam, merica
- Tumis sampai bumbu merata
- Koreksi rasa, angkat

Step 4: Plating (2 menit)
- Tata nasi di piring
- Garnish dengan bawang goreng
- Tambah kerupuk dan lalapan
```

### 1.7 Activate BOM
1. **Review semua data**
2. **Klik "Activate"** - Status berubah ke "Active"
3. **BOM siap digunakan** untuk produksi dan POS

## 🏭 Langkah 2: Production Order

### 2.1 Kapan Membuat Production Order?
- **Stock produk jadi habis** dan perlu replenish
- **Catering order besar** yang butuh produksi khusus
- **Meal prep** untuk esok hari
- **Seasonal products** yang diproduksi batch

### 2.2 Buat Production Order
1. **Navigasi**: Production → Production Orders
2. **Klik "Create New Order"**

### 2.3 Setup Production Order
```
PO Number: PRO-2024-001 (auto generate)
Product: Nasi Goreng Ayam
BOM: BOM-NGR-001 (pilih BOM aktif)
Quantity: 20 PRS (target produksi)
Planned Date: (tanggal produksi)
Warehouse: Gudang Utama
Location: Kitchen Area
Status: Draft
Notes: Produksi untuk stock lunch time
```

### 2.4 Material Requirements
**Sistem otomatis hitung kebutuhan bahan**:

| Material | Per PRS | Total Need | Available | To Issue |
|----------|---------|------------|-----------|----------|
| Beras Premium | 150 GR | 3.000 GR | 5.000 GR | 3.000 GR |
| Daging Ayam | 80 GR | 1.600 GR | 2.000 GR | 1.600 GR |
| Telur Ayam | 1 PCS | 20 PCS | 30 PCS | 20 PCS |
| Minyak Goreng | 15 ML | 300 ML | 1.000 ML | 300 ML |

### 2.5 Check Material Availability
- [ ] **Semua bahan tersedia** dalam quantity yang dibutuhkan
- [ ] **Quality check** bahan (tidak expired, kondisi baik)
- [ ] **Location check** bahan ada di kitchen area

### 2.6 Release Production Order
1. **Klik "Release"** - Status berubah ke "Released"
2. **Print work order** untuk kitchen staff
3. **Schedule production** sesuai planned date

## 📦 Langkah 3: Production Issue

### 3.1 Issue Materials ke Production
1. **Navigasi**: Production → Issues
2. **Klik "Create New Issue"**
3. **Pilih Production Order**: PRO-2024-001

### 3.2 Issue Process
```
Issue Number: ISS-2024-001
Issue Date: (tanggal issue)
Production Order: PRO-2024-001
Issued By: Chef Budi
Received By: Kitchen Staff
```

**Materials to Issue**:
| Material | Required | Issue Qty | Variance | Notes |
|----------|----------|-----------|----------|-------|
| Beras Premium | 3.000 GR | 3.000 GR | 0 | OK |
| Daging Ayam | 1.600 GR | 1.650 GR | +50 GR | Sedikit lebih |
| Telur Ayam | 20 PCS | 20 PCS | 0 | OK |
| Minyak Goreng | 300 ML | 300 ML | 0 | OK |

### 3.3 Process Issue
1. **Input actual quantity** yang dikeluarkan
2. **Add notes** jika ada variance
3. **Klik "Process Issue"**
4. **Stock berkurang** otomatis dari inventory

## 🍽️ Langkah 4: Production Process

### 4.1 Kitchen Execution
**Berdasarkan work order dan BOM**:

1. **Persiapan** (30 menit):
   - Setup cooking station
   - Prepare all ingredients
   - Check equipment ready

2. **Cooking** (2 jam untuk 20 porsi):
   - Follow BOM steps
   - Maintain quality standards
   - Monitor cooking time

3. **Quality Control**:
   - Taste test setiap batch
   - Visual inspection
   - Temperature check

4. **Portioning**:
   - Consistent portion size
   - Proper packaging
   - Label dengan production date

### 4.2 Production Monitoring
- **Track progress** setiap 30 menit
- **Document issues** yang terjadi
- **Adjust process** jika perlu
- **Communicate delays** ke management

## 📥 Langkah 5: Production Receipt

### 5.1 Receive Finished Products
1. **Navigasi**: Production → Receipts
2. **Klik "Create New Receipt"**
3. **Pilih Production Order**: PRO-2024-001

### 5.2 Receipt Process
```
Receipt Number: RCP-2024-001
Receipt Date: (tanggal selesai produksi)
Production Order: PRO-2024-001
Received By: Kitchen Supervisor
Quality Check By: Chef Budi
```

**Products Received**:
| Product | Planned | Actual | Variance | Quality | Notes |
|---------|---------|--------|----------|---------|-------|
| Nasi Goreng Ayam | 20 PRS | 19 PRS | -1 PRS | Good | 1 porsi untuk taste test |

### 5.3 Quality Assessment
```
Taste: 9/10 (excellent flavor)
Appearance: 8/10 (good presentation)
Portion Size: 10/10 (consistent)
Temperature: 9/10 (proper serving temp)
Overall Grade: A (approved for sale)
```

### 5.4 Process Receipt
1. **Input actual quantity** yang diterima
2. **Quality assessment** score
3. **Klik "Process Receipt"**
4. **Stock produk jadi bertambah** di inventory

## 📋 Production Reports

### 1. Production Summary
**Navigasi**: Reports → Production → Summary

**Metrics**:
- Total production orders
- Total quantity produced
- Material consumption
- Production efficiency
- Quality scores

### 2. BOM Cost Analysis
**Navigasi**: Reports → Production → BOM Analysis

**Analysis**:
- Cost per portion trends
- Material cost breakdown
- Labor cost allocation
- Profitability by product

### 3. Material Usage Report
**Navigasi**: Reports → Production → Material Usage

**Details**:
- Material consumption vs plan
- Waste percentage
- Yield analysis
- Variance investigation

### 4. Production Efficiency
**Navigasi**: Reports → Production → Efficiency

**KPIs**:
- Planned vs actual output
- Production time analysis
- Resource utilization
- Quality metrics

## 🍳 BOM untuk Restoran

### Best Practices BOM Restoran

1. **Standard Recipes**:
   - Gunakan resep yang sudah tested
   - Consistent portion sizes
   - Clear cooking instructions
   - Quality standards defined

2. **Cost Management**:
   - Update cost prices regularly
   - Monitor food cost percentage
   - Track waste and yield
   - Optimize ingredient usage

3. **Seasonal Adjustments**:
   - Adjust for seasonal ingredients
   - Alternative ingredients ready
   - Price fluctuation planning
   - Menu engineering based on cost

### Contoh BOM Menu Populer

#### BOM: Ayam Bakar Bumbu Kecap
```
Output: 1 Porsi
Prep Time: 15 menit
Cook Time: 25 menit
Total Time: 40 menit
```

| Material | Qty | Unit | Cost | Notes |
|----------|-----|------|------|-------|
| Ayam Paha | 200 | GR | 7.000 | Potong 2 bagian |
| Kecap Manis | 20 | ML | 300 | Untuk marinasi |
| Bawang Putih | 10 | GR | 300 | Haluskan |
| Jahe | 5 | GR | 100 | Haluskan |
| Garam | 3 | GR | 15 | Secukupnya |
| Minyak | 10 | ML | 120 | Untuk oles |

**Total Cost**: Rp 7.835
**Selling Price**: Rp 30.000
**Food Cost %**: 26.1% (excellent)

#### BOM: Es Teh Manis
```
Output: 1 Gelas (400ml)
Prep Time: 3 menit
```

| Material | Qty | Unit | Cost | Notes |
|----------|-----|------|------|-------|
| Teh Celup | 1 | PCS | 500 | Seduh 3 menit |
| Gula Pasir | 25 | GR | 375 | Sesuai selera |
| Es Batu | 100 | GR | 50 | Cubes |
| Air Mineral | 350 | ML | 175 | Dingin |
| Gelas Plastik | 1 | PCS | 300 | 16 oz |

**Total Cost**: Rp 1.400
**Selling Price**: Rp 8.000
**Food Cost %**: 17.5% (excellent)

## ⚙️ Settings & Configuration

### BOM Settings
1. **Navigasi**: Admin → Settings → Production
2. **Default settings**:
   - **Labor Cost %**: 20% dari material cost
   - **Overhead %**: 10% dari material cost
   - **Waste Factor**: 5% untuk shrinkage
   - **Yield %**: 95% standard yield

### Cost Calculation Method
```
Material Cost: Rp 15.070
Labor Cost (20%): Rp 3.014
Overhead (10%): Rp 1.507
Waste Factor (5%): Rp 754
Total Production Cost: Rp 20.345

Suggested Selling Price:
Food Cost Target: 30%
Selling Price = Cost / 0.30 = Rp 67.817
Rounded Price: Rp 68.000
```

### Quality Standards
1. **Taste Score**: 1-10 scale
2. **Appearance**: Visual standards
3. **Portion Size**: Weight/volume specs
4. **Temperature**: Serving temperature
5. **Overall Grade**: A/B/C/D/F system

## ✅ Quality Control

### BOM Validation
- [ ] **Recipe tested** dan approved chef
- [ ] **Quantities realistic** untuk 1 porsi
- [ ] **Cost calculation** accurate
- [ ] **Instructions clear** untuk kitchen staff
- [ ] **Yield percentage** realistic

### Production Validation
- [ ] **Material availability** sebelum start
- [ ] **Equipment ready** dan berfungsi
- [ ] **Staff trained** untuk recipe
- [ ] **Quality standards** dipahami
- [ ] **Safety procedures** diikuti

### Output Validation
- [ ] **Quantity sesuai** dengan target
- [ ] **Quality meets** standards
- [ ] **Portion consistency** maintained
- [ ] **Packaging proper** untuk storage/sale
- [ ] **Labeling complete** dengan dates

## 🚑 Troubleshooting

### Masalah Umum & Solusi

**1. BOM cost tidak akurat**
- **Penyebab**: Harga bahan tidak update
- **Solusi**: Update cost prices di master products

**2. Production order tidak bisa release**
- **Penyebab**: Insufficient material stock
- **Solusi**: Purchase materials atau adjust quantity

**3. Issue quantity tidak sesuai BOM**
- **Penyebab**: Recipe adjustment di kitchen
- **Solusi**: Update BOM atau train kitchen staff

**4. Yield rendah dari expected**
- **Penyebab**: Waste tinggi atau cooking loss
- **Solusi**: Investigate process dan improve efficiency

### Error Messages

**"BOM not found for product"**
- Product belum punya BOM aktif
- Create BOM untuk product tersebut

**"Insufficient materials for production"**
- Stock bahan tidak cukup
- Purchase materials atau reduce quantity

**"Production order already completed"**
- Order sudah selesai diproses
- Create new production order

## 📊 Best Practices

### Recipe Management
1. **Standardize recipes** untuk consistency
2. **Document variations** untuk different sizes
3. **Regular recipe review** untuk improvement
4. **Cost monitoring** untuk profitability
5. **Seasonal adjustments** untuk availability

### Production Planning
1. **Forecast demand** berdasarkan historical
2. **Batch size optimization** untuk efficiency
3. **Material planning** untuk availability
4. **Capacity planning** untuk kitchen resources
5. **Quality planning** untuk standards

### Cost Control
1. **Regular cost updates** untuk accuracy
2. **Waste monitoring** untuk reduction
3. **Yield tracking** untuk improvement
4. **Portion control** untuk consistency
5. **Profitability analysis** untuk menu engineering

### Kitchen Operations
1. **Clear work instructions** untuk staff
2. **Quality checkpoints** dalam process
3. **Safety procedures** untuk food handling
4. **Equipment maintenance** untuk reliability
5. **Staff training** untuk skill development
