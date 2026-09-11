import { z } from "zod";

export const financeEntrySchema = z.object({
  type: z.enum(["PAYABLE", "RECEIVABLE"]),
  description: z.string().trim().min(1, "Descricao obrigatoria").max(200),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  dueDate: z.string().min(1, "Vencimento obrigatorio"),
  customerId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || undefined),
  supplierId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || undefined),
});

export type FinanceEntryInput = z.infer<typeof financeEntrySchema>;
