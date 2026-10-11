# task.md — WM Project Management

Semua item belum dikerjakan. Centang hanya dengan bukti (lihat skill `/verify-phase`). Tulis tanggal dan ringkasan bukti di bawah setiap fase saat selesai.

## F0 — Persiapan

- [x] Scaffold Next.js 16 (App Router, TS strict), pnpm, ESLint, Prettier; kunci versi patch semua library di `package.json`.
- [x] Tailwind v4 + shadcn/ui (new-york), token warna (biru tua, EWS, Gantt), font Inter.
- [x] Prisma 7: `prisma.config.ts` (URL dari `DIRECT_URL`, perintah seed), client singleton dengan `PrismaPg` (`DATABASE_URL`). Salin `prisma/schema.prisma` dari paket ini.
- [x] Vitest, Playwright (desktop + 375 px), axe-core; script `lint`, `typecheck`, `test`, `test:e2e`.
- [x] Repo GitHub + workflow CI (lint, typecheck, test, build).
- [x] Neon: project region Asia, branch `dev`/`preview`/`main`, autoscaling maks. 0,25 CU.
- [x] R2: bucket `dev`, `prod`, `backup`; kredensial terpisah untuk backup.
- [x] Vercel: project terhubung repo, region fungsi Asia (sama dengan Neon), env variable.
- [x] `.env.example` lengkap; `AGENTS.md` bagian perintah diperbarui.
- [x] Prototipe layar utama (dashboard, daftar proyek, workspace, Gantt) dicoba dengan tiga akun role; temuan dicatat.
- Bukti (11 Oktober 2026):
  - `pnpm lint`: Lulus tanpa error/warning (ESLint 9.39 flat config).
  - `pnpm typecheck`: Lulus tanpa error (TypeScript 5.9.3 strict, noUncheckedIndexedAccess).
  - `pnpm test`: Lulus 3/3 test Vitest (`tests/unit/format.test.ts` untuk format rupiah, persen, tanggal WIB).
  - `pnpm build`: Lulus kompilasi produksi Turbopack Next.js 16.4.0 (5 rute ter-generate).
  - `pnpm test:e2e`: Lulus 14/14 test Playwright (desktop dan mobile 375px) termasuk audit axe-core bebas pelanggaran WCAG AA.
  - Prototipe 4 layar aktif dengan role switcher (`SUPER_ADMIN`, `WM_HO_SPECIALIST`, `MANAGEMENT_VIEWER`). Mode Viewer mengunci seluruh tombol mutasi secara konsisten.
  - Neon Postgres (region Singapore `ap-southeast-1`), Cloudflare R2 (`wm-prjct-files`), dan CI workflow GitHub Actions terkonfigurasi. Commit `58775e7`.

## F1 — Fondasi (AC-01–06, AC-60–62)

- [x] Migration awal dari schema + migration `constraints` dari `prisma/sql/constraints.sql`.
- [x] Better Auth (email/password, session DB, `nextCookies`), field role/isActive/mustChangePassword; bandingkan dengan output CLI Better Auth.
- [x] `proxy.ts`, validasi session per route, `assertCan` + permission matrix, halaman login & ganti password (AC-01–04).
- [x] Error domain + pemetaan HTTP + envelope; util Decimal, tanggal WIB, format Indonesia.
- [x] Service audit dalam transaksi (AC-05) dan pola transaksi + version (409).
- [x] Upload/unduh R2 presigned + konfirmasi + batas ukuran (AC-62).
- [x] CRUD master: Region, Wilayah, Company, Estate, Block, Vendor (+quick), Unit, Kategori, Material (+quick), Alat berat, Jabatan approver; nonaktif vs hapus (AC-60).
- [x] Seed lokasi & master dari `prisma/seed-data/*.json` + Super Admin pertama (AC-61).
- [x] Menu Admin: user (buat, role, nonaktif, reset password).
- Bukti (11 Oktober 2026):
  - `pnpm lint`: Lulus tanpa warning/error (ESLint 9.39 flat config).
  - `pnpm typecheck`: Lulus tanpa error (TypeScript 5.9.3 strict, noUncheckedIndexedAccess).
  - `pnpm test`: Lulus 27/27 test Vitest (9 test suite: permissions, errors, format, audit, user-management, master-crud, files, seed, auth-session).
  - `pnpm build`: Lulus kompilasi produksi Turbopack Next.js 16.4.0 (20 rute + proxy middleware).
  - `pnpm test:e2e`: Lulus 20/20 test Playwright (desktop dan mobile 375px) termasuk audit axe-core dan viewer guard.
  - Tabel Pemenuhan Acceptance Criteria:
    - AC-01: Lulus (`tests/integration/auth-session.test.ts` & `tests/e2e/auth-redirect.spec.ts`).
    - AC-02: Lulus (`tests/unit/permissions.test.ts` & `tests/e2e/viewer-guard.spec.ts`).
    - AC-03: Lulus (`tests/unit/permissions.test.ts` & `tests/integration/user-management.test.ts`).
    - AC-04: Lulus (`tests/integration/user-management.test.ts` & `/ganti-password`).
    - AC-05: Lulus (`tests/integration/audit.test.ts` - trigger `auditlog_immutable`).
    - AC-06: Lulus (`tests/unit/errors.test.ts` & `tests/integration/master-crud.test.ts`).
    - AC-60: Lulus (`tests/integration/master-crud.test.ts` - IN_USE 409, nonaktif, vendor isComplete).
    - AC-61: Lulus (`tests/integration/seed.test.ts` - 8 Region, 18 Wilayah, 27 Company, 63 Estate; idempoten).
    - AC-62: Lulus (`tests/integration/files.test.ts` - foto 5MB/dokumen 10MB, presigned URL, cleanup 24h).

## F2 — Proyek dan AFCE (AC-10–25)

- [ ] Transition service + riwayat status (AC-15) dan semua gate di dokumen domain §5.
- [ ] Buat/ubah proyek: multi-Estate, kategori, data dasar, kode atomik (AC-10–13).
- [ ] Survei + foto/dokumen/spasial, kunci setelah AFCE diajukan (AC-14).
- [ ] Matriks approval: editor tier (SA), validasi rentang, endpoint match.
- [ ] AFCE: attempt, BOQ, nilai = total, salin level dari tier, ubah level saat DRAFT, ajukan (tanggal pengajuan + email) (AC-16–20).
- [ ] Catat keputusan SAP per level, aturan urutan/tanggal, durasi, efek ditolak/approved, anggaran INITIAL (AC-21–24).
- [ ] AR tambahan (AC-25); halaman anggaran.
- [ ] UI: daftar proyek, form proyek, workspace (header, panel langkah berikutnya, tab Ringkasan/Survei/AFCE).
- Bukti:

## F3 — Pengadaan (AC-30–44)

- [ ] Pekerjaan + bobot (tepat 100,00, bagi rata, default 70/30 saat paket pertama) (AC-30–33).
- [ ] USPK + tender attempt + baseline + mulai + pemenang + batal (AC-34–36).
- [ ] SPK: buat, release, batal, multi aktif, swakelola (AC-37–39).
- [ ] Paket Kerja: item, bobot, PR, PO, produksi, kiriman, koreksi, batal, pembayaran (AC-40–44).
- [ ] UI tab Pekerjaan dan Paket Kerja; dialog pembatalan per jenis.
- Bukti:

## F4 — Jadwal dan progres (AC-45–52)

- [ ] Baseline (edit sebelum kunci) + revisi beralasan (AC-45–46).
- [ ] Mulai fisik, log mingguan, log pengganti, alat berat, foto (AC-47–48).
- [ ] Service `progress-ews`: bobot, progres, rencana linear hari kerja, deviasi, ambang, freeze, Kurva S, data sel Gantt (AC-49–52).
- [ ] Setting hari kerja, libur, ambang EWS (SA).
- Bukti:

## F5 — Tampilan (AC-53–58)

- [ ] Komponen Gantt matriks desktop + mobile, legenda, tooltip/panel (AC-53–56).
- [ ] Portofolio Gantt dengan filter bersama.
- [ ] Dashboard (kartu status, EWS, 10 deviasi terbesar, Kurva S, pengingat log mingguan).
- [ ] Empat laporan + ekspor Excel (ExcelJS) dan PDF (react-pdf) (AC-57–58).
- Bukti:

## F6 — Penutupan dan admin (AC-63–70)

- [ ] Ajukan, verifikasi, batal pengajuan BAST; kunci WAITING_BAST dan COMPLETED (AC-63–66).
- [ ] Tahan/lanjutkan dan aturan ON_HOLD; batal proyek (AC-67–68).
- [ ] Arsip saat query + filter arsip (AC-69).
- [ ] Soft delete, restore, purge dengan tombstone & hapus file R2 (AC-70).
- [ ] Halaman audit log.
- Bukti:

## F7 — UAT dan go-live (AC-71–76)

- [ ] Uji performa halaman dan ekspor (AC-58, AC-71).
- [ ] Uji mobile dan aksesibilitas (AC-72–73).
- [ ] Workflow GitHub Actions harian: `pg_dump` → R2 backup, bersihkan file PENDING, lifecycle retensi; uji restore (AC-74).
- [ ] Uji build & jalan di luar Vercel; runbook pindah hosting (AC-75).
- [ ] Catatan pemakaian Neon mingguan (AC-76).
- [ ] 16 skenario UAT (docs/06 §4) lulus dan ditandatangani.
- [ ] Checklist go-live: env produksi, seed produksi, akun Super Admin, ganti password, backup pertama berhasil.
- Bukti:
