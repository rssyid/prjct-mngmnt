import { z } from 'zod';

export const FILE_MAX_SIZE_PHOTO = 5 * 1024 * 1024; // 5 MB
export const FILE_MAX_SIZE_OTHER = 10 * 1024 * 1024; // 10 MB

export const fileKindEnum = z.enum([
  'PROGRESS_PHOTO',
  'APPROVAL_EVIDENCE',
  'BAST',
  'DOCUMENT',
  'SPATIAL_DATA',
]);

export type FileKind = z.infer<typeof fileKindEnum>;

export const uploadUrlSchema = z
  .object({
    kind: fileKindEnum,
    projectId: z.string().optional().nullable(),
    ownerType: z.string().min(1, 'ownerType wajib diisi'),
    ownerId: z.string().min(1, 'ownerId wajib diisi'),
    originalName: z.string().min(1, 'Nama file asli wajib diisi'),
    mimeType: z.string().min(1, 'MIME type wajib diisi'),
    sizeBytes: z.number().int().positive('Ukuran file harus lebih dari 0 bytes'),
  })
  .superRefine((data, ctx) => {
    const isPhoto = data.kind === 'PROGRESS_PHOTO';
    const maxSize = isPhoto ? FILE_MAX_SIZE_PHOTO : FILE_MAX_SIZE_OTHER;

    if (data.sizeBytes > maxSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: isPhoto
          ? 'Ukuran foto melebihi batas maksimal 5 MB'
          : 'Ukuran file melebihi batas maksimal 10 MB',
        path: ['sizeBytes'],
      });
    }

    if (data.kind === 'SPATIAL_DATA') {
      const lower = data.originalName.toLowerCase();
      if (!lower.endsWith('.zip') && !lower.endsWith('.geojson')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Data spasial hanya mendukung file berekstensi .zip atau .geojson',
          path: ['originalName'],
        });
      }
    }
  });

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
