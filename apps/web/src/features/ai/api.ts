import type { AiGenerationsResponse, AiKind, GenerateAiResponse } from "@aypros/types";
import { apiFetch } from "@/lib/api";

export { ApiError } from "@/lib/api";

export function listAiGenerations(businessId: string): Promise<AiGenerationsResponse> {
  return apiFetch<AiGenerationsResponse>(`/v1/businesses/${businessId}/ai-generations`);
}

export function generateAi(businessId: string, kind: AiKind): Promise<GenerateAiResponse> {
  return apiFetch<GenerateAiResponse>(`/v1/businesses/${businessId}/ai-generations`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}
