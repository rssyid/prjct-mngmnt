import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string().min(8, 'Konfirmasi password minimal 8 karakter'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  role: z.enum(['SUPER_ADMIN', 'WM_HO_SPECIALIST', 'MANAGEMENT_VIEWER']),
  temporaryPassword: z.string().min(8, 'Password sementara minimal 8 karakter'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').optional(),
  role: z.enum(['SUPER_ADMIN', 'WM_HO_SPECIALIST', 'MANAGEMENT_VIEWER']).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  temporaryPassword: z.string().min(8, 'Password sementara minimal 8 karakter'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
