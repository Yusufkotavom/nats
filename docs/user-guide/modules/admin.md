---
title: Modul Admin
module: admin
order: 220
updatedAt: 2026-05-28
summary: User, role, settings sistem, file, dan outbox integrasi.
related: 01-setup-awal,02-master-data
---

# Modul Admin

## Fungsi
- Users & Roles
- Company settings
- Document numbering (tab per type: Sales, Purchase, Service, POS, Inventory & Cash, Production)
- Files
- Integration outbox dashboard

## Catatan Document Numbering
- Semua nomor dokumen dikustom dari `Admin > Settings > Document Numbering`.
- Dokumen service punya set numbering sendiri (`SERVICE_*`) dan tidak lagi memakai prefix POS.

## Validasi
- Permission sesuai role.
- Settings tersimpan dan aktif.
