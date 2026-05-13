---
title: Master Data
module: general
order: 20
updatedAt: 2026-05-13
summary: Panduan lengkap mengelola data fondasi sistem dengan contoh praktis.
related: 01-setup-awal,03-operasional-harian,modules/inventory,modules/production,modules/admin
---

# Master Data

## 🎯 Tujuan
Master data adalah fondasi sistem. Data ini harus lengkap dan akurat sebelum mulai transaksi operasional.

## 📋 Data Wajib Sebelum Operasional

1. **Unit of Measure** - Satuan untuk semua produk
2. **Product Categories** - Pengelompokan produk
3. **Products** - Bahan baku dan menu jadi
4. **Warehouses** - Gudang dan lokasi penyimpanan
5. **Contacts** - Customer, vendor, employee
6. **Users & Roles** - Akun pengguna sistem
7. **BOM (Bill of Materials)** - Resep menu

## 📏 Langkah 1: Unit of Measure (UOM)

### 1.1 Akses Menu UOM
1. **Navigasi**: Inventory → Master Data → Units
2. **Klik "Add New Unit"**

### 1.2 Buat Unit Dasar
Buat unit berikut satu per satu:

**Unit Berat**:
```
Code: GR
Name: Gram
Type: Weight
Description: Satuan berat gram
Status: Active
```

```
Code: KG
Name: Kilogram
Type: Weight
Description: Satuan berat kilogram
Status: Active
```

**Unit Volume**:
```
Code: ML
Name: Mililiter
Type: Volume
Description: Satuan volume mililiter
Status: Active
```

```
Code: L
Name: Liter
Type: Volume
Description: Satuan volume liter
Status: Active
```

**Unit Satuan**:
```
Code: PCS
Name: Pieces
Type: Each
Description: Satuan per buah
Status: Active
```

```
Code: PRS
Name: Porsi
Type: Serving
Description: Satuan porsi makanan
Status: Active
```

**Unit Kemasan**:
```
Code: BTL
Name: Botol
Type: Container
Description: Kemasan botol
Status: Active
```

```
Code: DUS
Name: Dus
Type: Container
Description: Kemasan dus/karton
Status: Active
```

### 1.3 Verifikasi Unit
- [ ] Semua unit tersimpan dengan status Active
- [ ] Tidak ada duplikasi code
- [ ] Type sesuai dengan jenis unit

## 📋 Langkah 2: Product Categories

### 2.1 Akses Menu Categories
1. **Navigasi**: Inventory → Master Data → Categories
2. **Klik "Add New Category"**

### 2.2 Buat Kategori Utama

**Kategori Bahan Baku**:
```
Code: STAPLE
Name: Bahan Pokok
Description: Beras, minyak, gula, garam
Parent: (kosong)
Status: Active
```

```
Code: PROTEIN
Name: Protein
Description: Daging, ayam, ikan, telur, tahu, tempe
Parent: (kosong)
Status: Active
```

```
Code: PRODUCE
Name: Sayuran & Buah
Description: Sayuran segar, buah-buahan, rempah segar
Parent: (kosong)
Status: Active
```

```
Code: SPICES
Name: Bumbu & Rempah
Description: Bumbu dapur, rempah kering, saus
Parent: (kosong)
Status: Active
```

```
Code: BEVERAGE_MAT
Name: Bahan Minuman
Description: Sirup, kopi, teh, susu, gula
Parent: (kosong)
Status: Active
```

**Kategori Produk Jadi**:
```
Code: MAIN_COURSE
Name: Makanan Utama
Description: Nasi, mie, menu utama
Parent: (kosong)
Status: Active
```

```
Code: BEVERAGE
Name: Minuman
Description: Minuman jadi siap jual
Parent: (kosong)
Status: Active
```

```
Code: SNACK
Name: Snack & Appetizer
Description: Makanan ringan, appetizer
Parent: (kosong)
Status: Active
```

**Kategori Supplies**:
```
Code: PACKAGING
Name: Kemasan
Description: Box takeaway, plastik, paper bag
Parent: (kosong)
Status: Active
```

```
Code: SUPPLIES
Name: Perlengkapan
Description: Tissue, sedotan, sendok plastik
Parent: (kosong)
Status: Active
```

### 2.3 Buat Sub-Kategori (Opsional)
Contoh sub-kategori untuk organisasi lebih detail:

```
Code: RICE
Name: Beras & Nasi
Description: Berbagai jenis beras
Parent: STAPLE
Status: Active
```

```
Code: CHICKEN
Name: Ayam
Description: Daging ayam dan olahannya
Parent: PROTEIN
Status: Active
```

## 🥘 Langkah 3: Products (Bahan Baku)

### 3.1 Akses Menu Products
1. **Navigasi**: Inventory → Master Data → Products
2. **Klik "Add New Product"**

### 3.2 Input Bahan Baku Utama

**Contoh 1: Beras Premium**
```
Product Code: BR001
Product Name: Beras Premium 5KG
Category: Bahan Pokok
Base Unit: KG (untuk perhitungan cost)
Purchase Unit: DUS (beli per dus 5kg)
Sales Unit: KG (jual per kg)
Conversion Factor: 1 DUS = 5 KG
Cost Price: 60000 (Rp 60.000 per KG)
Min Stock: 10 (minimal 10 KG)
Max Stock: 100 (maksimal 100 KG)
Track Inventory: Yes
Show in POS: No (bahan baku tidak dijual langsung)
Status: Active
```

**Contoh 2: Daging Ayam**
```
Product Code: AY001
Product Name: Daging Ayam Fillet
Category: Protein
Base Unit: GR
Purchase Unit: KG
Sales Unit: GR
Conversion Factor: 1 KG = 1000 GR
Cost Price: 35 (Rp 35 per gram)
Min Stock: 2000 (minimal 2 kg)
Max Stock: 10000 (maksimal 10 kg)
Track Inventory: Yes
Show in POS: No
Status: Active
```

**Contoh 3: Minyak Goreng**
```
Product Code: MY001
Product Name: Minyak Goreng Tropical 2L
Category: Bahan Pokok
Base Unit: ML
Purchase Unit: BTL (botol 2L)
Sales Unit: ML
Conversion Factor: 1 BTL = 2000 ML
Cost Price: 12 (Rp 12 per ML)
Min Stock: 5000 (minimal 5L)
Max Stock: 20000 (maksimal 20L)
Track Inventory: Yes
Show in POS: No
Status: Active
```

### 3.3 Daftar Bahan Baku Wajib
Input semua bahan berikut dengan format serupa:

**Bahan Pokok**:
- Beras premium, beras biasa
- Minyak goreng, minyak wijen
- Gula pasir, garam dapur
- Tepung terigu, tepung beras

**Protein**:
- Daging ayam (fillet, paha, sayap)
- Daging sapi (has dalam, rendang)
- Ikan (gurame, lele, bandeng)
- Telur ayam, telur bebek
- Tahu, tempe

**Sayuran**:
- Bawang merah, bawang putih
- Cabai merah, cabai rawit
- Tomat, wortel, kentang
- Kangkung, bayam, sawi

**Bumbu & Rempah**:
- Kecap manis, kecap asin
- Saus tiram, saus sambal
- Merica, ketumbar, jinten
- Lengkuas, jahe, kunyit

## 🍳 Langkah 4: Products (Menu Jadi)

### 4.1 Input Menu Makanan

**Contoh 1: Nasi Goreng Ayam**
```
Product Code: MN001
Product Name: Nasi Goreng Ayam
Category: Makanan Utama
Base Unit: PRS
Sales Unit: PRS
Sales Price: 25000 (Rp 25.000)
Cost Price: 0 (akan dihitung dari BOM)
Track Inventory: No (produk jadi tidak disimpan)
Show in POS: Yes
POS Category: Makanan Utama
Status: Active
Description: Nasi goreng dengan potongan ayam fillet
```

**Contoh 2: Ayam Bakar**
```
Product Code: MN002
Product Name: Ayam Bakar Bumbu Kecap
Category: Makanan Utama
Base Unit: PRS
Sales Unit: PRS
Sales Price: 30000
Show in POS: Yes
Status: Active
Description: Ayam bakar dengan bumbu kecap manis
```

### 4.2 Input Menu Minuman

**Contoh: Es Teh Manis**
```
Product Code: DR001
Product Name: Es Teh Manis
Category: Minuman
Base Unit: PRS
Sales Unit: PRS
Sales Price: 8000
Show in POS: Yes
POS Category: Minuman
Status: Active
```

## 🏢 Langkah 5: Warehouses & Locations

### 5.1 Setup Warehouse Utama
1. **Navigasi**: Inventory → Master Data → Warehouses
2. **Buat warehouse**:

```
Code: MAIN
Name: Gudang Utama
Type: Main Warehouse
Address: (alamat gudang)
Status: Active
Default: Yes
```

### 5.2 Setup Locations dalam Warehouse
1. **Klik warehouse yang sudah dibuat**
2. **Tab "Locations"**
3. **Add locations**:

```
Code: DRY-01
Name: Dry Storage
Type: Storage
Description: Penyimpanan bahan kering
```

```
Code: COLD-01
Name: Cold Storage
Type: Refrigerated
Description: Kulkas bahan segar
```

```
Code: KITCHEN
Name: Kitchen Area
Type: Production
Description: Area dapur untuk produksi
```

```
Code: BAR
Name: Bar Area
Type: Service
Description: Area bar untuk minuman
```

## 👥 Langkah 6: Contacts Management

### 6.1 Setup Vendors (Supplier)
1. **Navigasi**: Contacts → Vendors
2. **Add New Vendor**:

**Contoh Supplier Beras**:
```
Vendor Code: SUP001
Vendor Name: Toko Beras Pak Budi
Contact Person: Budi Santoso
Phone: 081234567890
Email: budi@tokoberasjakarta.com
Address: Jl. Pasar Beras No. 15, Jakarta
Payment Terms: Net 30 (bayar dalam 30 hari)
Status: Active
```

**Contoh Supplier Sayuran**:
```
Vendor Code: SUP002
Vendor Name: Pasar Sayur Segar
Contact Person: Ibu Sari
Phone: 081987654321
Address: Pasar Induk Kramat Jati
Payment Terms: Cash on Delivery
Status: Active
```

### 6.2 Setup Customers
1. **Navigasi**: Contacts → Customers
2. **Add customers** (untuk sales non-POS):

```
Customer Code: CUST001
Customer Name: PT. Catering Nusantara
Contact Person: Pak Ahmad
Phone: 021-12345678
Email: ahmad@cateringnusantara.com
Address: Jl. Sudirman No. 100, Jakarta
Credit Limit: 10000000 (Rp 10 juta)
Payment Terms: Net 14
Status: Active
```

## 🍳 Langkah 7: BOM (Bill of Materials)

### 7.1 Buat BOM untuk Menu
1. **Navigasi**: Production → BOM
2. **Add New BOM**

### 7.2 Contoh BOM: Nasi Goreng Ayam

**Header BOM**:
```
Product: Nasi Goreng Ayam
Quantity: 1 PRS
Status: Active
Effective Date: (tanggal hari ini)
Description: Resep standar nasi goreng ayam
```

**Materials (Bahan)**:
| No | Material | Quantity | Unit | Notes |
|----|----------|----------|------|---------|
| 1 | Beras Premium | 150 | GR | Nasi matang ~300gr |
| 2 | Daging Ayam Fillet | 80 | GR | Potong dadu |
| 3 | Telur Ayam | 1 | PCS | Kocok lepas |
| 4 | Minyak Goreng | 15 | ML | Untuk menumis |
| 5 | Bawang Merah | 8 | GR | Iris tipis |
| 6 | Bawang Putih | 5 | GR | Cincang halus |
| 7 | Kecap Manis | 12 | ML | Sesuai selera |
| 8 | Garam | 2 | GR | Secukupnya |
| 9 | Merica Bubuk | 1 | GR | Secukupnya |

### 7.3 Input BOM ke Sistem
1. **Isi header BOM**
2. **Add materials satu per satu**:
   - Pilih material dari dropdown
   - Input quantity sesuai tabel
   - Pastikan unit sesuai base unit material
3. **Save BOM**
4. **Activate BOM**

### 7.4 Verifikasi BOM
- [ ] Total cost BOM dihitung otomatis
- [ ] Cost per porsi masuk akal (< 70% harga jual)
- [ ] Semua material tersedia di inventory
- [ ] Quantity realistic untuk 1 porsi

### 7.5 Buat BOM untuk Menu Lain
Ulangi proses untuk semua menu:
- Ayam Bakar Bumbu Kecap
- Nasi Gudeg
- Soto Ayam
- Es Teh Manis
- Es Jeruk
- dll.

## ✅ Checklist Master Data Lengkap

### Data Wajib
- [ ] **Units**: Minimal 8 unit dasar (PCS, GR, KG, ML, L, PRS, BTL, DUS)
- [ ] **Categories**: Minimal 10 kategori (bahan + menu + supplies)
- [ ] **Products**: Minimal 20 bahan baku + 10 menu jadi
- [ ] **Warehouses**: 1 warehouse utama + 4 locations
- [ ] **Vendors**: Minimal 5 supplier utama
- [ ] **BOM**: Semua menu punya resep aktif

### Validasi Data
- [ ] **Unit Conversion**: Semua produk punya conversion factor benar
- [ ] **Pricing**: Harga cost dan sales sudah diisi
- [ ] **Stock Levels**: Min/max stock sudah diset
- [ ] **POS Display**: Menu jadi sudah diset "Show in POS"
- [ ] **BOM Cost**: Total cost BOM < 70% harga jual

### Test Functionality
- [ ] **Search Products**: Pencarian produk berjalan normal
- [ ] **Filter Categories**: Filter kategori berfungsi
- [ ] **BOM Calculation**: Cost BOM terhitung otomatis
- [ ] **Stock Movement**: Bisa input stock adjustment
- [ ] **POS Integration**: Menu muncul di POS grid

## 🚀 Langkah Selanjutnya

Setelah master data lengkap:

1. **[Operasional Harian](./03-operasional-harian)** - Mulai transaksi harian
2. **[Panduan POS](./modules/pos)** - Setup dan operasional kasir
3. **[Panduan Purchase](./modules/purchase)** - Proses pembelian
4. **[Panduan Inventory](./modules/inventory)** - Manajemen stok

## 🆘 Tips & Best Practices

### Penamaan Konsisten
- **Product Code**: Gunakan prefix kategori (BR=Beras, AY=Ayam, MN=Menu)
- **Naming**: Nama jelas, hindari singkatan ambigu
- **Description**: Isi deskripsi untuk produk yang mirip

### Unit Conversion
- **Test Manual**: Hitung manual dulu sebelum input
- **Base Unit**: Pilih unit terkecil untuk akurasi cost
- **Purchase Unit**: Sesuai cara beli dari supplier
- **Sales Unit**: Sesuai cara jual ke customer

### BOM Management
- **Standard Recipe**: Gunakan resep standar, jangan variasi
- **Portion Control**: Quantity BOM harus konsisten
- **Cost Control**: Monitor cost BOM vs harga jual
- **Update Regular**: Review BOM jika harga bahan berubah

### Data Maintenance
- **Regular Review**: Cek data master setiap bulan
- **Inactive Products**: Non-aktifkan produk yang tidak dipakai
- **Price Update**: Update harga sesuai market price
- **Backup Data**: Backup master data secara berkala
