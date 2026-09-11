import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  unitPrice: z.coerce.number().min(0),
});

export const saleSchema = z.object({
  customerId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || undefined),
  branchId: z.string().uuid().optional(),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "PIX", "CARD", "CREDIT"]),
  items: z.array(saleItemSchema).min(1, "Adicione ao menos um item"),
});

export type SaleInput = z.infer<typeof saleSchema>;
