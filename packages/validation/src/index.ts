import { z } from "zod";

const requiredText = (label: string, min = 2) =>
  z
    .string()
    .trim()
    .min(min, `${label} deve ter pelo menos ${min} caracteres`)
    .max(120, `${label} deve ter no maximo 120 caracteres`);

export const emailSchema = z.string().trim().email("Informe um e-mail valido").max(254);
export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(128);

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

export const createSearchSchema = z.object({
  city: requiredText("Cidade"),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "UF deve ter 2 letras")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  segment: requiredText("Segmento"),
});

export const quickSearchSchema = createSearchSchema;

const optionalTriStateBoolean = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === "true"));

export const businessWebsiteFilterSchema = z.enum(["all", "with_site", "without_site"]);
export const businessSortBySchema = z.enum(["name", "score", "rating"]);
export const businessSortDirSchema = z.enum(["asc", "desc"]);

export const businessListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  websiteFilter: businessWebsiteFilterSchema.default("all"),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  audited: optionalTriStateBoolean,
  inPipeline: optionalTriStateBoolean,
  favoritesOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  search: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  sortBy: businessSortBySchema.default("name"),
  sortDir: businessSortDirSchema.default("asc"),
});

export const savedFilterCreateSchema = z.object({
  name: requiredText("Nome do filtro", 1),
  filters: z.record(z.string(), z.unknown()),
});

export const businessIdsSchema = z.object({
  businessIds: z.array(z.string().uuid()).min(1).max(100),
});

export const leadStageSchema = z.enum([
  "new",
  "contacted",
  "in_conversation",
  "proposal_sent",
  "won",
  "lost",
]);
export const leadStatusSchema = z.enum(["active", "won", "lost", "archived"]);

export const createLeadSchema = z.object({
  businessId: z.string().uuid(),
});

export const updateLeadSchema = z
  .object({
    stage: leadStageSchema.optional(),
    status: leadStatusSchema.optional(),
    potentialValue: z.coerce.number().min(0).max(1_000_000_000).nullable().optional(),
    nextAction: z.string().trim().max(200).nullable().optional(),
    nextActionAt: z.string().datetime({ offset: true }).nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nada para atualizar" });

export const noteContentSchema = requiredText("Nota", 1);

export const createNoteSchema = z.object({
  content: noteContentSchema,
});

export const updateNoteSchema = z.object({
  content: noteContentSchema,
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
export type QuickSearchInput = z.infer<typeof quickSearchSchema>;
export type CreateSearchInput = z.infer<typeof createSearchSchema>;
export type BusinessListQueryInput = z.infer<typeof businessListQuerySchema>;
export type SavedFilterCreateInput = z.infer<typeof savedFilterCreateSchema>;
export type BusinessIdsInput = z.infer<typeof businessIdsSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInputSchema = z.infer<typeof updateLeadSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
