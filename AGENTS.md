# AGENTS.md

Dokumen ini adalah kontrak kerja untuk semua agent/kontributor di repo ini.

## 1) Prinsip Wajib

1. Semua perubahan harus terukur, bisa diuji, dan punya alasan teknis yang jelas.
2. Dilarang membuat modul/fitur baru jika kemampuan yang sama sudah ada pada service/layer existing.
3. Semua implementasi harus mengikuti arsitektur yang sudah ada (`app` -> `modules` -> `lib` -> `prisma`).
4. Setiap perubahan yang memengaruhi perilaku sistem wajib memperbarui dokumentasi terkait.
5. Setiap perubahan wajib dicatat di `CHANGELOG.md`.

## 2) Yang Harus Dilakukan

1. Lakukan gap-check sebelum coding:
   - Cek apakah fungsi sudah ada.
   - Cek apakah data model sudah mendukung.
   - Cek apakah ada test yang relevan.
2. Reuse service existing:
   - Logika domain di `modules/*/services`.
   - Action/controller di `app/*/actions.ts`.
   - Validasi bersama di `lib/*`.
3. Tambahkan/ubah test untuk setiap perubahan perilaku.
4. Jika fitur/perubahan belum punya test sama sekali, wajib buat test baru pada scope yang relevan (service/action/api/component).
5. Update dokumen jika ada perubahan:
   - Arsitektur: `docs/architecture.md`
   - Domain restoran POS-Inventory: `docs/restaurant-pos-inventory-sync.md`
   - Registry dokumen: `docs/docs-index.json`
6. Update `CHANGELOG.md` menggunakan kategori:
   - `Added`, `Changed`, `Fixed`, `Removed`, `Docs`.

## 3) Yang Tidak Boleh

1. Tidak boleh bypass service domain dengan menaruh business logic besar di UI/page.
2. Tidak boleh ubah schema/flow tanpa menjelaskan dampak backward-compatibility.
3. Tidak boleh merge perubahan yang mengubah behavior tanpa test.
4. Tidak boleh menutup task fitur/fix baru jika belum ada test dan belum ada alasan teknis tertulis kenapa test tidak bisa dibuat saat ini.
5. Tidak boleh menghapus/menimpa dokumentasi lama tanpa migrasi informasi.
6. Tidak boleh mengklaim fitur selesai jika:
   - belum ada verifikasi minimal,
   - atau belum tercatat di changelog.

## 4) Aturan Wajib Changelog

1. Semua commit yang mengubah kode atau perilaku harus menambah entri di `CHANGELOG.md`.
2. Perubahan kecil tetap dicatat jika berdampak pada:
   - alur bisnis,
   - integrasi,
   - validasi,
   - atau observability/error surface.
3. Format minimum per entri:
   - tanggal,
   - ruang lingkup,
   - ringkasan perubahan,
   - dampak.

## 5) Definition of Done (DoD)

Sebuah perubahan dianggap selesai hanya jika semua poin ini terpenuhi:

1. Gap-check terdokumentasi singkat (di PR/commit note/dokumen terkait).
2. Implementasi reuse arsitektur existing.
3. Test relevan pass atau alasan jelas jika belum bisa dijalankan.
4. Untuk perubahan yang sebelumnya tidak ter-cover, test baru sudah ditambahkan.
5. `CHANGELOG.md` ter-update.
6. Dokumen domain/arsitektur ter-update bila ada dampak.
