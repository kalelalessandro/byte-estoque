import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail invalido").max(160),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(200),
  companyName: z.string().trim().min(2, "Informe o nome da empresa").max(160),
  cnpj: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(30).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
