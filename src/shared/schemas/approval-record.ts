import { z } from 'zod';

export const recordApprovalDecisionSchema = z.object({
  result: z.enum(['APPROVED', 'DITOLAK', 'REJECTED'], {
    required_error: 'Hasil keputusan wajib dipilih (APPROVED atau DITOLAK)',
  }),
  approverName: z.string().min(1, 'Nama approver SAP wajib diisi'),
  decisionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal keputusan harus YYYY-MM-DD'),
  notes: z.string().nullable().optional(),
});

export type RecordApprovalDecisionInput = z.infer<
  typeof recordApprovalDecisionSchema
>;
