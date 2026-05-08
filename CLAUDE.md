# CLAUDE.md

Dokumen ini mengikuti aturan yang sama dengan `AGENTS.md`.

Jika ada konflik, prioritas aturan:
1. `AGENTS.md`
2. `CLAUDE.md`
3. Dokumen domain di `docs/*`

## Ringkasan Aturan Operasional

1. Wajib lakukan gap-check sebelum implementasi.
2. Dilarang membuat modul baru jika domain service existing sudah mencukupi.
3. Wajib update `CHANGELOG.md` untuk setiap perubahan yang berdampak.
4. Wajib update dokumentasi saat ada perubahan flow, kontrak, atau struktur.
5. Wajib verifikasi (test/check) untuk perubahan perilaku.
6. Wajib membuat test baru jika perubahan/fitur belum punya coverage test.

Rujuk detail penuh pada `AGENTS.md`.
