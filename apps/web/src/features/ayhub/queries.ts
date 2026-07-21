"use client";

import type { CreateAyhubClientInput, CreateAyhubContentBlockInput, CreateAyhubPaymentInput, CreateAyhubSiteCostInput, CreateAyhubSiteInput, UpdateAyhubClientInput, UpdateAyhubSiteInput } from "@aypros/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAyhubClient,
  createAyhubContentBlock,
  createAyhubPayment,
  createAyhubSite,
  createAyhubSiteCost,
  createAyhubSiteKey,
  deleteAyhubSiteCost,
  getAyhubClient,
  getAyhubClients,
  getAyhubDashboard,
  getAyhubSite,
  publishAyhubSite,
  revokeAyhubSiteKey,
  updateAyhubClient,
  updateAyhubContentBlock,
  updateAyhubSite,
} from "./api";

const clientsKey = ["ayhub", "clients"] as const;
const clientKey = (id: string) => ["ayhub", "client", id] as const;
const siteKey = (id: string) => ["ayhub", "site", id] as const;
const dashboardKey = ["ayhub", "dashboard"] as const;

// Exportadas pro pipeline invalidar quando um lead vira "ganho" — a criação do
// cliente AYhub é efeito colateral do PATCH do lead, não uma mutation própria
// daqui, então não existe outro jeito de saber que essas queries ficaram stale.
export const ayhubClientsKey = clientsKey;
export const ayhubDashboardKey = dashboardKey;

export function useAyhubClients() {
  return useQuery({ queryKey: clientsKey, queryFn: getAyhubClients, staleTime: 30_000 });
}

export function useCreateAyhubClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAyhubClientInput) => createAyhubClient(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientsKey });
    },
  });
}

export function useAyhubClient(id: string | undefined) {
  return useQuery({
    queryKey: clientKey(id as string),
    queryFn: () => getAyhubClient(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useUpdateAyhubClient(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAyhubClientInput) => updateAyhubClient(id as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientsKey });
      if (id) void queryClient.invalidateQueries({ queryKey: clientKey(id) });
    },
  });
}

export function useCreateAyhubSite(clientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAyhubSiteInput) => createAyhubSite(clientId as string, input),
    onSuccess: () => {
      if (clientId) void queryClient.invalidateQueries({ queryKey: clientKey(clientId) });
      void queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

export function useAyhubSite(id: string | undefined) {
  return useQuery({
    queryKey: siteKey(id as string),
    queryFn: () => getAyhubSite(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useUpdateAyhubSite(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAyhubSiteInput) => updateAyhubSite(id as string, input),
    onSuccess: (updated) => {
      if (id) void queryClient.invalidateQueries({ queryKey: siteKey(id) });
      void queryClient.invalidateQueries({ queryKey: clientKey(updated.clientId) });
    },
  });
}

export function useCreateAyhubSiteKey(siteId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createAyhubSiteKey(siteId as string),
    onSuccess: () => {
      if (siteId) void queryClient.invalidateQueries({ queryKey: siteKey(siteId) });
    },
  });
}

export function useRevokeAyhubSiteKey(siteId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => revokeAyhubSiteKey(siteId as string, keyId),
    onSuccess: () => {
      if (siteId) void queryClient.invalidateQueries({ queryKey: siteKey(siteId) });
    },
  });
}

export function useCreateAyhubSiteCost(siteId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAyhubSiteCostInput) => createAyhubSiteCost(siteId as string, input),
    onSuccess: () => {
      if (siteId) void queryClient.invalidateQueries({ queryKey: siteKey(siteId) });
      void queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

export function useDeleteAyhubSiteCost(siteId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (costId: string) => deleteAyhubSiteCost(costId),
    onSuccess: () => {
      if (siteId) void queryClient.invalidateQueries({ queryKey: siteKey(siteId) });
      void queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

export function useUpdateAyhubContentBlock(siteId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blockId, draftValue }: { blockId: string; draftValue: unknown }) =>
      updateAyhubContentBlock(blockId, draftValue),
    onSuccess: () => {
      if (siteId) void queryClient.invalidateQueries({ queryKey: siteKey(siteId) });
    },
  });
}

export function useCreateAyhubContentBlock(siteId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAyhubContentBlockInput) => createAyhubContentBlock(siteId as string, input),
    onSuccess: () => {
      if (siteId) void queryClient.invalidateQueries({ queryKey: siteKey(siteId) });
    },
  });
}

export function usePublishAyhubSite(siteId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => publishAyhubSite(siteId as string),
    onSuccess: () => {
      if (siteId) void queryClient.invalidateQueries({ queryKey: siteKey(siteId) });
    },
  });
}

export function useCreateAyhubPayment(clientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAyhubPaymentInput) => createAyhubPayment(clientId as string, input),
    onSuccess: () => {
      if (clientId) void queryClient.invalidateQueries({ queryKey: clientKey(clientId) });
    },
  });
}

export function useAyhubDashboard() {
  return useQuery({ queryKey: dashboardKey, queryFn: getAyhubDashboard, staleTime: 30_000 });
}
