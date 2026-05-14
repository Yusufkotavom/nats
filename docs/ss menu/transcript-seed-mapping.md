# Transcript Menu + Seed Mapping (Mang Engking)

Sumber:
- `docs/ss menu/Screenshot_2026-05-14-13-30-08-053_com.google.android.apps.maps.jpg`
- `docs/ss menu/Screenshot_2026-05-14-13-30-10-869_com.google.android.apps.maps.jpg`

## Ringkasan Hasil

1. Transkrip menu sudah dimasukkan ke seed sebagai daftar **satu per satu** pada konstanta:
- `MENU_CATALOG` di `prisma/seed-restaurant-id.ts`

2. Seed produk hasil transcript dibentuk dari:
- `RESTAURANT_ID_PRODUCTS` (produk siap jual lengkap menu cetak)

3. Mapping kemungkinan BOM **per menu** (tanpa detail qty, sesuai arahan) dibentuk dari:
- `RESTAURANT_ID_BOM_CANDIDATES`

4. Paket menu yang ada di foto juga dipetakan:
- `RESTAURANT_ID_PACKAGE_BOMS` (`Paket 10 Orang`, `Paket 6 Orang`, `Paket 4 Orang`)

## Catatan Implementasi Seed

- Scope seed dipersempit sesuai arahan:
1. `akun` (via `seedAccounting`)
2. `user` (via `seedUsers`)
3. `produk` (via `seedInventoryIndonesia`)
4. `BOM paket` (via `seedPackageBomsIndonesia`)

- Mode seed:
1. `full` (default): seluruh transcript menu dipakai.
2. `minimal`: set `RESTAURANT_MENU_SEED_MODE=minimal` dan default mengambil `2` produk per kategori (bisa override dengan `RESTAURANT_MENU_LIMIT_PER_CATEGORY`).

- Reseed bersih:
1. Sebelum insert, seed membersihkan produk lama dengan SKU `ID-*` agar tidak menumpuk katalog lama.

- Yang **tidak** dijalankan pada `main()`:
1. seed contact
2. seed cash account
3. seed transaksi purchase/sales/POS

## Kategori Transcript yang Dipakai

- Menu Seafood
- Menu Ikan
- Menu Kepiting
- Menu Cumi & Kerang
- Menu Ayam Bebek Sapi
- Menu Sayuran & Lauk
- Menu Nasi & Sambal
- Menu Paket
- Menu Minuman
- Menu Dessert

## Validasi

- Test seed katalog + BOM mapping ada di:
  - `prisma/seed/restaurant-id-seed.test.ts`
