---
name: verify-phase
description: "Menutup satu fase: menjalankan lint, typecheck, test, build (dan e2e bila ada UI), membuat tabel bukti per acceptance criteria, lalu memperbarui task.md. Pakai sebelum menyatakan fase selesai."
---

# verify-phase

Pakai sebelum menyatakan fase selesai.

1. Jalankan `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Untuk fase dengan UI, jalankan juga `pnpm test:e2e`.
2. Buat tabel bukti: setiap AC fase → nama test (atau langkah UAT) → hasil (lulus/gagal).
3. Jika ada yang gagal atau AC tanpa test: perbaiki dulu, jangan centang.
4. Periksa lintas dokumen: apakah ada perilaku yang menyimpang dari `docs/01-domain.md` atau `docs/04-api.md`? Laporkan bila ada.
5. Perbarui `task.md`: centang item yang terbukti, tambahkan tanggal dan ringkasan bukti di bawah fase.
6. Perbarui `AGENTS.md` (perintah) dan `.env.example` bila berubah.
7. Laporkan ringkasan ke pengguna: apa yang selesai, bukti, catatan untuk fase berikutnya.
