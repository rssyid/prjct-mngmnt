# Panduan Memakai Paket Ini di Google Antigravity

Paket ini berisi semua hasil planning WM Project Management dalam bentuk yang bisa langsung dibaca agen: dokumen final, schema database lengkap, data awal, aturan agen, workflow per fase, dan daftar tugas.

## 1. Isi paket

```
AGENTS.md                      Pintu masuk agen: ringkasan, sumber kebenaran, aturan kerja
PANDUAN-ANTIGRAVITY.md         File ini (untuk Anda, bukan untuk agen)
task.md                        Checklist F0–F7 dengan ID acceptance criteria
.env.example                   Daftar environment variable (tanpa nilai)
.agents/rules/                 Aturan agen (masing-masing < 12.000 karakter)
  00-core.md                   Perilaku inti, rujukan dokumen, larangan
  10-domain.md                 Invarian bisnis yang paling sering dilanggar
  20-backend.md                API, transaksi, Prisma 7, R2, keamanan
  30-frontend.md               shadcn/Tailwind, form, Gantt, design system
  40-testing.md                Test per AC dan syarat "selesai"
.agents/workflows/
  start-phase.md               Mulai fase: baca dokumen, buat rencana, tunggu persetujuan
  verify-phase.md              Tutup fase: jalankan semua cek, tabel bukti AC, update task.md
  db-change.md                 Mengubah struktur data dengan aman
  decision.md                  Menangani hal yang belum diatur dokumen
docs/
  01-domain.md                 Glossary, state machine, aturan bisnis (sumber kebenaran utama)
  02-architecture.md           Stack, struktur kode, alur request, lingkungan, risiko
  03-database.md               Penjelasan schema, constraint, seed, cara menerapkan
  04-api.md                    Semua endpoint, role, kode error
  05-ui.md                     Navigasi, layar, form, Gantt, design system
  06-phases-acceptance.md      Fase F0–F7, AC-01–AC-76, 16 skenario UAT
  07-decisions.md              Log semua keputusan dan asalnya
prisma/
  schema.prisma                50 model, 17 enum, semua relasi, unique dan index
  sql/constraints.sql          CHECK, partial unique index, trigger tabel riwayat
  seed-data/lokasi.json        8 Region, 18 Wilayah, 27 Company, 63 Estate
  seed-data/master.json        Satuan, kategori, material, alat berat, jabatan, setting
```

Delapan file markdown lama (PRD, WORKFLOW, DATABASE, API, design, Rules, RUNBOOK, task) dan HANDOVER.md **jangan** dimasukkan ke repo: isinya sudah digantikan dan akan membingungkan agen.

## 2. Yang perlu disiapkan sebelum mulai

- Akun GitHub, Neon, Cloudflare (R2), dan Vercel.
- Node.js versi terbaru LTS (Prisma 7 butuh Node.js 20.19 ke atas) dan pnpm.
- Google Antigravity terpasang dan login.

## 3. Langkah awal

1. Buat folder proyek kosong, misalnya `wm-project-management`.
2. Salin seluruh isi paket ini ke folder tersebut (termasuk folder tersembunyi `.agents`).
3. Jalankan `git init`, buat repo privat di GitHub, lalu commit awal berisi paket ini saja.
4. Di Antigravity: **File → Open Folder** → pilih folder proyek (bukan folder induknya).
5. Buka panel agen → menu `...` → **Customizations → Rules**. Pastikan kelima file di `.agents/rules` muncul sebagai *Workspace rules*, dan atur semuanya agar selalu aktif (total ukurannya kecil). Jika panel memakai nama mode yang berbeda, pilih mode yang membuat rule berlaku di setiap percakapan.
6. Periksa tab **Workflows**: keempat workflow dari `.agents/workflows` harus terlihat.
7. Antigravity versi baru juga membaca `AGENTS.md`. Jika versi Anda belum, sebut `@AGENTS.md` di pesan pertama setiap percakapan.

## 4. Menjalankan satu fase

Kerjakan **satu fase per percakapan agen**. Contoh untuk fase pertama:

1. Mulai percakapan baru, tulis:
   > Jalankan workflow start-phase untuk F0. Ikuti @AGENTS.md dan @task.md.
2. Agen membaca dokumen dan menyusun rencana. **Tinjau rencananya**: apakah sesuai dokumen, apakah setiap AC fase punya test, apakah ada library di luar stack.
3. Setujui atau minta perbaikan. Jangan biarkan agen menulis kode sebelum rencana disetujui.
4. Biarkan agen bekerja langkah demi langkah. Di fase yang menyentuh database, periksa migration yang dibuat sebelum diterapkan.
5. Setelah selesai, tulis:
   > Jalankan workflow verify-phase untuk F0.
6. Periksa tabel bukti AC dan hasil `lint`, `typecheck`, `test`, `build`. Centang di `task.md` hanya yang terbukti.
7. Commit, push, cek deploy preview di Vercel, lalu lanjut ke fase berikutnya di percakapan baru.

Urutan fase: F0 Persiapan → F1 Fondasi → F2 Proyek & AFCE → F3 Pengadaan → F4 Jadwal & progres → F5 Tampilan → F6 Penutupan & admin → F7 UAT & go-live.

## 5. Catatan teknis untuk F0 dan F1

- Prisma 7: URL database **tidak** ditulis di `schema.prisma`, tetapi di `prisma.config.ts`. Gunakan `DIRECT_URL` di sana untuk migrasi, dan `DATABASE_URL` (pooled) untuk Prisma Client lewat `@prisma/adapter-pg`. Seed tidak berjalan otomatis setelah migrate; jalankan `pnpm prisma db seed`.
- Schema dan `constraints.sql` belum pernah dijalankan ke database sungguhan. Di F1, minta agen menjalankan migration ke branch Neon `dev` dan memperbaiki error sintaks bila ada, **tanpa mengubah arti aturannya**.
- Model User/Session/Account/Verification mengikuti Better Auth; minta agen membandingkannya dengan output CLI Better Auth dan mempertahankan field tambahan (`role`, `isActive`, `mustChangePassword`).
- Neon: pilih region Asia (Singapura bila tersedia), atur autoscaling maksimum 0,25 CU. Vercel: set region fungsi ke lokasi yang sama.
- Simpan semua rahasia hanya di `.env.local` (lokal), Vercel Environment Variables, dan GitHub Actions secrets.

## 6. Saat ada hal yang belum diatur

Agen diinstruksikan berhenti dan bertanya bila dokumen bertentangan atau tidak mencakup sesuatu. Jika itu terjadi:

1. Minta agen menjalankan workflow `decision`: konteks, pilihan, dampak, usulan.
2. Putuskan.
3. Pastikan agen menambahkan baris di `docs/07-decisions.md` dan memperbarui dokumen 01–06 yang terdampak sebelum melanjutkan.

Jangan menerima perubahan aturan bisnis yang tidak tercatat di dokumen.

## 7. Tips agar hasil vibe coding tetap rapi

- Satu fase per percakapan; percakapan panjang membuat agen lupa konteks.
- Selalu minta agen menunjukkan output test, bukan hanya mengatakan "sudah lulus".
- Jika agen mengubah test agar lulus, tolak dan minta perbaiki kodenya.
- Uji sendiri dengan tiga akun (Super Admin, Specialist, Viewer) di akhir setiap fase yang punya UI.
- Contoh uji progres 65,4% (AC-49) adalah alarm cepat: jika angka ini berubah, ada yang salah di perhitungan.
- Simpan dokumen planning asli (Claude Docs) sebagai arsip; yang dipakai agen adalah folder `docs/` di repo.

## 8. Risiko yang sudah diterima

- Vercel Hobby dibatasi untuk pemakaian non-komersial. Untuk proyek pribadi ini sesuai; jika kelak dipakai resmi oleh perusahaan, pindah ke Vercel Pro atau hosting Node.js lain (aplikasi sudah dirancang portabel).
- Neon Free: database ditangguhkan bila kuota compute bulanan habis, restore hanya 6 jam. Karena itu backup harian ke R2 dan pengecekan pemakaian mingguan wajib dijalankan (F7).
