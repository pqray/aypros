import { z } from "zod";

const requiredText = (label: string, min = 2) =>
  z
    .string()
    .trim()
    .min(min, `${label} deve ter pelo menos ${min} caracteres`)
    .max(120, `${label} deve ter no maximo 120 caracteres`);

export const emailSchema = z.string().trim().email("Informe um e-mail valido").max(254);
export const passwordSchema = z.string().min(8, "A senha deve ter pelo menos 8 caracteres").max(128);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha"),
});

export const signupSchema = z
  .object({
    fullName: requiredText("Nome"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas devem ser iguais",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas devem ser iguais",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  fullName: requiredText("Nome"),
});

export const organizationSchema = z.object({
  name: requiredText("Organizacao"),
});

export const onboardingSchema = z.object({
  fullName: requiredText("Nome"),
  organizationName: requiredText("Organizacao"),
  professionalRole: z.string().trim().max(80).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
