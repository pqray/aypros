"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from "@aypros/ui";
import type { OrganizationRole } from "@aypros/types";
import { addOrganizationMemberSchema } from "@aypros/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addOrganizationMember, getOrganizationMembers } from "@/features/organization/api";

const roleLabels: Record<OrganizationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
};

export function OrganizationMembersCard({
  organizationId,
  currentRole,
}: {
  organizationId: string;
  currentRole: OrganizationRole;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const canManage = currentRole === "owner" || currentRole === "admin";
  const members = useQuery({
    queryKey: ["org", organizationId, "members"],
    queryFn: getOrganizationMembers,
    staleTime: 60_000,
  });
  const addMember = useMutation({
    mutationFn: addOrganizationMember,
    onSuccess: (response) => {
      queryClient.setQueryData(["org", organizationId, "members"], response);
      setEmail("");
      setRole("member");
      toast.success("Membro adicionado.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar o membro.");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = addOrganizationMemberSchema.safeParse({ email, role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revise os dados.");
      return;
    }
    addMember.mutate(parsed.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membros</CardTitle>
        <CardDescription>Adicione usuários já cadastrados para dividir leads e responsabilidades.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {canManage ? (
          <form
            className="grid items-end gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-[minmax(14rem,1fr)_10rem_auto]"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <Label htmlFor="member-email">E-mail</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="pessoa@empresa.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Papel</Label>
              <Select value={role} onValueChange={(value) => setRole(value as "admin" | "member")}>
                <SelectTrigger id="member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full sm:w-auto" loading={addMember.isPending}>
              Adicionar
            </Button>
          </form>
        ) : null}

        {members.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            {(members.data?.items ?? []).map((member) => (
              <div key={member.userId} className="flex items-center justify-between gap-3 border-b px-3 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.fullName ?? member.email ?? member.userId}</p>
                  {member.email ? <p className="truncate text-xs text-muted-foreground">{member.email}</p> : null}
                </div>
                <Badge variant={member.role === "owner" ? "secondary" : "outline"}>{roleLabels[member.role]}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
