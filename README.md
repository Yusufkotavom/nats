# Pasak - Enterprise Resource Planning System

Pasak adalah sistem ERP berbasis Next.js yang dirancang dengan arsitektur modular untuk menangani berbagai fungsi bisnis mulai dari akuntansi, inventaris, hingga manajemen tenant.

## Prasyarat

Sebelum memulai, pastikan perangkat Anda telah terinstal:
- **Node.js**: Versi 18.x atau lebih baru
- **NPM**: Biasanya terinstal bersama Node.js
- **PostgreSQL**: Database utama sistem
- **MinIO** (Opsional): Untuk penyimpanan file jika tidak menggunakan storage lokal

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

Beberapa variabel kunci yang perlu diperhatikan:
- `DATABASE_URL`: URL koneksi PostgreSQL (contoh: `postgresql://user:password@localhost:5432/pasak`)
- `PRISMA_DB_URL`: Alternatif URL database untuk Prisma.
- `STORAGE_DRIVER`: Pilih antara `local` atau `minio`.
- `INTEGRATION_DISPATCH_KEY`: Kunci rahasia untuk otentikasi worker.

### 4. Sinkronisasi Database (Prisma)
Projek ini menggunakan sistem skema folder. Jalankan perintah berikut untuk menghasilkan client Prisma dan menerapkan migrasi database:
```bash
# Generate Prisma Client
npx prisma generate

# Jalankan migrasi database
npx prisma migrate dev

# Masukkan data awal (seed)
npx prisma db seed
```

### 5. Menjalankan Aplikasi
Jalankan server pengembangan:
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## Fitur Utama & Operasional

### 1. Integration Outbox & Worker
Projek ini menggunakan pola Outbox untuk memastikan operasi antar-modul bersifat retryable dan idempotent.
- **Worker CLI**: Untuk menjalankan pemrosesan outbox secara manual:
  ```bash
  npm run outbox:work
  ```
- **Penyelesaian Inline**: Secara default, operasi diproses secara inline. Untuk mode async murni, atur `INTEGRATION_PROCESS_INLINE=false`.

### 2. Manajemen Multi-Tenant
Sistem ini mendukung multi-tenancy dengan database terpisah atau terintegrasi tergantung konfigurasi.

### 3. Internasionalisasi (i18n)
Dukungan bahasa inggris dan indonesia dapat ditemukan di folder `messages/`. Untuk validasi file i18n:
```bash
npm run i18n:validate
```

### 4. Testing
Berbagai unit test tersedia menggunakan Vitest:
```bash
npm run test
```

## Struktur Direktori
- `app/`: Routing utama menggunakan Next.js App Router.
- `modules/`: Logika bisnis inti yang dibagi per modul (Sales, Purchasing, Inventory, dll).
- `prisma/`: Skema database dan bibit data (seed).
- `lib/`: Utilitas, servis, dan konfigurasi pihak ketiga.
- `components/`: Komponen UI reusable.

## Kontak & Kontribusi
(Tambahkan informasi kontak jika diperlukan)
