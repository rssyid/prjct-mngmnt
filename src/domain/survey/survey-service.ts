import { prisma, Prisma } from '@/infra/db';
import { DomainError } from '@/shared/errors';
import { recordAuditLog } from '@/domain/audit/audit-service';
import type { UpsertSurveyInput } from '@/shared/schemas/survey';

export async function getProjectSurvey(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
  }

  const survey = await prisma.survey.findUnique({
    where: { projectId },
  });

  if (!survey) {
    return {
      survey: null,
      files: [],
      isLocked: false,
    };
  }

  // Fetch files attached to this survey
  const files = await prisma.fileObject.findMany({
    where: {
      ownerType: 'Survey',
      ownerId: survey.id,
      status: 'READY',
    },
    orderBy: { uploadedAt: 'desc' },
  });

  // Check if locked: locked if any AFCE attempt has been submitted
  const submittedAfce = await prisma.afceAttempt.findFirst({
    where: {
      projectId,
      submittedDate: { not: null },
    },
  });

  return {
    survey,
    files,
    isLocked: Boolean(submittedAfce),
  };
}

export async function upsertProjectSurvey(
  projectId: string,
  input: UpsertSurveyInput,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        status: true,
        version: true,
        deletedAt: true,
      },
    });

    if (!project || project.deletedAt) {
      throw new DomainError('NOT_FOUND', 'Proyek tidak ditemukan');
    }

    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new DomainError(
        'PROJECT_LOCKED',
        'Proyek berada dalam status final dan terkunci untuk seluruh perubahan'
      );
    }

    // Gate AC-14 / A-01: Survey is locked once the first AFCE attempt is submitted
    const submittedAfce = await tx.afceAttempt.findFirst({
      where: {
        projectId,
        submittedDate: { not: null },
      },
    });

    if (submittedAfce) {
      throw new DomainError(
        'FIELD_INPUT_LOCKED',
        'Data survei telah terkunci karena AFCE telah diajukan'
      );
    }

    const existingSurvey = await tx.survey.findUnique({
      where: { projectId },
    });

    const parsedLat =
      input.latitude !== undefined && input.latitude !== null
        ? new Prisma.Decimal(input.latitude)
        : null;
    const parsedLng =
      input.longitude !== undefined && input.longitude !== null
        ? new Prisma.Decimal(input.longitude)
        : null;

    if (existingSurvey) {
      // Check optimistic lock
      if (input.version !== undefined && existingSurvey.version !== input.version) {
        throw new DomainError(
          'VERSION_CONFLICT',
          'Data survei telah diperbarui oleh pengguna lain'
        );
      }

      const updated = await tx.survey.update({
        where: { id: existingSurvey.id, version: existingSurvey.version },
        data: {
          surveyDate: new Date(input.surveyDate),
          surveyorNames: input.surveyorNames.trim(),
          existingCondition: input.existingCondition.trim(),
          recommendation: input.recommendation?.trim() ?? null,
          latitude: parsedLat,
          longitude: parsedLng,
          notes: input.notes?.trim() ?? null,
          version: { increment: 1 },
        },
      });

      await recordAuditLog(tx, {
        actorId,
        projectId,
        entityType: 'Survey',
        entityId: updated.id,
        action: 'UPDATE_SURVEY',
        before: {
          surveyDate: existingSurvey.surveyDate,
          surveyorNames: existingSurvey.surveyorNames,
          existingCondition: existingSurvey.existingCondition,
          version: existingSurvey.version,
        },
        after: {
          surveyDate: updated.surveyDate,
          surveyorNames: updated.surveyorNames,
          existingCondition: updated.existingCondition,
          version: updated.version,
        },
      });

      return updated;
    }

    // Create new survey
    const created = await tx.survey.create({
      data: {
        projectId,
        surveyDate: new Date(input.surveyDate),
        surveyorNames: input.surveyorNames.trim(),
        existingCondition: input.existingCondition.trim(),
        recommendation: input.recommendation?.trim() ?? null,
        latitude: parsedLat,
        longitude: parsedLng,
        notes: input.notes?.trim() ?? null,
        version: 1,
      },
    });

    await recordAuditLog(tx, {
      actorId,
      projectId,
      entityType: 'Survey',
      entityId: created.id,
      action: 'CREATE_SURVEY',
      after: {
        surveyDate: created.surveyDate,
        surveyorNames: created.surveyorNames,
        existingCondition: created.existingCondition,
      },
    });

    return created;
  });
}
