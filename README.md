# Pasak — Enterprise Resource Planning System

Pasak adalah sistem ERP berbasis Next.js yang dirancang dengan arsitektur modular untuk menangani berbagai fungsi bisnis mulai dari akuntansi, inventaris, penjualan, pembelian, POS, hingga penggajian.

## Prasyarat

Sebelum memulai, pastikan perangkat Anda telah terinstal:
- **Node.js**: Versi 18.x atau lebih baru
- **NPM**: Biasanya terinstal bersama Node.js
- **PostgreSQL**: Database utama sistem
- **MinIO** (Opsional): Untuk penyimpanan file jika tidak menggunakan storage lokal
- **SMTP Server** (Opsional): Untuk fitur pengiriman email (seperti verifikasi akun pengguna)

---

## Langkah Instalasi

Ikuti langkah-langkah di bawah ini untuk menjalankan projek di lingkungan lokal Anda:

### 1. Klon Repositori
```bash
git clone <url-repository-ini>
cd pasak
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env` dan sesuaikan nilai variabel di dalamnya:
```bash
cp .env.example .env
```

Edit file `.env` dan isi variabel berikut:

#### Variabel Wajib

| Variabel | Deskripsi | Contoh |
|---|---|---|
| `DATABASE_URL` | URL koneksi PostgreSQL untuk database **tenant** (data bisnis) | `postgresql://user:password@localhost:5432/pasak` |
| `MANAGEMENT_DATABASE_URL` | URL koneksi PostgreSQL untuk database **management** (tenant, user, role) | `postgresql://user:password@localhost:5432/pasak_management` |

#### Variabel Opsional

| Variabel | Deskripsi | Default |
|---|---|---|
| `STORAGE_DRIVER` | Driver penyimpanan file (`local` atau `minio`) | `local` |
| `MAX_FILE_SIZE` | Ukuran maksimal file upload dalam bytes | `5242880` (5MB) |
| `MINIO_ENDPOINT` | Endpoint server MinIO | `play.min.io` |
| `MINIO_PORT` | Port server MinIO | `9000` |
| `MINIO_ACCESS_KEY` | Access key MinIO | - |
| `MINIO_SECRET_KEY` | Secret key MinIO | - |
| `MINIO_BUCKET_NAME` | Nama bucket MinIO | `pasak-files` |
| `SMTP_HOST` | Host SMTP server | - |
| `SMTP_PORT` | Port SMTP server | - |
| `SMTP_USER` | Username SMTP | - |
| `SMTP_PASS` | Password SMTP | - |
| `SMTP_FROM` | Alamat email pengirim | - |
| `INTEGRATION_DISPATCH_KEY` | Kunci rahasia untuk otentikasi worker | - |

### 4. Membuat Database PostgreSQL

Buat dua database di PostgreSQL — satu untuk **management** (data tenant, user, role) dan satu untuk **tenant** (data bisnis ERP):

```bash
# Masuk ke PostgreSQL
psql -U postgres

# Buat database management
CREATE DATABASE pasak_management;

# Buat database tenant (data bisnis)
CREATE DATABASE pasak;

# Keluar
\q
```

> **Catatan:** Nama database harus sesuai dengan yang dikonfigurasi pada `DATABASE_URL` dan `MANAGEMENT_DATABASE_URL` di file `.env`.

### 5. Sinkronisasi Database (Prisma)

Projek ini menggunakan **arsitektur dual-database** dengan Prisma:
- **Management Database** — Mengelola data multi-tenant (tenant, user, role)
- **Tenant Database** — Menyimpan data bisnis ERP (akuntansi, inventaris, penjualan, dll.)

#### 5a. Generate Prisma Client

Generate kedua Prisma client (tenant dan management):
```bash
# Generate Prisma Client untuk tenant database (schema di prisma/schema/)
npx prisma generate

# Generate Prisma Client untuk management database (schema di prisma/management/)
npx prisma generate --schema=prisma/management/schema.prisma
```

#### 5b. Jalankan Migrasi Database

Terapkan skema database ke PostgreSQL:
```bash
# Migrasi tenant database
npx prisma migrate dev

# Migrasi management database
npx prisma migrate dev --schema=prisma/management/schema.prisma
```

#### 5c. Seed Data Awal
```bash
npx prisma db seed
```

Lihat bagian [Seed Database](#seed-database) di bawah untuk detail lengkap data yang di-seed.

### 6. Menjalankan Aplikasi
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## Arsitektur Database

Pasak menggunakan arsitektur **dual-database** untuk mendukung multi-tenancy:

```
┌─────────────────────────────┐    ┌─────────────────────────────────┐
│   MANAGEMENT DATABASE       │    │   TENANT DATABASE               │
│   (pasak_management)        │    │   (pasak)                       │
│                             │    │                                 │
│   ├── Tenant                │    │   ├── CompanyProfile            │
│   ├── User                  │    │   ├── Account (Chart of Account)│
│   ├── Role                  │    │   ├── Product                   │
│   ├── TenantMember          │    │   ├── Contact (Customer/Vendor) │
│   ├── TenantBilling         │    │   ├── SalesOrder                │
│   ├── TenantPaymentHistory  │    │   ├── SalesInvoice              │
│   └── VerificationToken     │    │   ├── PurchaseOrder             │
│                             │    │   ├── JournalEntry              │
│                             │    │   ├── Warehouse                 │
│                             │    │   └── ... (modul bisnis lainnya)│
└─────────────────────────────┘    └─────────────────────────────────┘
         │                                        │
         │  MANAGEMENT_DATABASE_URL                │  DATABASE_URL
         │  (prisma/management/schema.prisma)      │  (prisma/schema/*.prisma)
         └────────────────────────────────────────-─┘
```

### Tenant Database

Database ini menyimpan **data bisnis ERP** yang dikelompokkan dalam skema modular di folder `prisma/schema/`:

| File Schema | Modul |
|---|---|
| `01_general.prisma` | Company Profile, Roles, Permissions |
| `02_integration.prisma` | Outbox Pattern untuk integrasi antar-modul |
| `03_accounting.prisma` | Chart of Accounts, Journal Entry, Fiscal Year |
| `04_people.prisma` | Employee, Department |
| `05_inventory.prisma` | Product, Warehouse, Stock Movement |
| `06_purchasing.prisma` | Purchase Order, Purchase Invoice, Goods Receipt |
| `07_cash_bank.prisma` | Cash & Bank, Payment |
| `08_sales.prisma` | Sales Order, Sales Invoice, Delivery |
| `09_asset.prisma` | Fixed Asset Management |
| `10_pos.prisma` | Point of Sale |
| `11_reporting.prisma` | Custom Report |
| `13_budgeting.prisma` | Budget Management |
| `14_payroll.prisma` | Payroll, Salary Component |
| `15_hr.prisma` | HR Project & Timesheet |

---

## Seed Database

Perintah `npx prisma db seed` akan mengisi kedua database (management dan tenant) dengan data awal. Berikut detail lengkapnya:

### Data Management (Tenant & User)

Seed secara otomatis membuat data berikut di **management database**:

#### Tenant Default

| Field | Nilai |
|---|---|
| Nama | Default Tenant |
| Slug | `default` |
| DB URL | Mengambil dari `DATABASE_URL` di `.env` |

#### Role yang Tersedia

| Role | Deskripsi | Permission |
|---|---|---|
| `superadmin` | Super Administrator | `*` (akses penuh) |
| `Accountant` | Akuntan | `accounting.view`, `accounting.create`, `reports.view`, `budgeting.view`, `budgeting.create` |
| `Cashier` | Kasir POS | `pos.access`, `sales.create`, `sales.view`, `sales.payments`, `products.view`, `customers.create`, `customers.view`, `inventory.view` |
| `Manager` | Manajer Department | `hr.view`, `hr.create`, `budgeting.view`, `budgeting.approve` |

#### User Default

Semua user menggunakan password: **`password123`**

| Email | Nama | Role |
|---|---|---|
| `admin@example.com` | Admin User | superadmin |
| `cashier@example.com` | Jane Cashier | Cashier |
| `accountant@example.com` | John Accountant | Accountant |
| `manager@example.com` | Mike Manager | Manager |

> **⚠️ Penting:** Segera ubah password default setelah login pertama kali di lingkungan production.

### Data Tenant (Bisnis ERP)

Seed juga mengisi **tenant database** dengan data contoh berikut:

| Modul Seed | Data yang Dibuat |
|---|---|
| `seedCompany()` | Profil perusahaan (NATS Accounting) |
| `seedAccounting()` | Chart of Accounts, Tax Rates |
| `seedUsers()` | Roles & Users di management DB (lihat tabel di atas) |
| `seedInventory()` | Warehouse, Unit of Measure, Kategori Produk, Produk (dengan SKU) |
| `seedContacts()` | Customer (cth: Acme Corp) dan Vendor (cth: Office Supplies Co) |
| `seedHR()` | Department, Employee, Salary Component |
| `seedProjects()` | Contoh Proyek |
| `seedTransactions()` | Sales Order, Sales Invoice, Purchase Order, Journal Entry (Opening Balance) |

#### Urutan Eksekusi Seed

Seed dijalankan berurutan karena ada dependensi antar-modul:

```
1. Company      → Profil perusahaan (tidak ada dependensi)
2. Accounting   → Chart of Accounts, Tax Rates
3. Users        → Roles, Users, Tenant (management DB)
4. Inventory    → Warehouse, Products (membutuhkan Company)
5. Contacts     → Customer, Vendor
6. HR           → Department, Employee, Salary
7. Projects     → Proyek
8. Transactions → Sales, Purchase, Journal Entry (membutuhkan semua di atas)
```

> **Catatan:** Semua seed menggunakan strategi `upsert`, sehingga aman dijalankan berulang kali tanpa duplikasi data.

---

## Modul Bisnis

Pasak terdiri dari modul-modul bisnis berikut yang tersedia di direktori `modules/`:

| Modul | Direktori | Deskripsi |
|---|---|---|
| Akuntansi | `modules/accounting/` | Chart of Accounts, Journal Entry |
| Kas & Bank | `modules/cash-bank/` | Transaksi kas, transfer, sinkronisasi |
| Aset Tetap | `modules/fixed-assets/` | Manajemen aset dan penyusutan |
| SDM | `modules/hr/` | Data karyawan |
| Integrasi | `modules/integration/` | Outbox pattern, event handlers |
| Inventaris | `modules/inventory/` | Produk, gudang, stok |
| Penggajian | `modules/payroll/` | Slip gaji, komponen gaji |
| Plugin | `modules/plugins/` | Registrasi modul dan permission |
| POS | `modules/pos/` | Point of Sale, sesi kasir |
| Produksi | `modules/production/` | BOM, produksi, receipt |
| Pembelian | `modules/purchase/` | PO, invoice, pembayaran, retur |
| Pelaporan | `modules/reporting/` | Custom report registry |
| Penjualan | `modules/sales/` | SO, invoice, pengiriman, retur |

---

## Fitur Utama & Operasional

### Integration Outbox & Worker
Projek ini menggunakan pola Outbox untuk memastikan operasi antar-modul bersifat retryable dan idempotent.
- **Worker CLI**: Untuk menjalankan pemrosesan outbox secara manual:
  ```bash
  npm run outbox:work
  ```
- **Penyelesaian Inline**: Secara default, operasi diproses secara inline. Untuk mode async murni, atur `INTEGRATION_PROCESS_INLINE=false`.

### Internasionalisasi (i18n)
Dukungan bahasa Inggris dan Indonesia tersedia di folder `messages/`. Untuk validasi file i18n:
```bash
npm run i18n:validate
```

### Testing
Unit test tersedia menggunakan Vitest:
```bash
npm run test
```

---

## Struktur Direktori

```
pasak/
├── app/                        # Routing (Next.js App Router)
│   ├── [locale]/               # Routing per bahasa (i18n)
│   │   ├── (marketing)/        # Landing page (pre-login)
│   │   ├── auth/               # Autentikasi (login, register)
│   │   ├── pos/                # Point of Sale
│   │   └── [tenant]/           # Dashboard tenant (post-login)
│   │       ├── accounting/     # Modul akuntansi
│   │       ├── inventory/      # Modul inventaris
│   │       ├── purchase/       # Modul pembelian
│   │       ├── sales/          # Modul penjualan
│   │       └── ...             # Modul lainnya
│   ├── api/                    # API Routes
│   │   ├── accounting/         # API akuntansi
│   │   ├── cash-bank/          # API kas & bank
│   │   ├── inventory/          # API inventaris
│   │   ├── purchase/           # API pembelian
│   │   └── ...                 # API lainnya
│   └── themes/                 # Konfigurasi tema
├── components/                 # Komponen UI reusable (shadcn/ui)
├── hooks/                      # Custom React hooks
├── i18n/                       # Konfigurasi internationalization
├── lib/                        # Utilitas, servis, dan konfigurasi
│   ├── accounting/             # Servis akuntansi
│   ├── ai/                     # Integrasi AI
│   ├── auth/                   # Autentikasi & session
│   ├── permissions/            # Sistem permission RBAC
│   ├── prisma/                 # Prisma client (tenant & management)
│   ├── reporting/              # Reporting registry
│   └── validation/             # Schema validasi
├── messages/                   # File terjemahan (en.json, id.json)
├── modules/                    # Logika bisnis per modul (13 modul)
├── prisma/
│   ├── schema/                 # Schema Prisma tenant (14 file modular)
│   ├── management/             # Schema Prisma management
│   ├── seed/                   # Seed data per modul
│   └── migrations/             # File migrasi database
├── scripts/                    # Script utilitas (outbox worker, i18n)
├── tests/                      # Unit & architecture tests (Vitest)
└── public/                     # Asset statis
```

---

## Troubleshooting

### Database connection error
Pastikan PostgreSQL sudah berjalan dan kredensial di `.env` sudah benar:
```bash
pg_isready
```

### Prisma client belum ter-generate
Jika muncul error `Cannot find module '@prisma/client'`:
```bash
npx prisma generate
npx prisma generate --schema=prisma/management/schema.prisma
```

### Seed gagal dijalankan
Jika seed gagal, pastikan migrasi sudah berhasil terlebih dahulu:
```bash
npx prisma migrate dev
npx prisma migrate dev --schema=prisma/management/schema.prisma
npx prisma db seed
```

### Port 3000 sudah digunakan
Script `npm run dev` secara otomatis akan mematikan proses di port 3000, tetapi jika masih bermasalah:
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

---

## Kontak & Kontribusi
(Tambahkan informasi kontak jika diperlukan)
