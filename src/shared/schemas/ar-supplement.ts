import { z } from 'zod';

export const createArSupplementSchema = z.object({
  number: z.string().nullable().optional(),
  amount: z.union([z.number(), z.string()], {
    message: 'Nominal AR tambahan wajib diisi',
  }),
  reason: z.string().min(1, 'Alasan penambahan anggaran wajib diisi'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
});

export type CreateArSupplementInput = z.infer<typeof createArSupplementSchema>;

export const patchArSupplementSchema = z.object({
  number: z.string().nullable().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  reason: z.string().min(1, 'Alasan penambahan anggaran wajib diisi').optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .optional(),
  version: z.number().int().optional(),
});

export type PatchArSupplementInput = z.infer<typeof patchArSupplementSchema>;

export const updateArLevelsSchema = z
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
      message: 'Urutan level jabatan harus berurutan 1 sampai N',
      path: ['levels'],
    }
  );

export type UpdateArLevelsInput = z.infer<typeof updateArLevelsSchema>;

export const submitArSchema = z.object({
  submittedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal pengajuan harus YYYY-MM-DD'),
  approvalEmailDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal email approval harus YYYY-MM-DD'),
  version: z.number().int().optional(),
});

export type SubmitArInput = z.infer<typeof submitArSchema>;
