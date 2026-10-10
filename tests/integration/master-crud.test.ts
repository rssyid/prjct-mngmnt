import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/infra/db';
import {
  createMaster,
  updateMaster,
  deleteMaster,
  listMaster,
  createQuickVendor,
} from '@/domain/master/master-service';
import { DomainError } from '@/shared/errors';

describe('Master Data CRUD and In-Use Protection (AC-60)', () => {
  const testUserId = `user_master_test_${Date.now()}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'Master Test User',
        email: `master_${Date.now()}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: false },
    });
  });

  it('AC-60 master terpakai tidak bisa dihapus (IN_USE), hanya dinonaktifkan; nonaktif hilang dari pilihan baru, tetap tampil di data lama', async () => {
    // 1. Buat Unit baru
    const unitCode = `U_${Date.now()}`;
    const unit = await createMaster('units', testUserId, {
      code: unitCode,
      name: 'Satuan Uji Penggunaan',
    });
    const unitId = String(unit.id);

    // 2. Buat Material yang memakai unit tersebut
    const material = await createMaster('materials', testUserId, {
      name: `Material Uji ${Date.now()}`,
      defaultUnitId: unitId,
    });
    const materialId = String(material.id);

    // 3. Upaya menghapus unit yang terpakai harus gagal dengan 409 IN_USE
    await expect(deleteMaster('units', unitId, testUserId)).rejects.toThrowError(DomainError);
    try {
      await deleteMaster('units', unitId, testUserId);
    } catch (err) {
      expect((err as DomainError).code).toBe('IN_USE');
      expect((err as DomainError).status).toBe(409);
    }

    // 4. Menonaktifkan unit (isActive = false) harus berhasil
    const updatedUnit = await updateMaster('units', unitId, testUserId, {
      isActive: false,
    });
    expect(updatedUnit.isActive).toBe(false);

    // 5. Query dengan ?active=true tidak boleh memunculkan unit yang nonaktif
    const activeUnits = await listMaster('units', { active: 'true' });
    const foundInActive = activeUnits.find((u) => u.id === unitId);
    expect(foundInActive).toBeUndefined();

    // 6. Namun query tanpa filter active (atau data lama) tetap memuat unit tersebut
    const allUnits = await listMaster('units', {});
    const foundInAll = allUnits.find((u) => u.id === unitId);
    expect(foundInAll).toBeDefined();

    // Dan data material lama tetap memiliki relasi unit yang utuh
    const fetchedMaterial = await prisma.material.findUnique({
      where: { id: materialId },
      include: { defaultUnit: true },
    });
    expect(fetchedMaterial?.defaultUnitId).toBe(unitId);
    expect(fetchedMaterial?.defaultUnit.code).toBe(unitCode);

    // Bersihkan data uji material dan unit
    await prisma.material.delete({ where: { id: materialId } });
    await deleteMaster('units', unitId, testUserId);
  });

  it('AC-60 vendor dibuat cepat dengan isComplete=false, dan otomatis isComplete=true saat semua field terisi', async () => {
    // Buat quick vendor
    const vendorName = `Vendor Uji ${Date.now()}`;
    const quickVendor = await createQuickVendor(testUserId, {
      name: vendorName,
    });
    expect(quickVendor.isComplete).toBe(false);

    // Lengkapi field kontak
    const completedVendor = await updateMaster('vendors', quickVendor.id, testUserId, {
      address: 'Jl. Perkebunan Sawit No. 12',
      phone: '08123456789',
      email: 'kontak@vendor.co.id',
      contactName: 'Budi Santoso',
      npwp: '01.234.567.8-901.000',
    });

    expect(completedVendor.isComplete).toBe(true);

    // Bersihkan
    await deleteMaster('vendors', quickVendor.id, testUserId);
  });

  it('optimistic locking pada vendor melempar 409 VERSION_CONFLICT bila version tidak cocok', async () => {
    const vendor = await createQuickVendor(testUserId, {
      name: `Vendor Version ${Date.now()}`,
    });

    // Upaya update dengan version yang salah
    await expect(
      updateMaster('vendors', vendor.id, testUserId, {
        name: 'Nama Baru',
        version: 999,
      })
    ).rejects.toThrowError(DomainError);

    try {
      await updateMaster('vendors', vendor.id, testUserId, {
        name: 'Nama Baru',
        version: 999,
      });
    } catch (err) {
      expect((err as DomainError).code).toBe('VERSION_CONFLICT');
      expect((err as DomainError).status).toBe(409);
    }

    // Bersihkan
    await deleteMaster('vendors', vendor.id, testUserId);
  });
});
