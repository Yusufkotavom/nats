# NATS — Enterprise Resource Planning System (v1.0.0-alpha)

NATS is a Next.js-based ERP system designed to handle various business functions ranging from accounting, inventory, sales, purchasing, POS, to payroll.

## Key Features

- **Accounting**: Automated general ledger, journals, and financial reports.
- **Inventory**: Management of stock, warehouses, and item movements.
- **Sales & Purchasing**: Complete workflow from orders to invoices.
- **Point of Sale (POS)**: Responsive and user-friendly cashier interface.
- **Payroll**: Automated salary structure management and payslip generation.
- **AI Integration**: Smart features to assist in business data analysis.

## Screenshots

![1776302209274](image/README/1776302209274.png)
_Main Dashboard View_

![1776302243874](image/README/1776302243874.png)
_Accounting Module_

![1776302322989](image/README/1776302322989.png)
_Financial Report_

![1776302374473](image/README/1776302374473.png)
_Point of Sale (POS)_

## Installation Guide

Follow the steps below to run NATS in your local environment.

### Prerequisites

Before starting, ensure your system has the following components:

- **Node.js**: Version 20.x or later.
- **NPM**: Usually included with the Node.js installation.
- **PostgreSQL**: The main system database.
- **Git**: For source code management.

### Installation Steps

#### 1. Clone Repository

```bash
git clone <repository-url>
cd nats
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment Variables

Copy the `.env.example` file to `.env` and adjust its values:

```bash
cp .env.example .env
```

Ensure the `DATABASE_URL` variable correctly points to your PostgreSQL instance:
`DATABASE_URL="postgresql://user:password@localhost:5432/nats"`

#### 4. Database Preparation

Create a database in PostgreSQL:

```bash
psql -U postgres -c "CREATE DATABASE nats;"
```

Perform database migration and schema creation:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

#### 5. Seed Initial Data

Populate the database with initial data (roles, default users, etc.). Choose one of the following options:

**Option A: Default Minimal (Recommended for Daily Setup)**
Menjalankan seed aktif default yang berisi baseline akun akuntansi + user minimum untuk transaksi harian:

```bash
npm run prisma db seed
```

**Option B: Minimal Seeding (Manual Alias, same baseline)**
Setara dengan Option A, untuk eksekusi eksplisit seed minimal:

```bash
npm run prisma:seed:minimal
```

**Option C: Demo Lengkap (untuk testing skenario end-to-end)**
Includes sample products dan transaksi demo:

```bash
npm run prisma:seed:demo
```

**Option D: Restaurant Minimal (No Transactions)**
Extends minimal seed with restaurant master data only (menu + bahan baku + BOM dasar), without sales/purchase transactions. Includes realistic base/purchase/sales units with conversion factors. All initial inventory quantities are set to `0`:

```bash
npm run prisma:seed:restaurant:minimal
```

**Option E: Restaurant Indonesia (Detailed Inventory + Sunda/Seafood Catalog)**
Dataset demo restoran Indonesia dengan produk dan inventory detail, fokus menu Sunda/seafood + minuman umum Indonesia, termasuk package product dan BOM minimal untuk paket:

```bash
npm run prisma:seed:restaurant-id
```

**Default Credentials:**

- **Password**: `password123` (for all default users)

| Role            | Email                    | Name            |
| :-------------- | :----------------------- | :-------------- |
| **Super Admin** | `admin@example.com`      | Admin User      |
| **Accountant**  | `accountant@example.com` | John Accountant |
| **Cashier**     | `cashier@example.com`    | Jane Cashier    |
| **Manager**     | `manager@example.com`    | Mike Manager    |
| **Merchant**    | `merchant@example.com`   | Sample Merchant |
| **Customer**    | `customer@example.com`   | Sample Customer |

#### 6. Run Application

Run the development server:

```bash
npm run dev
```

The application can be accessed at [http://localhost:3000](http://localhost:3000).

---

## Installation Using Docker (Optional)

If you want to run the application using Docker Compose:

```bash
docker compose up -d --build
```

Docker stack now includes MinIO for object storage:
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

After the containers are running, initialize the database:

```bash
docker compose exec app npx prisma migrate deploy
# Run default minimal seed
docker compose exec app npm run prisma db seed

# OR run demo lengkap
docker compose exec app npm run prisma:seed:demo

# OR run minimal seed alias
docker compose exec app npm run prisma:seed:minimal

# OR run Indonesian restaurant detailed seed
docker compose exec app npm run prisma:seed:restaurant-id
```

---

## License

This project is licensed under [LICENSE](LICENSE).

---

## Engineering Documentation

Dokumen wajib untuk pengembangan terstruktur:

- [AGENTS.md](AGENTS.md): aturan wajib/larangan implementasi dan definition of done.
- [CLAUDE.md](CLAUDE.md): ringkasan panduan agent yang mengikuti AGENTS.md.
- [Architecture](docs/architecture.md): struktur layer dan alur kritis sistem.
- [Restaurant POS-Inventory Sync](docs/restaurant-pos-inventory-sync.md): audit gap + kontrak behavior domain restoran.
- [Docs Registry JSON](docs/docs-index.json): daftar dokumen dan trigger update untuk tracking otomatis.
- [CHANGELOG.md](CHANGELOG.md): catatan perubahan wajib setiap perubahan berdampak.

## User Documentation

Panduan pengguna end-to-end tersedia di aplikasi publik:

- `/docs` (redirect ke locale default)
- `/{locale}/docs` (contoh: `/en/docs`, `/id/docs`)

Source dokumen modular ada di:

- `docs/user-guide/00-start-here.md`
- `docs/user-guide/01-setup-awal.md`
- `docs/user-guide/02-master-data.md`
- `docs/user-guide/03-operasional-harian.md`
- `docs/user-guide/modules/*.md`
- `docs/user-guide/troubleshooting.md`
