import { z } from "zod";

export const purchaseItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  unitCost: z.coerce.number().min(0),
});

export const purchaseSchema = z.object({
  supplierId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || undefined),
  branchId: z.string().uuid().optional(),
  freight: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  dueDate: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Adicione ao menos um item"),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
