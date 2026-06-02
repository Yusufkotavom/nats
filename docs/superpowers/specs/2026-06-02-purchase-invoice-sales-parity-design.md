# Purchase Invoice Sales Parity Design

## Goal

Menyamakan `Purchase Invoice` dengan `Sales Invoice` pada dua area utama: relasi item produk yang persisten dan perilaku UI mobile-responsive pada form/action area.

## Current Gap Check

1. `Sales Invoice` menyimpan `productId` per item dan memulihkan pilihan produk saat edit/reload.
2. `Purchase Invoice` belum menyimpan `productId` di model item invoice walaupun schema validasi form sudah menerima field tersebut.
3. Picker produk `Purchase Invoice` masih memakai `description` sebagai value, sehingga hanya auto-fill sesaat dan tidak punya relasi data yang stabil.
4. Footer action/summary item `Purchase Invoice` masih lebih kaku daripada `Sales Invoice` pada mobile.
5. Action update `Purchase Invoice` masih memuat logika persistence sendiri, belum reuse service seperti `Sales Invoice`.

## Design

### Data Model

Tambahkan `productId` nullable dan relasi `product` nullable ke `PurchaseInvoiceItem`. Nullable dipilih agar invoice lama tetap valid dan edit flow tidak rusak.

### Service and Action Contract

`PurchaseInvoiceInput` dan persistence service akan menyimpan `productId` bila tersedia. Action `create`, `update`, dan `delete` purchase invoice akan reuse `PurchaseInvoiceService` agar kontraknya setara dengan pola `Sales Invoice`.

### Form Behavior

Form `Purchase Invoice` akan mengikuti perilaku `Sales Invoice`:

1. state item menyimpan `productId`
2. dropdown produk memakai `productId` sebagai `value`
3. pilih produk otomatis mengisi `description` dan `unitPrice`
4. populate dari `Purchase Order` ikut membawa `productId`
5. edit/reload invoice existing dapat mendeteksi produk yang pernah dipilih

### Responsive UI Parity

Area footer tabel item `Purchase Invoice` akan memakai pola flex yang sama dengan `Sales Invoice`: tombol aksi responsif penuh di mobile, panel summary turun ke bawah pada layar kecil, dan kontrol tax/manual amount tidak mendorong layout keluar viewport.

## Testing

1. Tambah service test untuk memastikan `productId` ikut tersimpan saat create dan update.
2. Tambah form/component test untuk memastikan pilih produk di `Purchase Invoice` mengubah nilai yang benar dan label terpilih tetap tampil.
3. Verifikasi typecheck/test target setelah perubahan schema dan generated client diperbarui.

## Docs Impact

1. `CHANGELOG.md` wajib ditambah.
2. `docs/architecture.md` diperbarui singkat karena kontrak invoice purchase item berubah dan kini setara dengan sales dalam relasi produk.
