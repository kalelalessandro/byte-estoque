import { z } from "zod";

export const openRegisterSchema = z.object({
  openingBalance: z.coerce.number().min(0, "Saldo inicial invalido"),
});

export const cashMovementSchema = z.object({
  type: z.enum(["SUPPLY", "WITHDRAWAL"]), // SALE e gerado pelas vendas
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  description: z.string().trim().max(200).optional(),
});

export const closeRegisterSchema = z.object({
  countedBalance: z.coerce.number().min(0, "Valor contado invalido"),
});

export type OpenRegisterInput = z.infer<typeof openRegisterSchema>;
export type CashMovementInput = z.infer<typeof cashMovementSchema>;
export type CloseRegisterInput = z.infer<typeof closeRegisterSchema>;
