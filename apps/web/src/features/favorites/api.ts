import type { FavoriteToggleResponse } from "@aypros/types";
import { apiFetch } from "@/lib/api";

export function favoriteBusiness(businessId: string): Promise<FavoriteToggleResponse> {
  return apiFetch<FavoriteToggleResponse>(`/v1/businesses/${businessId}/favorite`, {
    method: "POST",
  });
}

export function unfavoriteBusiness(businessId: string): Promise<FavoriteToggleResponse> {
  return apiFetch<FavoriteToggleResponse>(`/v1/businesses/${businessId}/favorite`, {
    method: "DELETE",
  });
}
