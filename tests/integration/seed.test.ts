import { describe, it, expect } from 'vitest';
import { prisma } from '@/infra/db';
import { runSeed } from '@/domain/admin/seed-service';

describe('Seed Idempotency and Location Counts (AC-61)', () => {
  it('AC-61 seed lokasi menghasilkan 8 Region, 18 Wilayah, 27 Company, 63 Estate; idempoten', async () => {
    // Jalankan seed pertama kali
    const firstRun = await runSeed(prisma);

    expect(firstRun.regionsCount).toBe(8);
    expect(firstRun.wilayahCount).toBe(18);
    expect(firstRun.companiesCount).toBe(27);
    expect(firstRun.estatesCount).toBe(63);

    // Verifikasi langsung ke database
    const [regions, wilayah, companies, estates] = await Promise.all([
      prisma.region.count(),
      prisma.wilayah.count(),
      prisma.company.count(),
      prisma.estate.count(),
    ]);

    expect(regions).toBe(8);
    expect(wilayah).toBe(18);
    expect(companies).toBe(27);
    expect(estates).toBe(63);

    // Jalankan seed kedua kali (Uji Idempotensi)
    const secondRun = await runSeed(prisma);

    expect(secondRun.regionsCount).toBe(8);
    expect(secondRun.wilayahCount).toBe(18);
    expect(secondRun.companiesCount).toBe(27);
    expect(secondRun.estatesCount).toBe(63);

    // Pastikan tidak ada duplikasi data setelah eksekusi ulang
    const [regions2, wilayah2, companies2, estates2] = await Promise.all([
      prisma.region.count(),
      prisma.wilayah.count(),
      prisma.company.count(),
      prisma.estate.count(),
    ]);

    expect(regions2).toBe(8);
    expect(wilayah2).toBe(18);
    expect(companies2).toBe(27);
    expect(estates2).toBe(63);
  }, 180000); // Batas waktu 180 detik untuk transaksi jaringan (remote Neon DB)
});
