import { describe, it, expect } from 'vitest';
import { DomainError, toHttpError, HTTP_STATUS_MAP } from '@/shared/errors';
import { z, ZodError } from 'zod';

describe('Error mapping and DomainError (AC-06)', () => {
  it('AC-06 pelanggaran gate dan prasyarat selalu 409 dengan kode yang sesuai, tidak pernah 403', () => {
    const gateCodes = [
      'INVALID_TRANSITION',
      'PRECONDITION_FAILED',
      'PROJECT_LOCKED',
      'FIELD_INPUT_LOCKED',
      'WEIGHT_MISMATCH',
      'DUPLICATE',
      'ACTIVE_CONFLICT',
      'VERSION_CONFLICT',
      'IN_USE',
    ] as const;

    for (const code of gateCodes) {
      expect(HTTP_STATUS_MAP[code]).toBe(409);
      const err = new DomainError(code, `Uji error untuk ${code}`);
      const http = toHttpError(err);
      expect(http.status).toBe(409);
      expect(http.body.error.code).toBe(code);
      expect(http.status).not.toBe(403);
    }
  });

  it('mengonversi ZodError menjadi 400 VALIDATION_ERROR dengan daftar fields', () => {
    const testSchema = z.object({
      name: z.string().min(3, 'Nama minimal 3 karakter'),
      email: z.string().email('Format email salah'),
    });

    try {
      testSchema.parse({ name: 'ab', email: 'bukan-email' });
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError);
      const http = toHttpError(err);
      expect(http.status).toBe(400);
      expect(http.body.error.code).toBe('VALIDATION_ERROR');
      expect(http.body.error.fields).toBeDefined();
      expect(http.body.error.fields?.['name']).toContain('Nama minimal 3 karakter');
      expect(http.body.error.fields?.['email']).toContain('Format email salah');
    }
  });

  it('file terlalu besar dipetakan ke 413 FILE_TOO_LARGE', () => {
    const err = new DomainError('FILE_TOO_LARGE', 'Foto melebihi batas 5 MB');
    const http = toHttpError(err);
    expect(http.status).toBe(413);
    expect(http.body.error.code).toBe('FILE_TOO_LARGE');
  });
});
