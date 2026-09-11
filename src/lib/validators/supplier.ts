import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Nome e obrigatorio").max(200),
  document: z.string().trim().max(20).optional(),
  email: z.string().trim().max(160).optional().refine(
    (v) => !v || z.string().email().safeParse(v).success,
    "E-mail invalido",
  ),
  phone: z.string().trim().max(30).optional(),
  addressLine: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
