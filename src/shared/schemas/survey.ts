import { z } from 'zod';

export const upsertSurveySchema = z.object({
  surveyDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal survei harus YYYY-MM-DD'),
  surveyorNames: z.string().min(1, 'Nama surveyor wajib diisi'),
  existingCondition: z.string().min(1, 'Kondisi eksisting wajib diisi'),
  recommendation: z.string().nullable().optional(),
  latitude: z
    .union([z.number(), z.string()])
    .nullable()
    .optional(),
  longitude: z
    .union([z.number(), z.string()])
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
  version: z.number().int().optional(),
});

export type UpsertSurveyInput = z.infer<typeof upsertSurveySchema>;
