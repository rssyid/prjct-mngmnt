import { z } from 'zod';

export const regionSchema = z.object({
  code: z.string().min(1, 'Kode Region wajib diisi'),
  name: z.string().min(1, 'Nama Region wajib diisi'),
  ops: z.enum(['SUMATERA', 'KALBAR', 'WILTIM']),
  order: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const wilayahSchema = z.object({
  regionId: z.string().min(1, 'Region wajib dipilih'),
  name: z.string().min(1, 'Nama Wilayah wajib diisi'),
  order: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const companySchema = z.object({
  code: z.string().min(1, 'Kode Company wajib diisi'),
  name: z.string().min(1, 'Nama Company wajib diisi'),
  alias: z.string().optional().nullable(),
  order: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const estateSchema = z.object({
  companyId: z.string().min(1, 'Company wajib dipilih'),
  wilayahId: z.string().min(1, 'Wilayah wajib dipilih'),
  code: z.string().min(1, 'Kode Estate wajib diisi'),
  name: z.string().min(1, 'Nama Estate wajib diisi'),
  estateNew: z.string().optional().nullable(),
  legacyCode: z.string().optional().nullable(),
  order: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const blockSchema = z.object({
  estateId: z.string().min(1, 'Estate wajib dipilih'),
  blockCode: z.string().min(1, 'Kode Block wajib diisi'),
  name: z.string().min(1, 'Nama Block wajib diisi'),
  plantingYear: z.number().int().optional().nullable(),
  areaHectares: z.union([z.string(), z.number()]).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const vendorSchema = z.object({
  name: z.string().min(1, 'Nama vendor wajib diisi'),
  type: z.enum(['EKSTERNAL', 'INTERNAL']).optional().default('EKSTERNAL'),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Format email vendor tidak valid').optional().nullable().or(z.literal('')),
  contactName: z.string().optional().nullable(),
  npwp: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  version: z.number().int().optional(),
});

export const quickVendorSchema = z.object({
  name: z.string().min(1, 'Nama vendor wajib diisi'),
});

export const unitSchema = z.object({
  code: z.string().min(1, 'Kode satuan wajib diisi'),
  name: z.string().min(1, 'Nama satuan wajib diisi'),
  isActive: z.boolean().optional().default(true),
});

export const projectCategorySchema = z.object({
  code: z.string().min(1, 'Kode kategori wajib diisi'),
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  order: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const materialSchema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().min(1, 'Nama material wajib diisi'),
  defaultUnitId: z.string().min(1, 'Satuan default wajib dipilih'),
  isActive: z.boolean().optional().default(true),
});

export const quickMaterialSchema = z.object({
  name: z.string().min(1, 'Nama material wajib diisi'),
  defaultUnitId: z.string().min(1, 'Satuan default wajib dipilih'),
});

export const heavyEquipmentTypeSchema = z.object({
  name: z.string().min(1, 'Nama alat berat wajib diisi'),
  isActive: z.boolean().optional().default(true),
});

export const approvalPositionSchema = z.object({
  code: z.string().min(1, 'Kode jabatan wajib diisi'),
  name: z.string().min(1, 'Nama jabatan wajib diisi'),
  rank: z.number().int().min(1).max(9, 'Rank maksimal 9'),
  isActive: z.boolean().optional().default(true),
});
