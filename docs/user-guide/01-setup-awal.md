---
title: Setup Awal
module: general
order: 10
updatedAt: 2026-05-14
summary: Panduan lengkap setup sistem dari nol sampai siap operasional.
related: 00-start-here,02-master-data,modules/admin,modules/inventory
---

# Setup Awal

## 🎯 Tujuan
Panduan ini membantu Anda setup sistem restoran dari nol sampai siap operasional. Ikuti langkah demi langkah, jangan lompat.

## ⏱️ Estimasi Waktu
- **Setup Dasar**: 30 menit
- **Master Data**: 2-3 jam
- **Test Transaksi**: 30 menit
- **Total**: 3-4 jam

## 📋 Checklist Persiapan
Sebelum mulai, siapkan:
- [ ] Data perusahaan (nama, alamat, NPWP)
- [ ] Daftar bahan baku utama
- [ ] Daftar menu yang dijual
- [ ] Resep/komposisi tiap menu
- [ ] Harga jual menu saat ini
- [ ] Saldo kas/bank awal (jika sudah beroperasi)

## 🚀 Langkah 1: Akses & Login Pertama

### 1.1 Login Sistem
1. Buka URL aplikasi di browser
2. Login dengan akun default:
   - **Username**: admin
   - **Password**: (sesuai yang diberikan IT)
3. **WAJIB**: Ganti password default segera
   - Klik profil di pojok kanan atas
   - Pilih "Change Password"
   - Masukkan password baru yang kuat

### 1.2 Verifikasi Akses
- [ ] Dashboard terbuka normal
- [ ] Menu navigasi terlihat lengkap
- [ ] Tidak ada error di halaman utama

## 🏢 Langkah 2: Setup Profil Perusahaan

### 2.1 Company Profile
1. **Navigasi**: Admin → Company → Company Profile
2. **Isi data wajib**:
   - **Company Name**: Nama resmi restoran
   - **Address**: Alamat lengkap
   - **Phone**: Nomor telepon utama
   - **Email**: Email bisnis utama
   - **NPWP**: (jika ada, untuk laporan pajak)
3. **Klik Save**

### 2.2 System Settings
1. **Navigasi**: Admin → Settings → General Settings
2. **Currency**: Pilih "IDR (Indonesian Rupiah)"
3. **Timezone**: Pilih "Asia/Jakarta"
4. **Date Format**: Pilih "DD/MM/YYYY"
5. **Klik Save**

## 👥 Langkah 3: Setup User & Role

### 3.1 Buat Role Dasar
1. **Navigasi**: Admin → User Management → Roles
2. **Buat role berikut**:

**Role: Manager**
- Permissions: Full access kecuali delete master data
- Untuk: Pemilik/manager restoran

**Role: Kasir**
- Permissions: POS, Sales, Cash & Bank (view only)
- Untuk: Staff kasir

**Role: Purchasing**
- Permissions: Purchase, Inventory, Vendor management
- Untuk: Staff pembelian

**Role: Kitchen**
- Permissions: Production, Inventory (view), BOM (view)
- Untuk: Staff dapur

### 3.2 Buat User Account
1. **Navigasi**: Admin → User Management → Users
2. **Buat user untuk setiap staff**:
   - **Username**: nama_staff (contoh: budi_kasir)
   - **Email**: email aktif staff
   - **Password**: Password sementara (minta staff ganti)
   - **Role**: Sesuai fungsi
   - **Status**: Active

### 3.3 Test Login User
- [ ] Test login dengan setiap user baru
- [ ] Verifikasi permission sesuai role
- [ ] Minta setiap user ganti password

## 🏪 Langkah 4: Setup Struktur Operasional

### 4.1 Warehouse (Gudang)
1. **Navigasi**: Inventory → Master Data → Warehouses
2. **Buat warehouse utama**:
   - **Code**: MAIN
   - **Name**: Gudang Utama
   - **Type**: Main Warehouse
   - **Status**: Active
3. **Buat lokasi dalam warehouse**:
   - **Dry Storage**: Bahan kering (beras, gula, dll)
   - **Cold Storage**: Bahan yang perlu kulkas
   - **Kitchen**: Area dapur
   - **Bar**: Area minuman

### 4.2 Unit of Measure (UOM)
1. **Navigasi**: Inventory → Master Data → Units
2. **Buat unit dasar**:

| Code | Name | Type | Keterangan |
|------|------|------|-----------|
| PCS | Pieces | Each | Satuan per buah |
| GR | Gram | Weight | Berat gram |
| KG | Kilogram | Weight | Berat kilogram |
| ML | Mililiter | Volume | Volume mililiter |
| L | Liter | Volume | Volume liter |
| PRS | Porsi | Serving | Porsi makanan |
| BTL | Botol | Container | Kemasan botol |
| DUS | Dus | Container | Kemasan dus |

### 4.3 Product Categories
1. **Navigasi**: Inventory → Master Data → Categories
2. **Catatan setup wizard**: saat pertama kali menjalankan setup awal, sistem otomatis menyiapkan kategori baseline: `General`, `Menu Makanan`, `Menu Minuman`, `Menu Snack`, `Menu Dessert`, dan `Bahan Baku`.
3. Lengkapi/ubah kategori sesuai kebutuhan operasional Anda.
4. **Buat kategori utama**:

**Bahan Pokok**
- Code: STAPLE
- Name: Bahan Pokok
- Description: Beras, minyak, gula, garam

**Protein**
- Code: PROTEIN
- Name: Protein
- Description: Daging, ayam, ikan, telur

**Sayuran & Buah**
- Code: PRODUCE
- Name: Sayuran & Buah
- Description: Sayuran segar dan buah-buahan

**Bumbu & Rempah**
- Code: SPICES
- Name: Bumbu & Rempah
- Description: Bumbu dapur dan rempah-rempah

**Minuman**
- Code: BEVERAGE
- Name: Minuman
- Description: Bahan minuman dan sirup

**Menu Jadi**
- Code: FINISHED
- Name: Menu Jadi
- Description: Produk siap jual

**Supplies**
- Code: SUPPLIES
- Name: Perlengkapan
- Description: Kemasan, tissue, sedotan

## 🥘 Langkah 5: Input Master Produk

### 5.1 Input Bahan Baku
1. **Navigasi**: Inventory → Master Data → Products
2. **Klik "Add New Product"**
3. **Isi data untuk setiap bahan**:

**Contoh: Beras Premium**
- **Product Code**: BR001
- **Product Name**: Beras Premium 5KG
- **Category**: Bahan Pokok
- **Base Unit**: KG (untuk perhitungan cost)
- **Purchase Unit**: DUS (beli per dus)
- **Sales Unit**: KG (jual per kg)
- **Conversion Factor**: 1 DUS = 5 KG
- **Cost Price**: Rp 60.000 (per KG)
- **Status**: Active
- **Track Inventory**: Yes

**Ulangi untuk bahan lain**:
- Minyak goreng, gula, garam, bawang
- Daging ayam, ikan, telur
- Cabai, tomat, sayuran
- Bumbu-bumbu dapur

### 5.2 Input Menu Jadi
1. **Tetap di**: Inventory → Master Data → Products
2. **Buat produk menu**:

**Contoh: Nasi Goreng Ayam**
- **Product Code**: MN001
- **Product Name**: Nasi Goreng Ayam
- **Category**: Menu Jadi
- **Base Unit**: PRS
- **Sales Unit**: PRS
- **Sales Price**: Rp 25.000
- **Show in POS**: Yes
- **Status**: Active

## 🍳 Langkah 6: Buat BOM (Resep)

### 6.1 Setup BOM untuk Menu
1. **Navigasi**: Production → BOM
2. **Klik "Add New BOM"**
3. **Isi data BOM**:

**BOM: Nasi Goreng Ayam (1 Porsi)**
- **Product**: Nasi Goreng Ayam
- **Quantity**: 1 PRS
- **Status**: Active

**Materials (Bahan)**:
| Bahan | Quantity | Unit | Cost |
|-------|----------|------|----- |
| Beras Premium | 150 | GR | Auto calculate |
| Daging Ayam | 100 | GR | Auto calculate |
| Telur Ayam | 1 | PCS | Auto calculate |
| Minyak Goreng | 20 | ML | Auto calculate |
| Bawang Merah | 10 | GR | Auto calculate |
| Kecap Manis | 15 | ML | Auto calculate |

4. **Klik Save**
5. **Ulangi untuk semua menu**

### 6.2 Verifikasi BOM
- [ ] Total cost BOM masuk akal
- [ ] Semua bahan tersedia di inventory
- [ ] Quantity sesuai porsi standar

## 💰 Langkah 7: Setup Akuntansi Dasar

### 7.1 Chart of Accounts
1. **Navigasi**: Accounting → Chart of Accounts
2. **Verifikasi akun wajib ada**:

**Aset**:
- 1100 - Kas Toko
- 1200 - Bank BCA
- 1400 - Persediaan Bahan Baku

**Pendapatan**:
- 4100 - Penjualan Makanan
- 4200 - Penjualan Minuman

**Beban**:
- 5100 - Harga Pokok Penjualan
- 5200 - Beban Gaji
- 5300 - Beban Listrik

### 7.2 Saldo Awal (Jika Sudah Beroperasi)
1. **Navigasi**: Accounting → Journal Entry
2. **Buat jurnal saldo awal**:

**Contoh Saldo Awal**:
- **Date**: Tanggal mulai pakai sistem
- **Reference**: SALDO-AWAL-001
- **Description**: Saldo awal kas dan modal

**Journal Lines**:
| Account | Debit | Credit |
|---------|-------|--------|
| Kas Toko | 5.000.000 | - |
| Bank BCA | 15.000.000 | - |
| Persediaan Bahan Baku | 3.000.000 | - |
| Modal Pemilik | - | 23.000.000 |

3. **Post Journal**

## 🧪 Langkah 8: Test Transaksi

### 8.1 Test Purchase (Pembelian)
1. **Navigasi**: Purchase → Quick Purchase
2. **Buat pembelian test**:
   - **Vendor**: Supplier Beras Pak Budi
   - **Date**: Hari ini
   - **Mode**: Cash Daily
   - **Items**: Beras Premium 2 DUS @ Rp 55.000
   - **Total**: Rp 110.000
3. **Submit & Post**
4. **Verifikasi**:
   - [ ] Stok beras bertambah 10 KG
   - [ ] Kas berkurang Rp 110.000
   - [ ] Jurnal tercatat otomatis

### 8.2 Test POS (Penjualan)
1. **Navigasi**: POS
2. **Buka POS Session**:
   - **Opening Cash**: Rp 500.000
   - **Warehouse**: Gudang Utama
3. **Buat transaksi test**:
   - **Item**: Nasi Goreng Ayam x 2
   - **Total**: Rp 50.000
   - **Payment**: Cash
4. **Process Payment**
5. **Verifikasi**:
   - [ ] Stok bahan berkurang sesuai BOM
   - [ ] Kas bertambah Rp 50.000
   - [ ] Invoice tercetak
   - [ ] Jurnal penjualan tercatat

### 8.3 Tutup POS Session
1. **Klik "Close Session"**
2. **Hitung kas fisik**: Rp 550.000
3. **Input actual cash**: Rp 550.000
4. **Variance**: Rp 0 (ideal)
5. **Close Session**

## ✅ Verifikasi Final

### Checklist Sebelum Go-Live
- [ ] **Users**: Semua staff punya akun & role sesuai
- [ ] **Company**: Profil perusahaan lengkap
- [ ] **Warehouse**: Gudang & lokasi siap
- [ ] **Products**: Bahan baku & menu lengkap
- [ ] **BOM**: Resep semua menu sudah dibuat
- [ ] **Prices**: Harga jual & beli sudah diset
- [ ] **Accounts**: Chart of accounts lengkap
- [ ] **Cash**: Saldo awal kas/bank sudah diinput
- [ ] **Test**: Purchase & POS berjalan normal
- [ ] **Reports**: Laporan bisa diakses

### Jika Ada Masalah
1. **Cek error message** di sistem
2. **Review langkah** yang mungkin terlewat
3. **Konsultasi** dengan IT support
4. **Jangan lanjut** sebelum semua test berhasil

## 🎉 Selamat!

Sistem sudah siap untuk operasional harian. Lanjutkan ke:

### Panduan Selanjutnya
- [Master Data Lanjutan](./02-master-data) - Kelola data master lebih detail
- [Operasional Harian](./03-operasional-harian) - Workflow harian restoran
- [Panduan Cepat Harian](./quick-daily-operations) - Checklist operasional

### Modul Spesifik
- [POS Module](./modules/pos) - Panduan kasir detail
- [Purchase Module](./modules/purchase) - Panduan pembelian
- [Inventory Module](./modules/inventory) - Manajemen stok
- [Accounting Module](./modules/accounting) - Laporan keuangan

### Bantuan
- [Troubleshooting](./troubleshooting) - Solusi masalah umum
- [Glosarium](./glossary) - Definisi istilah sistem
