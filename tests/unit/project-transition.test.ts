import { describe, it, expect } from 'vitest';
import {
  validateAllowedTransition,
  HOLDABLE_STATUSES,
  CANCELLABLE_STATUSES,
} from '@/domain/project-transition/transition-service';
import { DomainError } from '@/shared/errors';
import { Prisma } from '@/infra/db';

describe('Project Transition State Machine (AC-15, AC-12)', () => {
  const completeProject = {
    categoryId: 'cat-1',
    picUserId: 'user-1',
    targetStartDate: new Date('2026-11-01'),
    targetEndDate: new Date('2026-12-01'),
    plannedBudget: new Prisma.Decimal(1000000000),
    estates: [{ isPrimary: true }],
  };

  it('AC-15 mengizinkan transisi berurutan yang sah sesuai domain §5', () => {
    // DRAFT -> SURVEY
    expect(() =>
      validateAllowedTransition('DRAFT', 'SURVEY', completeProject)
    ).not.toThrow();

    // SURVEY -> RAB_READY
    expect(() =>
      validateAllowedTransition('SURVEY', 'RAB_READY', completeProject)
    ).not.toThrow();

    // RAB_READY -> WAITING_AFCE_AR
    expect(() =>
      validateAllowedTransition('RAB_READY', 'WAITING_AFCE_AR', completeProject)
    ).not.toThrow();

    // WAITING_AFCE_AR -> AFCE_AR_APPROVED
    expect(() =>
      validateAllowedTransition('WAITING_AFCE_AR', 'AFCE_AR_APPROVED', completeProject)
    ).not.toThrow();

    // WAITING_AFCE_AR -> RAB_READY (Ditolak)
    expect(() =>
      validateAllowedTransition('WAITING_AFCE_AR', 'RAB_READY', completeProject)
    ).not.toThrow();

    // AFCE_AR_APPROVED -> PROCUREMENT
    expect(() =>
      validateAllowedTransition('AFCE_AR_APPROVED', 'PROCUREMENT', completeProject)
    ).not.toThrow();

    // PROCUREMENT -> EXECUTION
    expect(() =>
      validateAllowedTransition('PROCUREMENT', 'EXECUTION', completeProject)
    ).not.toThrow();

    // EXECUTION -> WAITING_BAST
    expect(() =>
      validateAllowedTransition('EXECUTION', 'WAITING_BAST', completeProject)
    ).not.toThrow();

    // WAITING_BAST -> EXECUTION (Batal pengajuan BAST)
    expect(() =>
      validateAllowedTransition('WAITING_BAST', 'EXECUTION', completeProject)
    ).not.toThrow();

    // WAITING_BAST -> COMPLETED (Verifikasi BAST)
    expect(() =>
      validateAllowedTransition('WAITING_BAST', 'COMPLETED', completeProject)
    ).not.toThrow();
  });

  it('AC-15 menolak transisi yang melompati atau membalik status (INVALID_TRANSITION)', () => {
    // DRAFT langsung ke PROCUREMENT
    expect(() =>
      validateAllowedTransition('DRAFT', 'PROCUREMENT', completeProject)
    ).toThrowError(DomainError);

    // EXECUTION mundur ke DRAFT
    expect(() =>
      validateAllowedTransition('EXECUTION', 'DRAFT', completeProject)
    ).toThrowError(DomainError);

    // COMPLETED tidak bisa berubah lagi
    expect(() =>
      validateAllowedTransition('COMPLETED', 'EXECUTION', completeProject)
    ).toThrowError(DomainError);

    // CANCELLED tidak bisa berubah lagi
    expect(() =>
      validateAllowedTransition('CANCELLED', 'DRAFT', completeProject)
    ).toThrowError(DomainError);
  });

  it('AC-12 menolak Mulai Survei (DRAFT -> SURVEY) jika data dasar atau lokasi belum lengkap', () => {
    // Tanpa PIC
    expect(() =>
      validateAllowedTransition('DRAFT', 'SURVEY', {
        ...completeProject,
        picUserId: null,
      })
    ).toThrowError(/Data dasar proyek/);

    // Tanpa plannedBudget
    expect(() =>
      validateAllowedTransition('DRAFT', 'SURVEY', {
        ...completeProject,
        plannedBudget: null,
      })
    ).toThrowError(/Data dasar proyek/);

    // Tanpa targetEndDate
    expect(() =>
      validateAllowedTransition('DRAFT', 'SURVEY', {
        ...completeProject,
        targetEndDate: null,
      })
    ).toThrowError(/Data dasar proyek/);

    // Tanpa Estate utama
    expect(() =>
      validateAllowedTransition('DRAFT', 'SURVEY', {
        ...completeProject,
        estates: [{ isPrimary: false }],
      })
    ).toThrowError(/tepat satu Estate utama/);
  });

  it('AC-15 mendukung ON_HOLD dan memastikan resume kembali ke previousStatus yang tepat', () => {
    // ON_HOLD wajib alasan
    expect(() =>
      validateAllowedTransition('EXECUTION', 'ON_HOLD', completeProject, '')
    ).toThrowError(/Alasan penahanan/);

    // DRAFT tidak boleh ON_HOLD
    expect(() =>
      validateAllowedTransition('DRAFT', 'ON_HOLD', completeProject, 'Cuaca buruk')
    ).toThrowError(/tidak dapat ditahan/);

    // Status SURVEY s.d. WAITING_BAST boleh ON_HOLD
    for (const st of HOLDABLE_STATUSES) {
      expect(() =>
        validateAllowedTransition(st, 'ON_HOLD', completeProject, 'Cuaca buruk')
      ).not.toThrow();
    }

    // Resume dari ON_HOLD harus kembali ke previousStatus
    const onHoldProject = {
      ...completeProject,
      previousStatus: 'PROCUREMENT' as const,
    };
    expect(() =>
      validateAllowedTransition('ON_HOLD', 'PROCUREMENT', onHoldProject)
    ).not.toThrow();

    // Resume ke status yang berbeda dari previousStatus ditolak
    expect(() =>
      validateAllowedTransition('ON_HOLD', 'EXECUTION', onHoldProject)
    ).toThrowError(/hanya dapat dilanjutkan kembali ke status sebelumnya/);
  });

  it('AC-15 mendukung CANCELLED dari semua status non-terminal dengan alasan wajib', () => {
    // Wajib alasan
    expect(() =>
      validateAllowedTransition('EXECUTION', 'CANCELLED', completeProject, '')
    ).toThrowError(/Alasan pembatalan/);

    for (const st of CANCELLABLE_STATUSES) {
      expect(() =>
        validateAllowedTransition(st, 'CANCELLED', completeProject, 'Kebijakan manajemen')
      ).not.toThrow();
    }
  });
});
