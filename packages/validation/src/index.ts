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

export const addOrganizationMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "member"]).default("member"),
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

const optionalInputText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const createManualBusinessSchema = z
  .object({
    name: requiredText("Nome", 2),
    segment: requiredText("Segmento", 2),
    city: optionalInputText(80),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "UF deve ter 2 letras")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    phone: optionalInputText(40),
    websiteUrl: optionalInputText(300),
    instagramUrl: optionalInputText(300),
  })
  .refine((data) => Boolean(data.websiteUrl || data.instagramUrl), {
    message: "Informe um site ou Instagram",
    path: ["websiteUrl"],
  });

const optionalTriStateBoolean = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === "true"));

export const businessWebsiteFilterSchema = z.enum(["all", "with_site", "without_site"]);
export const businessSegmentFilterSchema = z.enum([
  "all",
  "restaurant",
  "food_service",
  "services",
  "retail",
  "other",
]);
export const businessSortBySchema = z.enum(["name", "score", "rating"]);
export const businessSortDirSchema = z.enum(["asc", "desc"]);

export const businessListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  websiteFilter: businessWebsiteFilterSchema.default("all"),
  segment: businessSegmentFilterSchema.default("all"),
  city: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value || undefined)
    .optional(),
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
export const contactChannelSchema = z.enum(["whatsapp", "email", "phone", "other"]);

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
    assignedTo: z.string().uuid().nullable().optional(),
    domainCostAnnual: z.coerce.number().min(0).max(1_000_000).optional(),
    hostingCostMonthly: z.coerce.number().min(15).max(1_000_000).optional(),
    marginTargetPercent: z.coerce.number().min(0).max(99).nullable().optional(),
    lostReason: z.string().trim().min(1, "Descreva o motivo").max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nada para atualizar" });

export const noteContentSchema = requiredText("Nota", 1);

export const createLeadContactSchema = z.object({
  channel: contactChannelSchema,
  note: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
});

export const createNoteSchema = z.object({
  content: noteContentSchema,
});

export const updateNoteSchema = z.object({
  content: noteContentSchema,
});

export const aiKindSchema = z.enum([
  "commercial_summary",
  "whatsapp_message",
  "email_message",
  "cost_estimate",
]);

export const generateAiSchema = z.object({
  kind: aiKindSchema,
});

export const contactCopilotModeSchema = z.enum(["evaluate_message", "analyze_reply"]);

export const contactCopilotTurnSchema = z.object({
  role: z.enum(["seller", "client"]),
  text: z.string().trim().min(1).max(4000),
});

export const generateContactCopilotSchema = z.object({
  channel: contactChannelSchema,
  mode: contactCopilotModeSchema,
  text: z
    .string()
    .trim()
    .min(10, "Descreva a mensagem com um pouco mais de detalhe")
    .max(4000, "Texto muito longo — encurte para os pontos principais"),
  history: z.array(contactCopilotTurnSchema).max(30).default([]),
});

export const onboardingSchema = z.object({
  fullName: requiredText("Nome"),
  organizationName: requiredText("Organizacao"),
  professionalRole: z.string().trim().max(80).optional(),
});

export const ayhubClientStatusSchema = z.enum(["active", "inactive", "delinquent"]);
export const ayhubSiteStatusSchema = z.enum(["development", "live", "maintenance", "paused"]);
export const ayhubOwnerSchema = z.enum(["me", "client"]);
export const ayhubCostTypeSchema = z.enum(["domain", "hosting", "storage", "other"]);
export const ayhubFrequencySchema = z.enum(["monthly", "yearly", "once"]);

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug deve ter pelo menos 2 caracteres")
  .max(80, "Slug deve ter no maximo 80 caracteres")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minusculas, numeros e hifens");

export const createAyhubClientSchema = z.object({
  name: requiredText("Nome"),
  contact: z.string().trim().max(200).nullable().optional(),
  maintenanceValue: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  status: ayhubClientStatusSchema.optional(),
});

export const updateAyhubClientSchema = z
  .object({
    name: requiredText("Nome").optional(),
    contact: z.string().trim().max(200).nullable().optional(),
    maintenanceValue: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
    status: ayhubClientStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nada para atualizar" });

export const createAyhubSiteSchema = z.object({
  slug: slugSchema,
  domain: z.string().trim().max(253).nullable().optional(),
  domainOwner: ayhubOwnerSchema.optional(),
  deliveryDate: z.string().datetime({ offset: true }).nullable().optional(),
  status: ayhubSiteStatusSchema.optional(),
});

export const updateAyhubSiteSchema = z
  .object({
    slug: slugSchema.optional(),
    domain: z.string().trim().max(253).nullable().optional(),
    domainOwner: ayhubOwnerSchema.optional(),
    deliveryDate: z.string().datetime({ offset: true }).nullable().optional(),
    status: ayhubSiteStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nada para atualizar" });

export const createAyhubSiteCostSchema = z.object({
  type: ayhubCostTypeSchema,
  amount: z.coerce.number().min(0).max(1_000_000),
  frequency: ayhubFrequencySchema,
  nextRenewal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida")
    .nullable()
    .optional(),
  paymentOwner: ayhubOwnerSchema.optional(),
});

const contentBlockKeySchema = z
  .string()
  .trim()
  .min(2, "Chave deve ter pelo menos 2 caracteres")
  .max(80, "Chave deve ter no maximo 80 caracteres")
  .regex(/^[a-z0-9_]+(\.[a-z0-9_]+)*$/, "Use letras minusculas, numeros, pontos e underscores (ex.: hero.titulo)");

export const ayhubContentBlockTypeSchema = z.enum(["text", "image", "list"]);

export const createAyhubContentBlockSchema = z.object({
  key: contentBlockKeySchema,
  type: ayhubContentBlockTypeSchema,
  draftValue: z.unknown().optional(),
});

export const updateAyhubContentBlockSchema = z.object({
  draftValue: z.unknown(),
});

export const createAyhubPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01).max(1_000_000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type AddOrganizationMemberInput = z.infer<typeof addOrganizationMemberSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type QuickSearchInput = z.infer<typeof quickSearchSchema>;
export type CreateSearchInput = z.infer<typeof createSearchSchema>;
export type CreateManualBusinessInput = z.infer<typeof createManualBusinessSchema>;
export type BusinessListQueryInput = z.infer<typeof businessListQuerySchema>;
export type SavedFilterCreateInput = z.infer<typeof savedFilterCreateSchema>;
export type BusinessIdsInput = z.infer<typeof businessIdsSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInputSchema = z.infer<typeof updateLeadSchema>;
export type CreateLeadContactInputSchema = z.infer<typeof createLeadContactSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type GenerateAiInput = z.infer<typeof generateAiSchema>;
export type GenerateContactCopilotInputSchema = z.infer<typeof generateContactCopilotSchema>;
export type CreateAyhubClientInputSchema = z.infer<typeof createAyhubClientSchema>;
export type UpdateAyhubClientInputSchema = z.infer<typeof updateAyhubClientSchema>;
export type CreateAyhubSiteInputSchema = z.infer<typeof createAyhubSiteSchema>;
export type UpdateAyhubSiteInputSchema = z.infer<typeof updateAyhubSiteSchema>;
export type CreateAyhubSiteCostInputSchema = z.infer<typeof createAyhubSiteCostSchema>;
export type CreateAyhubContentBlockInputSchema = z.infer<typeof createAyhubContentBlockSchema>;
export type UpdateAyhubContentBlockInputSchema = z.infer<typeof updateAyhubContentBlockSchema>;
export type CreateAyhubPaymentInputSchema = z.infer<typeof createAyhubPaymentSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
