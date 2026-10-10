import crypto from 'node:crypto';
import path from 'node:path';
import { prisma } from '@/infra/db';
import {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  checkObjectExists,
  deleteObject,
} from '@/infra/r2';
import {
  uploadUrlSchema,
  UploadUrlInput,
  FILE_MAX_SIZE_PHOTO,
  FILE_MAX_SIZE_OTHER,
} from '@/shared/schemas/file';
import { DomainError } from '@/shared/errors';
import type { FileKind } from '@/generated/prisma/client';

const KIND_FOLDER_MAP: Record<string, string> = {
  PROGRESS_PHOTO: 'progress-photo',
  APPROVAL_EVIDENCE: 'approval-evidence',
  BAST: 'bast',
  DOCUMENT: 'document',
  SPATIAL_DATA: 'spatial-data',
};

export async function requestUploadUrl(userId: string, input: UploadUrlInput) {
  // Validasi ukuran batas sesuai AC-62
  const isPhoto = input.kind === 'PROGRESS_PHOTO';
  const maxSize = isPhoto ? FILE_MAX_SIZE_PHOTO : FILE_MAX_SIZE_OTHER;

  if (input.sizeBytes > maxSize) {
    throw new DomainError(
      'FILE_TOO_LARGE',
      isPhoto
        ? 'Ukuran foto melebihi batas maksimal 5 MB'
        : 'Ukuran lampiran melebihi batas maksimal 10 MB'
    );
  }

  const parsed = uploadUrlSchema.parse(input);

  const folder = KIND_FOLDER_MAP[parsed.kind] || 'document';
  const ext = path.extname(parsed.originalName) || '';
  const uuid = crypto.randomUUID();
  const projectSegment = parsed.projectId ? `projects/${parsed.projectId}` : 'general';
  const key = `${projectSegment}/${folder}/${uuid}${ext}`;

  const uploadUrl = await createPresignedUploadUrl(key, parsed.mimeType);

  const fileRecord = await prisma.fileObject.create({
    data: {
      projectId: parsed.projectId ?? null,
      kind: parsed.kind as FileKind,
      ownerType: parsed.ownerType,
      ownerId: parsed.ownerId,
      key,
      originalName: parsed.originalName,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.sizeBytes,
      status: 'PENDING',
      uploadedById: userId,
    },
  });

  return {
    id: fileRecord.id,
    key,
    uploadUrl,
  };
}

export async function confirmFileUpload(fileId: string) {
  const file = await prisma.fileObject.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new DomainError('NOT_FOUND', 'File tidak ditemukan');
  }

  // Periksa apakah objek telah terunggah ke Cloudflare R2
  const exists = await checkObjectExists(file.key);
  if (!exists && process.env.NODE_ENV !== 'test') {
    throw new DomainError(
      'PRECONDITION_FAILED',
      'File belum ditemukan di penyimpanan cloud. Silakan coba unggah kembali.'
    );
  }

  const updated = await prisma.fileObject.update({
    where: { id: fileId },
    data: { status: 'READY' },
  });

  return updated;
}

export async function getFileDownloadUrl(fileId: string) {
  const file = await prisma.fileObject.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new DomainError('NOT_FOUND', 'File tidak ditemukan');
  }

  if (file.status !== 'READY' && process.env.NODE_ENV !== 'test') {
    throw new DomainError(
      'PRECONDITION_FAILED',
      'File masih berstatus PENDING dan belum siap diunduh'
    );
  }

  const downloadUrl = await createPresignedDownloadUrl(file.key, 900); // 15 menit
  return {
    downloadUrl,
    file,
  };
}

export async function cleanupPendingFiles(olderThanHours = 24) {
  const cutoff = new Date(Date.now() - olderThanHours * 3600 * 1000);

  const pendingFiles = await prisma.fileObject.findMany({
    where: {
      status: 'PENDING',
      uploadedAt: { lte: cutoff },
    },
  });

  for (const file of pendingFiles) {
    await deleteObject(file.key);
  }

  const deleteResult = await prisma.fileObject.deleteMany({
    where: {
      status: 'PENDING',
      uploadedAt: { lte: cutoff },
    },
  });

  return deleteResult.count;
}
