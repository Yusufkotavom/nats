# Google Form Template - Client E2E Alignment

Template ini adalah versi siap input ke Google Forms dari dokumen:
- `docs/client-e2e-alignment-form.md`

Tujuan:
- Mempercepat pengisian client dengan opsi pilihan (multiple choice/checkbox/dropdown).
- Menstandarkan jawaban agar implementasi software selaras dari POS, inventory, dapur, purchase, sampai accounting.

## 1) Metadata Form

- Judul Form: `Form Perencanaan Implementasi End-to-End`
- Deskripsi:
  `Isi form ini untuk menyelaraskan kebutuhan operasional dan behavior sistem sebelum implementasi. Pilih opsi yang paling sesuai. Tambahkan catatan jika ada pengecualian.`
- Collect email: `ON`
- Batasi 1 response per email: `ON` (opsional)
- Allow edit after submit: `ON`
- Show progress bar: `ON`

## 2) Struktur Section + Pertanyaan

Format:
- `Tipe`: `Short answer`, `Paragraph`, `Multiple choice`, `Checkboxes`, `Dropdown`
- `Required`: `Yes/No`

## Section 0 - Identitas Client

1. Nama perusahaan
- Tipe: `Short answer`
- Required: `Yes`

2. Nama PIC
- Tipe: `Short answer`
- Required: `Yes`

3. Jabatan PIC
- Tipe: `Short answer`
- Required: `Yes`

4. Email PIC
- Tipe: `Short answer`
- Required: `Yes`

5. Nomor WA PIC
- Tipe: `Short answer`
- Required: `Yes`

## Section A - Profil Operasional

1. Jenis bisnis utama
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Restoran`, `Cafe`, `Retail`, `Jasa`, `Lainnya`

2. Jumlah outlet saat ini
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `1`, `2-5`, `>5`

3. Metode operasional stok
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Single gudang`, `Multi gudang`, `Per outlet stock`

4. Target Go-Live
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `<30 hari`, `1-2 bulan`, `>2 bulan`

5. Catatan profil operasional
- Tipe: `Paragraph`
- Required: `No`

## Section B - Master Data dan Persediaan

1. Produk disimpan sebagai
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Barang jual jadi`, `Bahan baku + barang jadi`, `Keduanya`

2. Unit barang
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tanpa konversi`, `Dengan konversi (KG->GR dst)`

3. Kontrol stok negatif
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Dilarang`, `Boleh dengan warning`

4. Metode penilaian biaya stok
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Average Cost`, `FIFO`, `Belum ditentukan`

5. Reorder point
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak perlu`, `Per produk`, `Per gudang+produk`

6. Multi harga jual
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak`, `Ya (eceran/grosir/channel)`

7. Catatan persediaan
- Tipe: `Paragraph`
- Required: `No`

## Section C - Behavior POS

1. Saat transaksi POS sukses
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Kurangi stok barang jual`, `Kurangi bahan via BOM`, `Hybrid`

2. Metode pembayaran POS
- Tipe: `Checkboxes`
- Required: `Yes`
- Opsi: `Cash`, `Bank Transfer`, `QRIS`, `E-wallet`, `Lainnya`

3. Split bill
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak`, `Ya`

4. Hold order
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak`, `Ya`

5. Otorisasi void transaksi
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Supervisor only`, `Kasir+Supervisor`

6. Sinkron stok realtime
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Wajib`, `Boleh delay end-of-day`

7. Catatan POS
- Tipe: `Paragraph`
- Required: `No`

## Section D - Pencatatan Dapur dan Produksi

1. Metode pemakaian bahan
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Otomatis dari BOM saat jual`, `Manual issue harian`, `Hybrid`

2. Cakupan BOM
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak perlu`, `Menu utama saja`, `Semua menu`

3. Pencatatan waste
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak dicatat`, `Per shift`, `Per item`

4. Produksi batch/prep
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak`, `Ya`

5. Approval perubahan BOM
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak`, `Head Chef`, `Owner`

6. Catatan dapur
- Tipe: `Paragraph`
- Required: `No`

## Section E - Pembelian dan Penerimaan

1. Alur pembelian utama
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Quick Purchase`, `PO->Receive->Invoice`, `Campuran`

2. Skema pembelian harian
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Cash daily`, `Hutang bulanan`, `Campuran`

3. Wajib receive sebelum invoice
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Ya`, `Tidak`

4. Partial receive
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak`, `Ya`

5. Retur pembelian
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak`, `Ya`

6. Catatan purchase
- Tipe: `Paragraph`
- Required: `No`

## Section F - Akuntansi dan Jurnal

1. Mekanisme posting jurnal
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Otomatis realtime`, `Approval lalu post`, `End-of-day batch`

2. Kebutuhan costing
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Dasar`, `Menengah`, `Detail per menu/per shift`

3. Pajak transaksi
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Non-PKP`, `PPN`, `Custom`

4. Tutup buku periodik
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Bulanan`, `Mingguan`, `Tidak fixed`

5. Akun default
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Ikuti standar seed`, `Custom chart of accounts`

6. Catatan akuntansi
- Tipe: `Paragraph`
- Required: `No`

## Section G - Kontrol, Approval, dan Akses

1. Struktur approval
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tanpa approval`, `1 level`, `2 level+`

2. Role akses
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Standard (Admin/Manager/Cashier)`, `Custom role`

3. Batas diskon POS
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak ada`, `Per kasir`, `Per role`

4. Audit trail
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Basic`, `Detail per field`

5. Catatan approval dan akses
- Tipe: `Paragraph`
- Required: `No`

## Section H - Laporan dan KPI

1. KPI utama
- Tipe: `Checkboxes`
- Required: `Yes`
- Opsi: `Sales`, `Margin`, `COGS`, `Waste`, `Cashflow`

2. Frekuensi laporan
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Harian`, `Mingguan`, `Bulanan`

3. Format ekspor
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `PDF`, `Excel`, `Keduanya`

4. Dashboard manajemen
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Ringkas`, `Lengkap`

5. Catatan laporan
- Tipe: `Paragraph`
- Required: `No`

## Section I - Migrasi Data dan Integrasi

1. Sumber data lama
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Excel`, `POS lain`, `ERP lain`, `Tidak ada`

2. Scope migrasi awal
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Master only`, `Master+saldo`, `Full history`

3. Integrasi eksternal
- Tipe: `Checkboxes`
- Required: `No`
- Opsi: `Tidak ada`, `Payment`, `E-commerce`, `Marketplace`, `Lainnya`

4. Kebutuhan API
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Tidak`, `Ya (read-only)`, `Ya (read-write)`

5. Catatan migrasi dan integrasi
- Tipe: `Paragraph`
- Required: `No`

## Section J - Prioritas Implementasi

Gunakan pertanyaan grid:
- Tipe: `Multiple choice grid`
- Required: `Yes`
- Baris:
  - `POS + Pembayaran`
  - `Inventory + Gudang`
  - `Dapur + BOM + Waste`
  - `Purchase + Supplier`
  - `Accounting + Laporan`
  - `HR/Payroll`
- Kolom: `MVP`, `Phase 2`, `Phase 3`

Pertanyaan tambahan:
1. Target tanggal UAT
- Tipe: `Short answer`
- Required: `Yes`

2. Catatan prioritas implementasi
- Tipe: `Paragraph`
- Required: `No`

## Section K - Risiko dan Keputusan Final

1. Constraint operasional utama
- Tipe: `Paragraph`
- Required: `No`

2. Risiko terbesar menurut client
- Tipe: `Paragraph`
- Required: `No`

3. Keputusan yang wajib final sebelum development
- Tipe: `Paragraph`
- Required: `Yes`

4. Persetujuan scope awal
- Tipe: `Multiple choice`
- Required: `Yes`
- Opsi: `Setuju`, `Setuju dengan catatan`, `Belum setuju`

## 3) Catatan Implementasi Google Form

- Aktifkan `Response destination` ke Google Sheet untuk rekap.
- Buat sheet ringkasan dengan filter:
  - outlet
  - business type
  - pilihan behavior POS
  - pilihan behavior BOM/dapur
  - pilihan alur purchase
- Untuk pertanyaan kritikal, gunakan validasi:
  - Jika `Kurangi bahan via BOM` dipilih, pastikan section dapur terisi lengkap.
  - Jika `Custom chart of accounts` dipilih, minta lampiran COA awal.
