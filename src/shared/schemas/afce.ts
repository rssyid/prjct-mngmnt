import { z } from 'zod';

export const boqItemInputSchema = z.object({
  lineNo: z.number().int().min(1, 'Nomor baris minimal 1'),
  buildingName: z.string().nullable().optional(),
  activityName: z.string().min(1, 'Nama kegiatan/bangunan wajib diisi'),
  amount: z.union([z.number(), z.string()], {
    required_error: 'Total harga wajib diisi',
  }),
  notes: z.string().nullable().optional(),
});

export type BoqItemInput = z.infer<typeof boqItemInputSchema>;

export const replaceBoqSchema = z.object({
  items: z.array(boqItemInputSchema).min(1, 'Minimal harus ada 1 baris BOQ'),
  version: z.number().int().optional(),
});

export type ReplaceBoqInput = z.infer<typeof replaceBoqSchema>;

export const createAfceAttemptSchema = z.object({
  afceNumber: z.string().nullable().optional(),
  documentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
});

export type CreateAfceAttemptInput = z.infer<typeof createAfceAttemptSchema>;

export const patchAfceAttemptSchema = z.object({
  afceNumber: z.string().nullable().optional(),
  documentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
    .nullable()
    .optional(),
  rabReady: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  version: z.number().int().optional(),
});

export type PatchAfceAttemptInput = z.infer<typeof patchAfceAttemptSchema>;

export const updateAfceLevelsSchema = z
  .object({
    levels: z
      .array(
        z.object({
          levelNo: z.number().int().min(1).max(9),
          positionId: z.string().min(1, 'Jabatan approver wajib dipilih'),
        })
      )
      .min(1, 'Minimal 1 level approval')
      .max(9, 'Maksimal 9 level approval'),
    version: z.number().int().optional(),
  })
  .refine(
    (data) => {
      const positionIds = data.levels.map((l) => l.positionId);
      return new Set(positionIds).size === positionIds.length;
    },
    {
      message: 'Jabatan approver tidak boleh duplikat',
      path: ['levels'],
    }
  )
  .refine(
    (data) => {
      const sorted = [...data.levels].sort((a, b) => a.levelNo - b.levelNo);
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i]?.levelNo !== i + 1) return false;
      }
      return true;
    },
    {
      message: 'Nomor urut level harus berurutan 1 sampai N',
      path: ['levels'],
    }
  );

export type UpdateAfceLevelsInput = z.infer<typeof updateAfceLevelsSchema>;

export const submitAfceSchema = z.object({
  submittedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal pengajuan harus YYYY-MM-DD'),
  approvalEmailDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal email approval harus YYYY-MM-DD'),
  version: z.number().int().optional(),
});

export type SubmitAfceInput = z.infer<typeof submitAfceSchema>;
