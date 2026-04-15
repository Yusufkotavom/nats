# NATS — Enterprise Resource Planning System

NATS is a Next.js-based ERP system designed with a modular architecture to handle various business functions ranging from accounting, inventory, sales, purchasing, POS, to payroll.

## Prerequisites

Before starting, ensure your machine has the following installed:

- **Node.js**: Version 18.x or later
- **NPM**: Usually installed with Node.js
- **PostgreSQL**: Main system database
- **MinIO** (Optional): For file storage if not using local storage
- **SMTP Server** (Optional): For email delivery features (such as user account verification)

---

## Installation Steps

Follow these steps to run the project in your local environment:

### 1. Clone Repository

```bash
git clone <this-repository-url>
cd nats
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the `.env.example` file to `.env` and adjust the variable values inside:

```bash
cp .env.example .env
```

Edit the `.env` file and fill in the following variables:

#### Required Variables

| Variable       | Description                                                           | Example                                          |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL` | PostgreSQL connection URL for the **tenant** database (business data) | `postgresql://user:password@localhost:5432/nats` |

#### Optional Variables

| Variable                   | Description                              | Default         |
| -------------------------- | ---------------------------------------- | --------------- |
| `STORAGE_DRIVER`           | File storage driver (`local` or `minio`) | `local`         |
| `MAX_FILE_SIZE`            | Maximum file upload size in bytes        | `5242880` (5MB) |
| `MINIO_ENDPOINT`           | MinIO server endpoint                    | `play.min.io`   |
| `MINIO_PORT`               | MinIO server port                        | `9000`          |
| `MINIO_ACCESS_KEY`         | MinIO access key                         | -               |
| `MINIO_SECRET_KEY`         | MinIO secret key                         | -               |
| `MINIO_BUCKET_NAME`        | MinIO bucket name                        | `nats-files`    |
| `SMTP_HOST`                | SMTP server host                         | -               |
| `SMTP_PORT`                | SMTP server port                         | -               |
| `SMTP_USER`                | SMTP username                            | -               |
| `SMTP_PASS`                | SMTP password                            | -               |
| `SMTP_FROM`                | Sender email address                     | -               |
| `INTEGRATION_DISPATCH_KEY` | Secret key for worker authentication     | -               |

### 4. Create PostgreSQL Database

Create a database in PostgreSQL for the **tenant** (ERP business data):

```bash
# Log in to PostgreSQL
psql -U postgres

# Create tenant database (business data)
CREATE DATABASE nats;

# Exit
\q
```

#### 5a. Generate Prisma Client

Generate the Prisma client:

```bash
# Generate Prisma Client for tenant database (schema in prisma/schema/)
npx prisma generate
```

#### 5b. Run Database Migrations

Apply the database schema to PostgreSQL:

```bash
# Migrate tenant database
npx prisma migrate dev
```

#### 5c. Seed Initial Data

```bash
npx prisma db seed
```

See the [Seed Database](#seed-database) section below for full details on the seeded data.

### 6. Run Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Installation Using Docker

For an easier and more consistent installation, you can use Docker:

### 1. Build Docker Image

```bash
docker build -t nats-app .
```

### 2. Run Container

```bash
docker run -p 3000:3000 --env-file .env nats-app
```

Ensure the `.env` file is correctly configured (especially `DATABASE_URL` which must be accessible from within the container).

### Using Docker Compose (Recommended)

To run the application along with the PostgreSQL database automatically:

```bash
docker-compose up -d
```

This will run the application at [http://localhost:3000](http://localhost:3000) and the database on port 5432.

#### Database Initialization in Docker

After the containers are running, execute the following commands to initialize the database:

```bash
# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Seed initial data
docker-compose exec app npx prisma db seed
```

---

### Tenant Database

This database stores **ERP business data** grouped into modular schemas in the `prisma/schema/` folder:

| Schema File             | Module                                          |
| ----------------------- | ----------------------------------------------- |
| `01_general.prisma`     | Company Profile, Roles, Permissions             |
| `02_integration.prisma` | Outbox Pattern for inter-module integration     |
| `03_accounting.prisma`  | Chart of Accounts, Journal Entry, Fiscal Year   |
| `04_people.prisma`      | Employee, Department                            |
| `05_inventory.prisma`   | Product, Warehouse, Stock Movement              |
| `06_purchasing.prisma`  | Purchase Order, Purchase Invoice, Goods Receipt |
| `07_cash_bank.prisma`   | Cash & Bank, Payment                            |
| `08_sales.prisma`       | Sales Order, Sales Invoice, Delivery            |
| `09_asset.prisma`       | Fixed Asset Management                          |
| `10_pos.prisma`         | Point of Sale                                   |
| `11_reporting.prisma`   | Custom Report                                   |
| `13_budgeting.prisma`   | Budget Management                               |
| `14_payroll.prisma`     | Payroll, Salary Component                       |
| `15_hr.prisma`          | HR Project & Timesheet                          |

---

## Seed Database

The `npx prisma db seed` command will populate the database with initial data. Here are the full details:

#### Available Roles

| Role         | Description         | Permission                                                                                                                            |
| ------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `superadmin` | Super Administrator | `*` (full access)                                                                                                                     |
| `Accountant` | Accountant          | `accounting.view`, `accounting.create`, `reports.view`, `budgeting.view`, `budgeting.create`                                          |
| `Cashier`    | POS Cashier         | `pos.access`, `sales.create`, `sales.view`, `sales.payments`, `products.view`, `customers.create`, `customers.view`, `inventory.view` |
| `Manager`    | Department Manager  | `hr.view`, `hr.create`, `budgeting.view`, `budgeting.approve`                                                                         |

#### Default Users

All users use the password: **`password123`**

| Email                    | Name            | Role       |
| ------------------------ | --------------- | ---------- |
| `admin@example.com`      | Admin User      | superadmin |
| `cashier@example.com`    | Jane Cashier    | Cashier    |
| `accountant@example.com` | John Accountant | Accountant |
| `manager@example.com`    | Mike Manager    | Manager    |

> **⚠️ Important:** Change the default password immediately after the first login in a production environment.

### Tenant Data (ERP Business Data)

The seed also populates the **tenant database** with the following example data:

| Seed Module          | Data Created                                                                     |
| -------------------- | -------------------------------------------------------------------------------- |
| `seedCompany()`      | Company profile (NATS Accounting)                                                |
| `seedAccounting()`   | Chart of Accounts, Tax Rates                                                     |
| `seedUsers()`        | Roles & Users (see table above)                                                  |
| `seedInventory()`    | Warehouse, Unit of Measure, Product Categories, Products (with SKUs)             |
| `seedContacts()`     | Customers (e.g., Acme Corp) and Vendors (e.g., Office Supplies Co)               |
| `seedHR()`           | Departments, Employees, Salary Components                                        |
| `seedProjects()`     | Example Projects                                                                 |
| `seedTransactions()` | Sales Orders, Sales Invoices, Purchase Orders, Journal Entries (Opening Balance) |

#### Seed Execution Order

Seeds are run sequentially due to inter-module dependencies:

```
1. Company      → Company Profile (no dependencies)
2. Accounting   → Chart of Accounts, Tax Rates
3. Users        → Roles, Users, Tenant
4. Inventory    → Warehouse, Products (requires Company)
5. Contacts     → Customers, Vendors
6. HR           → Departments, Employees, Salary
7. Projects     → Projects
8. Transactions → Sales, Purchase, Journal Entries (requires all above)
```

> **Note:** All seeds use an `upsert` strategy, making them safe to run repeatedly without data duplication.

---

## Business Modules

NATS consists of the following business modules available in the `modules/` directory:

| Module       | Directory               | Description                         |
| ------------ | ----------------------- | ----------------------------------- |
| Accounting   | `modules/accounting/`   | Chart of Accounts, Journal Entry    |
| Cash & Bank  | `modules/cash-bank/`    | Cash transactions, transfers, sync  |
| Fixed Assets | `modules/fixed-assets/` | Asset management and depreciation   |
| HR           | `modules/hr/`           | Employee data                       |
| Integration  | `modules/integration/`  | Outbox pattern, event handlers      |
| Inventory    | `modules/inventory/`    | Products, warehouses, stock         |
| Payroll      | `modules/payroll/`      | Salary slips, salary components     |
| Plugin       | `modules/plugins/`      | Module registration and permissions |
| POS          | `modules/pos/`          | Point of Sale, cashier sessions     |
| Production   | `modules/production/`   | BOM, production, receipts           |
| Purchasing   | `modules/purchase/`     | PO, invoices, payments, returns     |
| Reporting    | `modules/reporting/`    | Custom report registry              |
| Sales        | `modules/sales/`        | SO, invoices, delivery, returns     |

---

## Key Features & Operations

### Integration Outbox & Worker

This project uses the Outbox pattern to ensure inter-module operations are retryable and idempotent.

- **Worker CLI**: To run outbox processing manually:
  ```bash
  npm run outbox:work
  ```
- **Inline Completion**: By default, operations are processed inline. For pure async mode, set `INTEGRATION_PROCESS_INLINE=false`.

### Internationalization (i18n)

Support for English and Indonesian is available in the `messages/` folder. To validate i18n files:

```bash
npm run i18n:validate
```

### Testing

Unit tests are available using Vitest:

```bash
npm run test
```

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Directory Structure

```
nats/
├── app/                        # Routing (Next.js App Router)
│   ├── [locale]/               # Per-language routing (i18n)
│   │   ├── (marketing)/        # Landing page (pre-login)
│   │   ├── auth/               # Authentication (login, register)
│   │   ├── pos/                # Point of Sale
│   │   └── [tenant]/           # Tenant dashboard (post-login)
│   │       ├── accounting/     # Accounting module
│   │       ├── inventory/      # Inventory module
│   │       ├── purchase/       # Purchasing module
│   │       ├── sales/          # Sales module
│   │       └── ...             # Other modules
│   ├── api/                    # API Routes
│   │   ├── accounting/         # Accounting API
│   │   ├── cash-bank/          # Cash & bank API
│   │   ├── inventory/          # Inventory API
│   │   ├── purchase/           # Purchasing API
│   │   └── ...                 # Other APIs
│   └── themes/                 # Theme configuration
├── components/                 # Reusable UI components (shadcn/ui)
├── hooks/                      # Custom React hooks
├── i18n/                       # Internationalization configuration
├── lib/                        # Utilities, services, and configuration
│   ├── accounting/             # Accounting services
│   ├── ai/                     # AI integration
│   ├── auth/                   # Authentication & session
│   ├── permissions/            # RBAC permission system
│   ├── prisma/                 # Prisma client (tenant & management)
│   ├── reporting/              # Reporting registry
│   └── validation/             # Validation schemas
├── messages/                   # Translation files (en.json, id.json)
├── modules/                    # Per-module business logic
├── prisma/
│   ├── schema/                 # Modular tenant Prisma schemas
│   ├── management/             # Management Prisma schema
│   ├── seed/                   # Per-module seed data
│   └── migrations/             # Database migration files
├── scripts/                    # Utility scripts (outbox worker, i18n)
├── tests/                      # Unit & architecture tests (Vitest)
└── public/                     # Static assets
```

---

## Troubleshooting

### Database connection error

Ensure PostgreSQL is running and credentials in `.env` are correct:

```bash
pg_isready
```

### Prisma client not generated

If the error `Cannot find module '@prisma/client'` appears:

```bash
npx prisma generate
```

### Seed failed to run

If seeding fails, ensure migrations have succeeded first:

```bash
npx prisma migrate dev
npx prisma db seed
```

### Port 3000 already in use

The `npm run dev` script automatically kills processes on port 3000, but if issues persist:

```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

---

## Contact & Contribution

(Add contact information if needed)
