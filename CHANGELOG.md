# Changelog

Semua perubahan penting pada proyek ini akan didokumentasikan di file ini.

Format ini didasarkan pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-05-08

### Added
- Menambahkan unit test `lib/accounting/account-name-i18n.test.ts` untuk validasi mapping nama akun bilingual, fallback akun custom, dan formatting label akun.
- Menambahkan fondasi `POS restoran` fase 1:
  - model data baru `DiningArea`, `DiningSpot`, `DiningSpotSession` + enum status/tipe/service di schema POS,
  - service domain `DiningSpotService` untuk lifecycle buka/tutup spot,
  - action server POS untuk `getDiningSpots`, `openDiningSpot`, `closeDiningSpot`.
- Menambahkan test baru untuk `DiningSpotService` (`modules/pos/services/dining-spot.service.test.ts`) untuk validasi alur open/close spot.
- Menambahkan test coverage alur checkout POS restoran berbasis status meja aktif di `modules/pos/services/pos-transaction.service.test.ts`:
  - checkout ditolak saat spot belum siap billing (`AVAILABLE`),
  - checkout mengubah status spot ke `BILLING` saat spot aktif (`ORDERING`).
- Menambahkan mode `PREORDER_DP` pada `Quick Purchase`:
  - flow otomatis `Receive -> Invoice -> Payment (DP parsial)`,
  - output menyertakan `remainingPayableAmount` untuk sisa hutang.
- Menambahkan test quick purchase untuk mode `PREORDER_DP` di `app/[locale]/(dashboard)/purchase/quick/actions.test.ts`.
- Menambahkan test `getPOSProducts` di `app/[locale]/pos/actions.test.ts` untuk memastikan filter produk POS memakai `isActive + showInPos`.
- Menambahkan CRUD `DiningArea` dan `DiningSpot` di dashboard POS:
  - halaman baru `/pos/dining-spots`,
  - action create/update/delete berbasis `DiningSpotService`,
  - proteksi hapus area yang masih punya spot dan hapus spot yang belum `AVAILABLE`.
- Menambahkan test service untuk skenario CRUD `DiningArea`/`DiningSpot` di `modules/pos/services/dining-spot.service.test.ts`.
- Menambahkan test coverage untuk action `Quick Purchase` (`app/[locale]/(dashboard)/purchase/quick/actions.test.ts`) dengan 12 test case mencakup:
  - Jalur sukses `CASH_DAILY` (receive + invoice + payment)
  - Jalur sukses `MONTHLY_CREDIT` (receive + invoice tanpa payment)
  - Validasi field wajib (vendor, items, cash account)
  - Fail path untuk setiap langkah orkestrasi (receive creation/completion, invoice creation/posting, payment creation/posting)

### Fixed
- Memperbaiki renderer halaman docs agar markdown tidak tampil plain:
  - mengaktifkan `remark-gfm` pada `ReactMarkdown` untuk mendukung tabel/list GFM,
  - menambahkan styling render tabel agar terbaca baik (termasuk overflow horizontal),
  - menghapus heading pertama yang duplikat jika sama dengan judul frontmatter.
- Memperbaiki test suite yang gagal karena missing mock untuk `next/navigation`, `next-intl/server`, dan `next/headers` dengan menambahkan mock global di `vitest.setup.ts` dan mock `generateDocumentNumber` di test service yang membutuhkan.
- Memperbaiki test purchase/sales service yang gagal karena import chain `lib/auth/auth.ts` -> `next-intl/server` dengan menambahkan mock lengkap di setiap test file.

### Changed
- Menambahkan dukungan bilingual nama akun (`en`/`id`) berbasis helper modular `lib/accounting/account-name-i18n.ts` dengan fallback aman ke nama akun di database untuk akun custom.
- Menyelaraskan seluruh surface accounting utama agar menampilkan label akun terlokalisasi sesuai locale aktif (`next-intl`): Chart of Accounts, dialog tambah akun, Default Accounts mapping, Ledger account selector, Journal Entry form, dan Journal Entry details.
- Menyelaraskan flow POS agar order dapat dikaitkan ke spot meja/lokasi:
  - `holdOrder` dan held-order payload sekarang mendukung `diningSpotId`,
  - tampilan POS menambahkan selector spot + indikator status + aksi buka/tutup spot,
  - daftar held order menampilkan informasi spot dan me-restore spot saat resume order.
- Menambahkan guard transaksi POS untuk mode restoran:
  - checkout dengan `diningSpotId` hanya valid saat spot dalam status `ORDERING`/`BILLING`,
  - status spot di-update ke `BILLING` saat checkout diproses.
- Menyelaraskan layout halaman `Purchase > Quick Purchase` dengan pola `/purchase/invoices/new`: menggunakan wrapper `flex-1 space-y-4 px-4`, header + action bar di atas, section form berbasis `Card`, dan field catatan memakai `CustomTextarea` untuk konsistensi UI purchase.
- Menambahkan kontrol visibilitas produk POS melalui flag produk `showInPos` (default aktif), dan POS sekarang hanya menampilkan produk `isActive` + `showInPos`.
- Menambahkan menu navigasi POS untuk akses cepat ke manajemen meja/lokasi (`/pos/dining-spots`).
- Menambahkan pengaturan global visibilitas produk POS:
  - `POS_ONLY` (default, ikut `showInPos`),
  - `ALL_ACTIVE` (semua produk aktif tampil di POS).
- Memisahkan pengaturan POS ke modul terpisah `Admin > Settings > POS` (`/admin/settings/pos`) agar mengikuti pola modular settings.
- POS transaction flow sekarang melakukan konsumsi bahan berbasis BOM aktif bila tersedia, bukan hanya mengurangi stok produk jual.
- Fallback tetap dipertahankan: jika BOM tidak tersedia, sistem tetap mengurangi stok produk jual (backward compatible).
- Mengubah default formatter `formatCurrency()` dari `USD` ke `IDR` dan default locale ke `id-ID`, serta membuat opsi `locale` benar-benar dipakai agar tampilan nominal lintas modul konsisten mengikuti konteks Indonesia.
- Menyesuaikan script `start` agar menggunakan server standalone (`node .next/standalone/server.js`) sesuai konfigurasi build `output: standalone`.
- Menyesuaikan alur `Purchase Invoice` agar nomor invoice mengikuti konfigurasi `Admin > Settings > Document Numbering`: jika dikosongkan maka sistem auto-generate `PURCHASE_INVOICE`, namun input manual tetap didukung.
- Menambahkan shortcut menu `Accounting > Default Accounts` di sidebar ke route `/accounting/configuration/default-accounts` agar setup akun default (termasuk `GOODS_RECEIVED_NOT_INVOICED`) dapat diakses langsung.
- Menyempurnakan default account mapping untuk skenario operasional awam pada seed/setup: menambahkan pemetaan `GOODS_RECEIVED_NOT_INVOICED`, `WIP_INVENTORY`, dan `PRODUCTION_OVERHEAD` agar modul purchase/production siap dipakai tanpa mapping kosong.
- Menyempurnakan `seed-restaurant-minimal` untuk skenario restoran yang lebih realistis: menambahkan bahan dapur lanjutan (bumbu, kecap, telur, LPG), memperbaiki harga/cost dasar bahan, serta mengisi konfigurasi `baseUnit`, `purchaseUnit`, `salesUnit`, dan conversion factor per produk.
- Menyesuaikan `seed-restaurant-minimal` dengan menghapus LPG dari master bahan dan BOM agar biaya gas dicatat sebagai pengeluaran umum/overhead, bukan konsumsi bahan per porsi.
- Menambahkan `Quick Purchase` fase 1 (`Cash Daily` dan `Monthly Credit`) dalam satu alur ringkas yang mengorkestrasi dokumen Purchase Receive, Purchase Invoice, dan Purchase Payment (khusus cash).
- Menambahkan akses menu sidebar `Purchase > Quick Purchase` beserta label i18n (`en`/`id`) untuk mempercepat operasional belanja harian/bulanan.

### Fixed
- Memperbaiki form `Purchase Receive` agar tombol `Update/Create` di header benar-benar men-submit form (sebelumnya berada di luar `<form>` tanpa binding) dan aksi `Mark as Completed` sekarang langsung submit dengan status `COMPLETED`.
- Memastikan label akun standar tidak lagi hardcoded ke bahasa Inggris pada halaman accounting yang sebelumnya merender `account.name` secara langsung.
- Menambahkan guard tegas untuk mencegah konsumsi BOM non-integer pada model stok yang masih integer agar tidak terjadi drift stok diam-diam.
- Menampilkan kembali aksi `Edit` pada menu dropdown daftar BOM di halaman production BOM list.
- Memperbaiki menu Budgeting agar tidak lagi mengarah ke route yang belum tersedia (`/budgeting/dashboard`, `/budgeting/plans`, `/budgeting/variance`) sehingga menghilangkan error 404 pada navigasi.
- Memperbaiki crash halaman `/budgeting/budgets/new` (`TypeError: ...map is not a function`) dengan memastikan data `projects` yang dikirim ke form selalu berupa array dan menambahkan guard deserialisasi array pada `BudgetForm`.
- Memperbaiki crash/empty state halaman `/budgeting` (`Cannot read properties of undefined (reading 'name')`) dengan memetakan `createdBy` ke data user secara manual pada action budget list dan menambahkan fallback render aman bila data user tidak ditemukan.
- Memperbaiki kegagalan build Vercel `Module not found: '@/prisma/generated/prisma/*'` dengan memastikan `prisma generate` selalu dijalankan sebelum `next build`.
- Memperbaiki input tanggal pada form Sales/Purchase Invoice agar mengikuti `dateFormat` dari Company Settings (termasuk input manual), sehingga tidak lagi terkunci pada format browser `MM/dd/yyyy`.
- Mengembalikan calendar picker pada field tanggal Sales/Purchase Invoice (dengan input manual tetap aktif) agar pemilihan tanggal via klik dan format sesuai settings bisa berjalan bersamaan.
- Memperbaiki aksi tombol `New Purchase Invoice` agar menggunakan `router.push` langsung (menghindari kasus klik tidak terdeteksi pada kombinasi `Button asChild + Link`).
- Menambahkan fallback hard navigation (`window.location.assign`) pada tombol `New Purchase Invoice` dengan locale aktif agar klik tetap bekerja saat client routing tidak merespons.
- Memperbaiki tombol `Create` pada form `New Purchase Invoice` dengan mengaitkan tombol submit ke elemen form (`form=\"purchase-invoice-form\"`) karena tombol berada di header di luar tag `<form>`.

### Docs
- Memperbarui `docs/client-e2e-alignment-form.md` agar pertanyaan lebih detail namun non-teknis (lebih mudah diisi user/client operasional), lalu regenerate versi kirim `docs/client-e2e-alignment-form.docx`.
- Memperluas dokumentasi user-facing POS di `docs/user-guide/modules/pos.md` dengan panduan operasional restoran yang lebih detail: dining spot (meja/lokasi), hold-resume, status spot, validasi checkout, dan troubleshooting cepat.
- Menambahkan dokumen user-facing `docs/user-guide/modules/client-kickoff-questionnaire.md` untuk daftar pertanyaan wajib saat meeting kickoff client (E2E alignment).
- Menambahkan blueprint implementasi `POS restoran` di `docs/pos-restaurant-extension-plan.md` mencakup master area/meja-kamar, indikator status meja, binding order ke spot, kitchen ticket/station, lifecycle buka-tutup meja, desain data Prisma, roadmap phase, dan test plan.
- Memperbarui `docs/docs-index.json` untuk mendaftarkan dokumen `pos-restaurant-extension-plan`.
- Menambahkan template khusus Google Forms di `docs/client-e2e-alignment-google-form.md` berisi struktur section, tipe pertanyaan, opsi jawaban, dan aturan pengisian cepat untuk alignment implementasi POS-Inventory-Dapur-Purchase-Accounting.
- Memperbarui `docs/docs-index.json` untuk mendaftarkan dokumen `client-e2e-alignment-google-form`.
- Menambahkan template form perencanaan implementasi end-to-end untuk client di `docs/client-e2e-alignment-form.md` dengan format opsi cepat + catatan mencakup alignment POS, persediaan barang dagang, pencatatan dapur/BOM, purchase, accounting, approval, laporan, dan prioritas MVP/Phase 2.
- Memperbarui `docs/docs-index.json` untuk mendaftarkan dokumen planning template `client-e2e-alignment-form`.
- Menambahkan `AGENTS.md` berisi aturan wajib/larangan implementasi, changelog policy, dan definition of done.
- Menambahkan `CLAUDE.md` sebagai baseline panduan agent yang merujuk ke `AGENTS.md`.
- Menambahkan `docs/architecture.md` untuk memperjelas struktur layer dan alur kritis POS -> Inventory.
- Menambahkan `docs/docs-index.json` sebagai registry dokumen berbasis JSON untuk tracking update dokumen.
- Menambahkan dokumentasi domain restoran di `docs/restaurant-pos-inventory-sync.md`.
- Memperbarui `README.md` agar merujuk seluruh dokumen engineering penting.
- Menegaskan aturan wajib membuat test baru jika perubahan/fitur belum memiliki coverage test, dan menyinkronkannya di `AGENTS.md`, `CLAUDE.md`, serta `docs/docs-index.json`.
- Memperbarui user guide setup awal untuk user non-akuntansi dengan urutan input dari nol sampai siap transaksi, serta memperjelas posisi budgeting minimum (`Default/Global` status `APPROVED`).
- Menambahkan panduan arah jurnal saldo awal kas/bank (debit kas/bank, kredit ekuitas saldo awal/modal) pada setup awal agar user non-akuntansi tidak keliru.
- Memperbarui dokumentasi modul budgeting dengan aturan edit: hanya status `DRAFT` atau `REJECTED` yang bisa diedit.
- Menambahkan dokumen audit kebutuhan implementasi `Quick Purchase` di `docs/quick-purchase-implementation-needs.md` dan mendaftarkannya ke `docs/docs-index.json` untuk tracking scope belanja harian cash, bulanan, dan pre-order/DP.
- Memperbarui user guide modul purchase dengan panduan penggunaan route `Quick Purchase` untuk flow cepat `cash harian` dan `credit bulanan`.
- Memperbarui `docs/quick-purchase-implementation-needs.md` menjadi dokumen gabungan audit + status implementasi (fase 1 sudah jalan, backlog fase 2/3 dan hardening).

### Added
- Menambahkan halaman edit budget `/budgeting/budgets/[id]/edit` dengan guard status (`DRAFT`/`REJECTED`) serta tombol `Edit` pada list/detail budget untuk status yang memenuhi syarat.

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
