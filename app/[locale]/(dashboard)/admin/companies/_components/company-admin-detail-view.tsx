"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  updateCompanyAsPlatformAdmin,
  assignPlanToCompany,
  setCompanyStatusAsPlatformAdmin,
} from "../actions";

type CompanyDetail = {
  id: string;
  code: string;
  name: string;
  status: string;
  profileEmail: string | null;
  profilePhone: string | null;
  memberCount: number;
  createdAt: Date;
  subscription: {
    id: string;
    status: string;
    planId: string | null;
    planName: string | null;
    startDate: Date | null;
    endDate: Date | null;
    nextBillingDate: Date | null;
    autoRenew: boolean;
  } | null;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    dueDate: Date;
    totalAmount: number;
  }>;
};

type PlanRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export function CompanyAdminDetailView({ company, plans }: { company: CompanyDetail; plans: PlanRow[] }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(company.name);
  const [code, setCode] = useState(company.code);
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED" | "PENDING_SETUP">(
    (company.status as "ACTIVE" | "SUSPENDED" | "PENDING_SETUP") || "ACTIVE",
  );
  const [planId, setPlanId] = useState(company.subscription?.planId || "");

  const run = (task: () => Promise<any>, success: string) => {
    startTransition(async () => {
      const result = await task();
      if (result?.success === false) {
        toast({ title: "Action failed", description: result.error || "Failed", variant: "destructive" });
        return;
      }
      toast({ title: success });
      window.location.reload();
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Edit Company</h1>
          <p className="text-sm text-muted-foreground">{company.name} ({company.code})</p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/companies">Back</Link></Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-3 rounded-lg border p-4">
          <div className="grid gap-2 md:grid-cols-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company Name" />
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Company Code" />
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                <SelectItem value="PENDING_SETUP">PENDING_SETUP</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground flex items-center">Members: {company.memberCount}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isPending} onClick={() => run(() => updateCompanyAsPlatformAdmin({ companyId: company.id, name, code, status }), "Company updated")}>Save Company</Button>
            <Button
              variant={status === "ACTIVE" ? "destructive" : "default"}
              disabled={isPending}
              onClick={() => run(() => setCompanyStatusAsPlatformAdmin(company.id, status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"), "Company status updated")}
            >
              {status === "ACTIVE" ? "Suspend" : "Activate"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm">
            <span>Current:</span>
            <Badge variant="outline">{company.subscription?.status || "NO_SUBSCRIPTION"}</Badge>
            <span>{company.subscription?.planName || "-"}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Select value={planId || "__NONE__"} onValueChange={(v) => setPlanId(v === "__NONE__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">No plan</SelectItem>
                {plans.filter((p) => p.isActive).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={isPending || !planId} onClick={() => run(() => assignPlanToCompany({ companyId: company.id, planId }), "Plan assigned")}>Assign Plan</Button>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-3 rounded-lg border p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.invoiceNumber}</TableCell>
                  <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>IDR {Number(inv.totalAmount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{inv.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
