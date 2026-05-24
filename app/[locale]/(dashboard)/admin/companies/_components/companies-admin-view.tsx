"use client";

import { useState, useTransition } from "react";
import {
  createCompanyAsPlatformAdmin,
  setCompanyStatusAsPlatformAdmin,
  startCompanyImpersonation,
  stopCompanyImpersonation,
  switchMyActiveCompany,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PageListActions,
  PageListContent,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { Badge } from "@/components/ui/badge";

type CompanyRow = {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
  memberCount: number;
  profileEmail: string | null;
  profilePhone: string | null;
  createdAt: Date;
};

type MembershipRow = {
  companyId: string;
  companyName: string;
  isDefault: boolean;
};

export function CompaniesAdminView({
  companies,
  memberships,
  activeCompanyId,
  impersonatedCompanyId,
}: {
  companies: CompanyRow[];
  memberships: MembershipRow[];
  activeCompanyId: string | null;
  impersonatedCompanyId: string | null;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Platform Companies" />
        <PageListActions>
          {impersonatedCompanyId ? (
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await stopCompanyImpersonation();
                  window.location.reload();
                })
              }
            >
              Stop Impersonation
            </Button>
          ) : null}
        </PageListActions>
      </PageListHeader>

      <PageListContent className="space-y-6 p-4">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">Create Company</h3>
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Company name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Company code (optional)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              disabled={isPending || name.trim().length < 2}
              onClick={() =>
                startTransition(async () => {
                  await createCompanyAsPlatformAdmin({ name, code });
                  setName("");
                  setCode("");
                  window.location.reload();
                })
              }
            >
              Create
            </Button>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">Switch Active Company</h3>
          <div className="flex flex-wrap gap-2">
            {memberships.map((membership) => (
              <Button
                key={membership.companyId}
                size="sm"
                variant={activeCompanyId === membership.companyId ? "default" : "outline"}
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await switchMyActiveCompany(membership.companyId);
                    window.location.reload();
                  })
                }
              >
                {membership.companyName}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">Company List</h3>
          <div className="space-y-3">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{company.name}</p>
                    <Badge variant={company.status === "ACTIVE" ? "default" : "destructive"}>
                      {company.status}
                    </Badge>
                    {impersonatedCompanyId === company.id ? (
                      <Badge variant="secondary">Impersonating</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    code: {company.code} • members: {company.memberCount}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending || company.status !== "ACTIVE"}
                    onClick={() =>
                      startTransition(async () => {
                        await startCompanyImpersonation(company.id);
                        window.location.reload();
                      })
                    }
                  >
                    Impersonate
                  </Button>
                  <Button
                    size="sm"
                    variant={company.status === "ACTIVE" ? "destructive" : "default"}
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await setCompanyStatusAsPlatformAdmin(
                          company.id,
                          company.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                        );
                        window.location.reload();
                      })
                    }
                  >
                    {company.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No companies yet.</p>
            ) : null}
          </div>
        </div>
      </PageListContent>
    </PageListLayout>
  );
}

