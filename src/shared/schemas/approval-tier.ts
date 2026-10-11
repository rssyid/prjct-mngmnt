import { z } from 'zod';

export const tierLevelInputSchema = z.object({
  levelNo: z.number().int().min(1, 'Level minimal 1').max(9, 'Level maksimal 9'),
  positionId: z.string().min(1, 'Jabatan approver wajib dipilih'),
});

export type TierLevelInput = z.infer<typeof tierLevelInputSchema>;

export const createApprovalTierSchema = z
  .object({
    name: z.string().min(1, 'Nama tier wajib diisi'),
    forAfce: z.boolean().default(true),
    forArSupplement: z.boolean().default(true),
    minAmount: z.union([z.number(), z.string()], {
      required_error: 'Batas bawah nominal (min) wajib diisi',
    }),
    maxAmount: z
      .union([z.number(), z.string()])
      .nullable()
      .optional(),
    isActive: z.boolean().default(true),
    levels: z
      .array(tierLevelInputSchema)
      .min(1, 'Tier harus memiliki minimal 1 level jabatan')
      .max(9, 'Maksimal 9 level jabatan per tier'),
  })
  .refine((data) => data.forAfce || data.forArSupplement, {
    message: 'Tier harus berlaku untuk minimal satu jenis dokumen (AFCE atau AR)',
    path: ['forAfce'],
  })
  .refine(
    (data) => {
      const min = Number(data.minAmount);
      if (isNaN(min) || min < 0) return false;
      if (data.maxAmount !== null && data.maxAmount !== undefined) {
        const max = Number(data.maxAmount);
        if (isNaN(max) || max <= min) return false;
      }
      return true;
    },
    {
      message: 'Batas atas (max) harus lebih besar dari batas bawah (min)',
      path: ['maxAmount'],
    }
  )
  .refine(
    (data) => {
      const positionIds = data.levels.map((l) => l.positionId);
      return new Set(positionIds).size === positionIds.length;
    },
    {
      message: 'Jabatan approver dalam satu tier tidak boleh duplikat',
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
      message: 'Urutan level jabatan harus berurutan mulai dari 1 sampai N',
      path: ['levels'],
    }
  );

export type CreateApprovalTierInput = z.infer<typeof createApprovalTierSchema>;

export const updateApprovalTierSchema = z
  .object({
    name: z.string().min(1, 'Nama tier wajib diisi').optional(),
    forAfce: z.boolean().optional(),
    forArSupplement: z.boolean().optional(),
    minAmount: z.union([z.number(), z.string()]).optional(),
    maxAmount: z
      .union([z.number(), z.string()])
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
    levels: z
      .array(tierLevelInputSchema)
      .min(1, 'Minimal 1 level jabatan')
      .max(9, 'Maksimal 9 level jabatan')
      .optional(),
    version: z.number().int().optional(),
  })
  .refine(
    (data) => {
      if (data.forAfce !== undefined && data.forArSupplement !== undefined) {
        return data.forAfce || data.forArSupplement;
      }
      return true;
    },
    {
      message: 'Tier harus berlaku untuk minimal satu jenis dokumen',
      path: ['forAfce'],
    }
  )
  .refine(
    (data) => {
      if (
        data.minAmount !== undefined &&
        data.maxAmount !== undefined &&
        data.maxAmount !== null
      ) {
        return Number(data.maxAmount) > Number(data.minAmount);
      }
      return true;
    },
    {
      message: 'Batas atas harus lebih besar dari batas bawah',
      path: ['maxAmount'],
    }
  )
  .refine(
    (data) => {
      if (data.levels) {
        const positionIds = data.levels.map((l) => l.positionId);
        return new Set(positionIds).size === positionIds.length;
      }
      return true;
    },
    {
      message: 'Jabatan approver dalam satu tier tidak boleh duplikat',
      path: ['levels'],
    }
  );

export type UpdateApprovalTierInput = z.infer<typeof updateApprovalTierSchema>;
