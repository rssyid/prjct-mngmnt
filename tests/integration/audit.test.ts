import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/infra/db';
import { recordAuditLog, queryAuditLogs } from '@/domain/audit/audit-service';

describe('Audit Service & Immutable Trigger (AC-05)', () => {
  const testUserId = `user_audit_test_${Date.now()}`;

  beforeAll(async () => {
    // Pastikan user test ada
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'Audit Test User',
        email: `audit_${Date.now()}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });
  });

  afterAll(async () => {
    // Pengguna tidak dihapus karena AuditLog terkait diikat FK Restrict (sesuai aturan domain)
    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: false },
    });
  });

  it('AC-05 mencatat AuditLog dalam transaksi dan dapat dibaca kembali', async () => {
    const testEntityId = `entity_${Date.now()}`;
    const beforeData = { name: 'Sebelum' };
    const afterData = { name: 'Sesudah' };

    let createdAuditId = '';

    await prisma.$transaction(async (tx) => {
      const log = await recordAuditLog(tx, {
        actorId: testUserId,
        entityType: 'TestEntity',
        entityId: testEntityId,
        action: 'UPDATE',
        before: beforeData,
        after: afterData,
        reason: 'Uji audit transaksi',
      });
      createdAuditId = log.id;
    });

    expect(createdAuditId).toBeTruthy();

    const result = await queryAuditLogs({
      entityType: 'TestEntity',
      actorId: testUserId,
    });

    const found = result.items.find((item) => item.id === createdAuditId);
    expect(found).toBeDefined();
    expect(found?.entityId).toBe(testEntityId);
    expect(found?.action).toBe('UPDATE');
    expect(found?.actorId).toBe(testUserId);
    expect(found?.before).toEqual(beforeData);
    expect(found?.after).toEqual(afterData);
  });

  it('AC-05 trigger database auditlog_immutable menolak modifikasi atau penghapusan', async () => {
    const testEntityId = `entity_imm_${Date.now()}`;
    const log = await prisma.auditLog.create({
      data: {
        actorId: testUserId,
        entityType: 'TestEntity',
        entityId: testEntityId,
        action: 'CREATE',
      },
    });

    // Upaya UPDATE harus ditolak oleh trigger PostgreSQL
    await expect(
      prisma.auditLog.update({
        where: { id: log.id },
        data: { action: 'MODIFIED' },
      })
    ).rejects.toThrow();

    // Upaya DELETE harus ditolak oleh trigger PostgreSQL
    await expect(
      prisma.auditLog.delete({
        where: { id: log.id },
      })
    ).rejects.toThrow();
  });
});
