---
name: db-change
description: "Mengubah struktur database dengan aman: schema.prisma, migration baru, constraint SQL, dan pembaruan dokumen. Pakai setiap kali perlu menambah atau mengubah tabel, kolom, relasi atau constraint."
---

# db-change

Pakai saat perlu mengubah struktur data.

1. Pastikan perubahan didukung dokumen. Jika aturan bisnis baru, tanyakan dulu dan catat di `docs/07-decisions.md` setelah disetujui.
2. Ubah `prisma/schema.prisma` (jangan menambah `url` di datasource).
3. `pnpm prisma migrate dev --name <deskripsi>`; untuk CHECK/partial index/trigger gunakan `--create-only` lalu tambahkan SQL.
4. Jangan mengedit migration yang sudah diterapkan; buat migration baru.
5. Perbarui `docs/03-database.md` bila konsep berubah, dan test yang terdampak.
6. Jalankan `pnpm test` penuh.
