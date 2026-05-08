# Changelog

Semua perubahan penting pada proyek ini akan didokumentasikan di file ini.

Format ini didasarkan pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-05-08

### Changed
- POS transaction flow sekarang melakukan konsumsi bahan berbasis BOM aktif bila tersedia, bukan hanya mengurangi stok produk jual.
- Fallback tetap dipertahankan: jika BOM tidak tersedia, sistem tetap mengurangi stok produk jual (backward compatible).

### Fixed
- Menambahkan guard tegas untuk mencegah konsumsi BOM non-integer pada model stok yang masih integer agar tidak terjadi drift stok diam-diam.
- Menampilkan kembali aksi `Edit` pada menu dropdown daftar BOM di halaman production BOM list.
- Memperbaiki menu Budgeting agar tidak lagi mengarah ke route yang belum tersedia (`/budgeting/dashboard`, `/budgeting/plans`, `/budgeting/variance`) sehingga menghilangkan error 404 pada navigasi.
- Memperbaiki crash halaman `/budgeting/budgets/new` (`TypeError: ...map is not a function`) dengan memastikan data `projects` yang dikirim ke form selalu berupa array dan menambahkan guard deserialisasi array pada `BudgetForm`.

### Docs
- Menambahkan `AGENTS.md` berisi aturan wajib/larangan implementasi, changelog policy, dan definition of done.
- Menambahkan `CLAUDE.md` sebagai baseline panduan agent yang merujuk ke `AGENTS.md`.
- Menambahkan `docs/architecture.md` untuk memperjelas struktur layer dan alur kritis POS -> Inventory.
- Menambahkan `docs/docs-index.json` sebagai registry dokumen berbasis JSON untuk tracking update dokumen.
- Menambahkan dokumentasi domain restoran di `docs/restaurant-pos-inventory-sync.md`.
- Memperbarui `README.md` agar merujuk seluruh dokumen engineering penting.
- Menegaskan aturan wajib membuat test baru jika perubahan/fitur belum memiliki coverage test, dan menyinkronkannya di `AGENTS.md`, `CLAUDE.md`, serta `docs/docs-index.json`.

### Added
- Menambahkan workflow CI utama (`.github/workflows/ci.yml`) untuk `pull_request` dan `push` ke `main` dengan tahapan `npm ci`, `prisma generate`, `lint`, `test`, dan `build`.
- Menambahkan workflow dependency review (`.github/workflows/dependency-review.yml`) untuk memeriksa risiko dependency pada PR ke `main`.
- Menambahkan seeder baru `prisma/seed-restaurant-minimal.ts` dan script `npm run prisma:seed:restaurant:minimal` untuk baseline data restoran tanpa transaksi.
- Menambahkan user guide modular end-to-end di `docs/user-guide/*` untuk seluruh modul utama.
- Menambahkan public docs page di app (`/[locale]/docs` dan alias `/docs`) untuk membaca panduan pengguna langsung dari aplikasi.

### Changed
- Memperbarui workflow release (`.github/workflows/release.yml`) agar menggunakan `npm ci`, menambahkan `permissions` eksplisit, dan `timeout` job untuk kestabilan pipeline.
- Menyesuaikan `seed-restaurant-minimal` agar semua kuantitas inventory awal bernilai `0` (inventori harus terbentuk melalui transaksi operasional).
- Menyesuaikan pricing/cost bahan berbasis `GR` pada `seed-restaurant-minimal` menjadi nilai per gram agar BOM dan COGS tidak salah skala.
- Memperbarui `README.md` dan `docs/docs-index.json` agar user guide baru dan linking antar dokumen terdaftar resmi.

### Added
- Menambahkan data 3 karyawan minimal (`EMPLOYEE` + `EmployeeDetail`) pada `seed-restaurant-minimal` untuk kebutuhan setup awal operasional restoran.

## [1.0.0-alpha] - 2026-04-16

### Added
- Implementasi sistem versioning menggunakan Semantic Versioning (SemVer).
- Konfigurasi rilis alpha pertama.
- Setup GitHub Actions untuk versioning otomatis.
- Dokumentasi instalasi komprehensif di README.md.
- Dukungan Git tags untuk rilis versi.

### Changed
- Update versi aplikasi ke `1.0.0-alpha` di `package.json`.
- Restrukturisasi README.md untuk fokus pada panduan pengguna.
