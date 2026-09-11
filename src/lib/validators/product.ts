import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU e obrigatorio").max(64),
  name: z.string().trim().min(1, "Nome e obrigatorio").max(200),
  barcode: z.string().trim().max(64).optional(),
  brand: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  unit: z.string().trim().min(1).max(10).default("un"),
  costPrice: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().min(0).default(0),
  maxStock: z.coerce.number().min(0).default(0),
  currentStock: z.coerce.number().min(0).default(0),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type ProductInput = z.infer<typeof productSchema>;
