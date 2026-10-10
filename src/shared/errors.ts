import { ZodError } from 'zod';
import type { ApiErrorResponse } from './types/api';

export type DomainErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE'
  | 'NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'PRECONDITION_FAILED'
  | 'PROJECT_LOCKED'
  | 'FIELD_INPUT_LOCKED'
  | 'WEIGHT_MISMATCH'
  | 'DUPLICATE'
  | 'ACTIVE_CONFLICT'
  | 'VERSION_CONFLICT'
  | 'IN_USE'
  | 'FILE_TOO_LARGE'
  | 'INTERNAL_ERROR';

export const HTTP_STATUS_MAP: Record<DomainErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN_ROLE: 403,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  PRECONDITION_FAILED: 409,
  PROJECT_LOCKED: 409,
  FIELD_INPUT_LOCKED: 409,
  WEIGHT_MISMATCH: 409,
  DUPLICATE: 409,
  ACTIVE_CONFLICT: 409,
  VERSION_CONFLICT: 409,
  IN_USE: 409,
  FILE_TOO_LARGE: 413,
  INTERNAL_ERROR: 500,
};

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly status: number;
  public readonly fields?: Record<string, string[]>;

  constructor(
    code: DomainErrorCode,
    message: string,
    fields?: Record<string, string[]>,
    customStatus?: number
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = customStatus ?? HTTP_STATUS_MAP[code] ?? 500;
    this.fields = fields;
  }
}

export function toHttpError(error: unknown): { status: number; body: ApiErrorResponse } {
  if (error instanceof DomainError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      },
    };
  }

  if (error instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || '_root';
      if (!fields[path]) {
        fields[path] = [];
      }
      fields[path].push(issue.message);
    }
    return {
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data masukan tidak valid',
          fields,
        },
      },
    };
  }

  if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
    // Prisma unique constraint violation
    return {
      status: 409,
      body: {
        error: {
          code: 'DUPLICATE',
          message: 'Data sudah ada atau melanggar keunikan data',
        },
      },
    };
  }

  const message =
    error instanceof Error && error.message
      ? error.message
      : 'Terjadi kesalahan pada server';

  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message,
      },
    },
  };
}
