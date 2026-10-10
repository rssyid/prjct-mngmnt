import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/infra/db';
import {
  requestUploadUrl,
  confirmFileUpload,
  getFileDownloadUrl,
  cleanupPendingFiles,
} from '@/domain/files/file-service';
import { DomainError } from '@/shared/errors';

describe('File Storage and R2 Lifecycle (AC-62)', () => {
  const testUserId = `user_file_test_${Date.now()}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'File Test User',
        email: `file_${Date.now()}@example.com`,
        role: 'SUPER_ADMIN',
      },
    });
  });

  afterAll(async () => {
    await prisma.fileObject.deleteMany({ where: { uploadedById: testUserId } });
    await prisma.user.update({
      where: { id: testUserId },
      data: { isActive: false },
    });
  });

  it('AC-62 menolak foto yang melebihi 5 MB dengan kode FILE_TOO_LARGE (413)', async () => {
    const photoOver5Mb = 5 * 1024 * 1024 + 100; // 5 MB + 100 bytes

    await expect(
      requestUploadUrl(testUserId, {
        kind: 'PROGRESS_PHOTO',
        ownerType: 'ProgressLog',
        ownerId: 'log_123',
        originalName: 'foto_progres.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: photoOver5Mb,
      })
    ).rejects.toThrowError(DomainError);

    try {
      await requestUploadUrl(testUserId, {
        kind: 'PROGRESS_PHOTO',
        ownerType: 'ProgressLog',
        ownerId: 'log_123',
        originalName: 'foto_progres.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: photoOver5Mb,
      });
    } catch (err) {
      expect((err as DomainError).code).toBe('FILE_TOO_LARGE');
      expect((err as DomainError).status).toBe(413);
    }
  });

  it('AC-62 menolak dokumen yang melebihi 10 MB dengan kode FILE_TOO_LARGE (413)', async () => {
    const docOver10Mb = 10 * 1024 * 1024 + 100; // 10 MB + 100 bytes

    await expect(
      requestUploadUrl(testUserId, {
        kind: 'DOCUMENT',
        ownerType: 'Survey',
        ownerId: 'srv_123',
        originalName: 'dokumen_laporan.pdf',
        mimeType: 'application/pdf',
        sizeBytes: docOver10Mb,
      })
    ).rejects.toThrowError(DomainError);

    try {
      await requestUploadUrl(testUserId, {
        kind: 'DOCUMENT',
        ownerType: 'Survey',
        ownerId: 'srv_123',
        originalName: 'dokumen_laporan.pdf',
        mimeType: 'application/pdf',
        sizeBytes: docOver10Mb,
      });
    } catch (err) {
      expect((err as DomainError).code).toBe('FILE_TOO_LARGE');
      expect((err as DomainError).status).toBe(413);
    }
  });

  it('AC-62 menolak data spasial dengan ekstensi selain .zip atau .geojson', async () => {
    await expect(
      requestUploadUrl(testUserId, {
        kind: 'SPATIAL_DATA',
        ownerType: 'Survey',
        ownerId: 'srv_123',
        originalName: 'peta_lokasi.dwg',
        mimeType: 'application/octet-stream',
        sizeBytes: 1024 * 1024,
      })
    ).rejects.toThrow();
  });

  it('AC-62 menghasilkan presigned URL untuk file valid, konfirmasi READY, dan unduh URL berumur pendek', async () => {
    const validPhotoSize = 2 * 1024 * 1024; // 2 MB

    const result = await requestUploadUrl(testUserId, {
      kind: 'PROGRESS_PHOTO',
      ownerType: 'ProgressLog',
      ownerId: 'log_123',
      originalName: 'foto_valid.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: validPhotoSize,
    });

    expect(result.id).toBeDefined();
    expect(result.uploadUrl).toContain('https://');
    expect(result.key).toContain('progress-photo');

    // Cek record PENDING di database
    const pendingRecord = await prisma.fileObject.findUnique({
      where: { id: result.id },
    });
    expect(pendingRecord?.status).toBe('PENDING');

    // Konfirmasi upload (status -> READY)
    const confirmed = await confirmFileUpload(result.id);
    expect(confirmed.status).toBe('READY');

    // Unduh URL berumur pendek
    const download = await getFileDownloadUrl(result.id);
    expect(download.downloadUrl).toContain('https://');
  });

  it('AC-62 membersihkan file PENDING yang berumur lebih dari 24 jam', async () => {
    // Buat file PENDING buatan yang diunggah 25 jam lalu
    const oldPending = await prisma.fileObject.create({
      data: {
        kind: 'DOCUMENT',
        ownerType: 'Test',
        ownerId: 'test_owner',
        key: `test/old_${Date.now()}.pdf`,
        originalName: 'old.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1000,
        status: 'PENDING',
        uploadedById: testUserId,
        uploadedAt: new Date(Date.now() - 25 * 3600 * 1000),
      },
    });

    const cleanedCount = await cleanupPendingFiles(24);
    expect(cleanedCount).toBeGreaterThanOrEqual(1);

    const check = await prisma.fileObject.findUnique({
      where: { id: oldPending.id },
    });
    expect(check).toBeNull();
  });
});
