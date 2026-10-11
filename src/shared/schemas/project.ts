import { z } from 'zod';

export const projectEstateInputSchema = z.object({
  estateId: z.string().min(1, 'Estate wajib dipilih'),
  isPrimary: z.boolean().default(false),
  blockId: z.string().nullable().optional(),
});

export type ProjectEstateInput = z.infer<typeof projectEstateInputSchema>;

export const createProjectSchema = z
  .object({
    name: z.string().min(1, 'Nama proyek wajib diisi'),
    description: z.string().nullable().optional(),
    companyId: z.string().min(1, 'Company wajib dipilih'),
    categoryId: z.string().min(1, 'Kategori proyek wajib dipilih'),
    picUserId: z.string().nullable().optional(),
    targetStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
      .nullable()
      .optional(),
    targetEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
      .nullable()
      .optional(),
    plannedBudget: z
      .union([z.number(), z.string()])
      .nullable()
      .optional(),
    estates: z
      .array(projectEstateInputSchema)
      .min(1, 'Proyek harus memiliki minimal 1 Estate'),
  })
  .refine(
    (data) => {
      if (data.targetStartDate && data.targetEndDate) {
        return data.targetEndDate >= data.targetStartDate;
      }
      return true;
    },
    {
      message: 'Target tanggal selesai tidak boleh lebih awal dari target mulai',
      path: ['targetEndDate'],
    }
  );

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: z.string().min(1, 'Nama proyek wajib diisi').optional(),
    description: z.string().nullable().optional(),
    categoryId: z.string().min(1, 'Kategori proyek wajib dipilih').optional(),
    picUserId: z.string().nullable().optional(),
    targetStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
      .nullable()
      .optional(),
    targetEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
      .nullable()
      .optional(),
    plannedBudget: z
      .union([z.number(), z.string()])
      .nullable()
      .optional(),
    version: z.number().int().optional(),
  })
  .refine(
    (data) => {
      if (data.targetStartDate && data.targetEndDate) {
        return data.targetEndDate >= data.targetStartDate;
      }
      return true;
    },
    {
      message: 'Target tanggal selesai tidak boleh lebih awal dari target mulai',
      path: ['targetEndDate'],
    }
  );

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const updateProjectEstatesSchema = z.object({
  estates: z
    .array(projectEstateInputSchema)
    .min(1, 'Proyek harus memiliki minimal 1 Estate'),
  version: z.number().int().optional(),
});

export type UpdateProjectEstatesInput = z.infer<typeof updateProjectEstatesSchema>;

export const holdProjectSchema = z.object({
  reason: z.string().min(1, 'Alasan penahanan proyek wajib diisi'),
});

export type HoldProjectInput = z.infer<typeof holdProjectSchema>;

export const cancelProjectSchema = z.object({
  reason: z.string().min(1, 'Alasan pembatalan proyek wajib diisi'),
});

export type CancelProjectInput = z.infer<typeof cancelProjectSchema>;

export const projectQuerySchema = z.object({
  status: z.string().optional(),
  companyIds: z.string().optional(),
  regionIds: z.string().optional(),
  wilayahIds: z.string().optional(),
  categoryId: z.string().optional(),
  ops: z.string().optional(),
  q: z.string().optional(),
  archived: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
