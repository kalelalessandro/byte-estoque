import { z } from "zod";

export const stockMovementSchema = z.object({
  productId: z.string().uuid("Produto invalido"),
  type: z.enum(["ENTRY", "EXIT", "ADJUSTMENT"]),
  quantity: z.coerce.number().min(0, "Quantidade invalida"),
  branchId: z.string().uuid().optional(),
  reason: z.string().trim().max(240).optional(),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;
