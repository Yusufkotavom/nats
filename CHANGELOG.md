# Changelog

Semua perubahan penting pada proyek ini akan didokumentasikan di file ini.

Format ini didasarkan pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-05-08

### Added
- **2026-05-13 | Scope: POS Restaurant Service** - Menambahkan domain model restoran baru (`RestaurantOrder`, `RestaurantOrderItem`, `KitchenTicket`, `KitchenTicketItem`) termasuk enum status order/kitchen untuk mendukung alur meja -> dapur -> billing secara persist. **Impact:** operasional dine-in bayar belakangan kini punya jejak data per meja dan per station.
- Menambahkan laporan gabungan baru `Accounting > Reports > Full Report` (`/accounting/reports/full`) yang menggabungkan Profit & Loss, Balance Sheet, dan Cash Flow dalam satu halaman dengan filter periode, as-of date, serta mode komparatif.
- Menambahkan progress bar global (top loading indicator) untuk UX universal: aktif saat navigasi/link klik, submit form, dan aksi klik tombol, lalu selesai otomatis saat proses selesai/route berubah.
- Menambahkan halaman baru `Inventory > Adjustments` (`/inventory/adjustments`) dengan UI table inline edit untuk stock opname/penyesuaian: input `actual stock` per produk, catatan per baris, catatan header, preview selisih (`diff`) dan dampak nominal.
- Menambahkan halaman admin baru `Settings > Data Reset` (`/admin/settings/data-reset`) untuk reset data transaksi secara cepat saat testing (purchase/sales/POS/movement/journal/outbox) tanpa menghapus user dan master data.
- Menambahkan unit test `lib/accounting/account-name-i18n.test.ts` untuk validasi mapping nama akun bilingual, fallback akun custom, dan formatting label akun.
- Menambahkan test `prisma/seed/restaurant-minimal-accounting.test.ts` untuk memastikan mode akun minimal restoran tetap memetakan semua `DefaultAccountPurpose` dan semua kode akun mapping termasuk dalam daftar akun aktif minimal.
- Menambahkan baseline contact pada `seed-restaurant-minimal` untuk operasional hari pertama: `Walk-in Customer` (customer default POS) dan `General Vendor` (vendor default purchasing).
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
- **2026-05-13 | Scope: Prisma Config / Docker Migrate** - Menambahkan `migrations.path: "prisma/migrations"` pada `prisma.config.ts` sehingga Prisma 7 CLI benar-benar menemukan folder migrasi. Sebelumnya `prisma migrate status/deploy/resolve` selalu melaporkan "No migration found in prisma/migrations" karena Prisma 7 mewajibkan field `path` ini eksplisit saat `schema` berupa folder; akibatnya sidecar `migrate` di `docker-compose.yml` jatuh ke fallback `|| npx prisma db push` dan tabel `_prisma_migrations` tetap kosong, termasuk membuat runtime error `P2021 relation "public.RestaurantOrder" does not exist` di halaman `/pos/restaurant` karena migrasi baru tidak pernah ter-apply ke container DB. **Impact:** `prisma migrate deploy` kini berjalan normal (no-op jika DB sudah sinkron), `_prisma_migrations` ter-populate untuk 5 migrasi existing, dan startup container berikutnya memakai jalur migrate resmi (bukan fallback `db push`).
- **2026-05-13 | Scope: POS Dining Guard** - Menambahkan guard penutupan meja di `DiningSpotService.closeSpot` agar meja tidak bisa ditutup jika masih ada order restoran berstatus open/billing. **Impact:** mencegah kehilangan jejak transaksi meja sebelum settlement selesai.
- Memperbaiki alur integrasi `Cash Bank` saat create transaksi agar relasi jurnal tidak lagi gagal FK: handler `CASH_TRANSACTION_CREATE_REQUESTED` kini mengaitkan `CashTransaction.journalEntryId` berdasarkan `entryNumber` jurnal yang benar-benar terbentuk (bukan placeholder id), serta menormalkan `contactId/departmentId/projectId` kosong menjadi `null` agar tidak memicu FK error.
- Memperbaiki header `Inventory Movement` untuk tipe `ADJUSTMENT` agar warehouse yang dipilih tersimpan konsisten pada `fromWarehouseId` dan `toWarehouseId` (tidak hilang di histori movement).
- Memperbaiki alur `MovementType.ADJUSTMENT` agar benar-benar memperbarui kuantitas stok (sebelumnya belum mengubah stok), termasuk skenario penyesuaian naik/turun.
- Menambahkan posting jurnal otomatis saat `Stock Adjustment` diposting:
  - selisih negatif: `Dr Uncategorized Expense / Cr Inventory Asset`,
  - selisih positif: `Dr Inventory Asset / Cr Uncategorized Income`.
- Memperbaiki ketidakseimbangan jurnal POS saat fee multi-line aktif (`debit must equal credits`) dengan menyelaraskan payload event `SALES_INVOICE_ISSUED` dari POS: komponen `shippingCost` (fee non-tax) dan `tax` kini dikirim eksplisit sehingga sisi kredit jurnal sama dengan total invoice.
- Memperbaiki alur `Quick Purchase` agar pembuatan `Purchase Invoice` tidak lagi mengirim field item yang sudah tidak ada di schema (`productId`/`purchaseOrderItemId`), sehingga error Prisma `Unknown argument 'productId'` saat proses quick order teratasi.
- Memperbaiki renderer halaman docs agar markdown tidak tampil plain:
  - mengaktifkan `remark-gfm` pada `ReactMarkdown` untuk mendukung tabel/list GFM,
  - menambahkan styling render tabel agar terbaca baik (termasuk overflow horizontal),
  - menghapus heading pertama yang duplikat jika sama dengan judul frontmatter.
- Memperbaiki test suite yang gagal karena missing mock untuk `next/navigation`, `next-intl/server`, dan `next/headers` dengan menambahkan mock global di `vitest.setup.ts` dan mock `generateDocumentNumber` di test service yang membutuhkan.
- Memperbaiki test purchase/sales service yang gagal karena import chain `lib/auth/auth.ts` -> `next-intl/server` dengan menambahkan mock lengkap di setiap test file.

### Changed
- **2026-05-13 | Scope: Inventory Adjustments** - Menambahkan dialog konfirmasi + ringkasan perubahan (warehouse, jumlah baris berubah, count kenaikan/penurunan, total dampak nominal, dan daftar baris yang berubah) sebelum aksi `Post Adjustment` di `/inventory/adjustments`; aksi mutasi baru dipanggil setelah user menekan "Post Sekarang". **Impact:** mengurangi risiko post stock adjustment tidak sengaja yang men-trigger inventory movement + jurnal akuntansi yang tidak dapat dibatalkan otomatis.
- **2026-05-13 | Scope: POS Flow Dine-In** - Menambah flow deferred payment di POS: `send-to-kitchen` membuat order+tiket dapur, `generate bill` membuat invoice `ISSUED`, dan `settle bill` memproses payment terpisah; juga menambah halaman baru `/pos/restaurant`, `/pos/restaurant/kitchen`, `/pos/restaurant/billing`. **Impact:** alur restoran pesan dulu bayar belakangan berjalan tanpa jurnal kas prematur.
- Merombak pengalaman `/docs` menjadi shell dokumentasi resmi ala Nextra: topbar docs khusus, sidebar navigasi sectioned (desktop + mobile drawer), breadcrumb, pager prev/next berbasis kartu, TOC sticky dengan active heading sync, dan search docs lokal (client-side) dari judul/slug/ringkasan.
- Menambahkan dukungan `product bundle/paket` berbasis BOM aktif pada alur `Sales Shipment` saat status diubah ke `COMPLETED`: stok dan COGS kini otomatis dikonsumsi dari komponen BOM jika tersedia, dengan fallback ke produk jual langsung jika BOM tidak ada.
- Menambahkan shortcut menu sidebar `HR > Salary Structures` yang mengarah langsung ke `/hr/payroll/salary-structures` untuk mempercepat setup struktur gaji.
- Menyelaraskan UI `Purchase > Quick Purchase` dengan pola form `Purchase Invoice` dengan menambahkan dimensi konteks transaksi yang sama (`Department` dan `Project`) serta sumber data select-nya pada loader form quick purchase.
- Mengubah konfigurasi biaya POS dari model tunggal menjadi **multi fee lines** di `Admin > Settings > POS`:
  - biaya dapat ditambah satu per satu (add/remove),
  - tiap baris biaya bisa ditentukan kategori (`Tax`/`Fee`) dan tipe nilai (`Percentage`/`Fixed`),
  - perhitungan checkout POS sekarang menjumlahkan seluruh fee aktif per baris.
- Menyelaraskan output nota/receipt POS agar menampilkan rincian baris biaya POS (bukan satu baris agregat saja), termasuk pada:
  - detail invoice POS,
  - receipt HTML preview,
  - receipt PDF.
- Memusatkan konfigurasi POS di modul `Admin > Settings > POS`:
  - pengaturan visibilitas produk POS tetap tersedia,
  - menambahkan pengaturan biaya checkout POS (`Service Charge %`, `Tax %`, `Additional Fee Label`, `Additional Fee Amount`) dalam satu halaman terpusat.
- Menyelaraskan flow checkout POS agar biaya dari setting POS ikut dihitung di cart dan diposting konsisten ke transaksi:
  - `SalesOrder.totalAmount` dan `SalesInvoice.totalAmount` sekarang mencerminkan biaya service/tax/biaya tambahan,
  - `SalesOrder.taxAmount` dan `SalesInvoice.totalTax` menyimpan nominal pajak POS,
  - `SalesInvoice.shippingCost` dipakai sebagai penampung total biaya tambahan non-item pada POS.
- Menyelaraskan tampilan detail invoice/struk POS agar menampilkan komponen `Tax` dan `Additional Fee` saat nilainya ada.
- Menyesuaikan UX daftar `Purchase Invoice`: kolom nomor invoice sekarang klikable dan langsung membuka halaman edit invoice (`/purchase/invoices/[id]/edit`) untuk mempercepat revisi dokumen draft.
- Menyesuaikan UX daftar `Purchase Order`: kolom nomor PO sekarang klikable dan langsung membuka halaman edit PO (`/purchase/orders/[id]/edit`) untuk mempercepat workflow revisi.
- Memperbaiki mapping default account seed (`default` dan `restaurant-minimal`) untuk `GOODS_RECEIVED_NOT_INVOICED` agar memakai akun dedicated `21110 - Goods Received Not Invoiced` (tidak lagi sama dengan `ACCOUNTS_PAYABLE`), sehingga jurnal purchase invoice tidak terlihat seperti jurnal payment.
- Menyederhanakan akun aktif pada `seed-restaurant-minimal` agar fokus ke transaksi inti operasional restoran: akun posting non-esensial dinonaktifkan pada mode minimal, tetapi seluruh `DefaultAccountPurpose` tetap dipetakan agar halaman `Accounting > Configuration > Default Accounts` tetap lengkap.
- Meningkatkan renderer halaman docs (`/[locale]/docs/[...slug]`) agar tampil seperti dokumentasi resmi: layout 3-kolom (navigasi + konten + TOC), tipografi markdown yang lebih kuat, anchor heading otomatis, style code/table/blockquote/link yang lebih rapi, serta metadata header dokumentasi.
- Hardening seeder default account di `prisma/seed/accounting.ts`: setiap `DefaultAccountPurpose` kini dipastikan hanya punya satu mapping aktif, dan mapping existing akan diaktifkan kembali (`isActive=true`) saat seed dijalankan.
- Menambahkan helper verifikasi terpusat `prisma/seed/default-accounts.ts` dan mengadopsinya di `prisma/seed.ts` untuk validasi default account transaksi harian yang konsisten.
- Menambahkan verifikasi wajib di `prisma/seed-restaurant-minimal.ts` agar seluruh enum `DefaultAccountPurpose` tersedia dan aktif; seed akan fail-fast jika ada yang hilang atau duplikat aktif.
- Mengubah seed aktif default (`npm run prisma db seed`) dari dataset demo menjadi baseline minimal (company + accounting + users) agar setup awal fokus ke akun akuntansi inti untuk transaksi harian.
- Menambahkan verifikasi wajib pada seed aktif untuk memastikan mapping default account inti tersedia (`CASH_ON_HAND`, `BANK`, `ACCOUNTS_RECEIVABLE`, `ACCOUNTS_PAYABLE`, `SALES_REVENUE`, `COGS`, `INVENTORY_ASSET`, `OPENING_BALANCE_EQUITY`); seed akan gagal jika ada yang belum termapping.
- Memisahkan dataset demo ke entrypoint baru `prisma/seed-demo.ts` dengan script `npm run prisma:seed:demo` agar tetap tersedia untuk kebutuhan testing end-to-end.
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
- Memperbaiki alur POS agar saat checkout selesai sistem tidak hanya mengurangi stok, tetapi juga mem-posting jurnal COGS (`Dr COGS / Cr Inventory Asset`) berdasarkan biaya rata-rata item/komponen yang benar-benar keluar.
- Memperbaiki aksi hapus pada daftar `Purchase Order` agar memeriksa hasil server action (`success/error`) sebelum menampilkan notifikasi; kegagalan hapus (mis. status non-`DRAFT`) kini menampilkan pesan error yang benar, bukan sukses palsu.
- Memperbaiki auto-fill harga pada form `Purchase Order`: saat item memakai `purchase unit` dengan conversion factor (contoh `BOX -> PCS`), `unitCost` kini otomatis dikonversi ke harga per purchase unit (misalnya 2.200 × 50 = 110.000), bukan lagi memakai harga per base unit mentah.
- Menambahkan test `lib/inventory/purchase-pricing.test.ts` untuk mengunci rumus konversi `cost x purchaseConversionFactor` agar kasus harga beli per box tidak regress.
- Menambahkan guard test `prisma/seed/restaurant-minimal-accounting.test.ts` untuk memastikan akun default `ACCOUNTS_PAYABLE` dan `GOODS_RECEIVED_NOT_INVOICED` selalu berbeda agar mismatch mapping tidak terulang.
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
- **2026-05-13 | Scope: Docs POS Restoran** - Memperbarui `docs/architecture.md`, `docs/restaurant-pos-inventory-sync.md`, `docs/user-guide/modules/pos.md`, dan `docs/docs-index.json` untuk mendokumentasikan alur baru table-kitchen-billing. **Impact:** SOP user dan kontrak arsitektur sinkron dengan implementasi terbaru.
- Memperbarui `docs/user-guide/modules/pos.md` dengan bagian baru pengaturan biaya POS terpusat (`Admin > Settings > POS`) dan dampaknya ke perhitungan total POS.
- Memperbarui `docs/user-guide/01-setup-awal.md` untuk menjelaskan validasi default account pada seed minimal umum dan seed minimal restoran, termasuk perilaku fail-fast saat mapping tidak lengkap.
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
