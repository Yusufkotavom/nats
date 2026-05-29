"use client";

import { useMemo, useState, useTransition } from "react";
import {
  assignPlanToCompany,
  createCompanyAsPlatformAdmin,
  createPlatformPlan,
  generateSubscriptionInvoiceForCompany,
  markSubscriptionInvoicePaid,
  runSubscriptionAutoBillingNow,
  savePlatformBillingSetting,
  setCompanyStatusAsPlatformAdmin,
  startCompanyImpersonation,
  stopCompanyImpersonation,
  switchMyActiveCompany,
  togglePlatformPlanStatus,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CompanyRow = {
  id: string;
  code: string;
  name: string;
  status: "PENDING_SETUP" | "ACTIVE" | "SUSPENDED";
  memberCount: number;
  profileEmail: string | null;
  profilePhone: string | null;
  createdAt: Date;
  subscription: {
    id: string;
    status: "PENDING_SETUP" | "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELED";
    planName: string | null;
    nextBillingDate: Date | null;
    lastInvoiceStatus: string | null;
    lastInvoiceNumber: string | null;
  } | null;
};

type MembershipRow = {
  companyId: string;
  companyName: string;
  isDefault: boolean;
};

type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: any;
  currency: string;
  billingCycle: "MONTHLY" | "YEARLY";
  isActive: boolean;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  companyName: string;
  companyCode: string;
  planName: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "VOID";
  issueDate: Date;
  dueDate: Date;
  totalAmount: number;
};

type BillingSetting = {
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  whatsappConfirmTo: string;
  paymentInstruction: string | null;
};

export function CompaniesAdminView({
  companies,
  memberships,
  plans,
  invoices,
  billingSetting,
  activeCompanyId,
  impersonatedCompanyId,
}: {
  companies: CompanyRow[];
  memberships: MembershipRow[];
  plans: PlanRow[];
  invoices: InvoiceRow[];
  billingSetting: BillingSetting;
  activeCompanyId: string | null;
  impersonatedCompanyId: string | null;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("0");
  const [planBillingCycle, setPlanBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [billingBankName, setBillingBankName] = useState(billingSetting.bankName || "");
  const [billingBankNumber, setBillingBankNumber] = useState(billingSetting.bankAccountNumber || "");
  const [billingAccountName, setBillingAccountName] = useState(billingSetting.bankAccountName || "");
  const [billingWhatsapp, setBillingWhatsapp] = useState(billingSetting.whatsappConfirmTo || "085799520350");
  const [billingInstruction, setBillingInstruction] = useState(billingSetting.paymentInstruction || "");
  const [isPending, startTransition] = useTransition();

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Platform Admin Workspace" />
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
        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="billing">Subscription Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Create Company</h3>
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Company code (optional)" value={code} onChange={(e) => setCode(e.target.value)} />
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
                  <div key={company.id} className="flex flex-col gap-3 rounded-md border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{company.name}</p>
                      <Badge variant={company.status === "ACTIVE" ? "default" : company.status === "PENDING_SETUP" ? "secondary" : "destructive"}>
                        {company.status}
                      </Badge>
                      {impersonatedCompanyId === company.id ? <Badge variant="secondary">Impersonating</Badge> : null}
                      {company.subscription?.planName ? <Badge variant="outline">Plan: {company.subscription.planName}</Badge> : <Badge variant="outline">No Plan</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      code: {company.code} • members: {company.memberCount} • next billing: {company.subscription?.nextBillingDate ? new Date(company.subscription.nextBillingDate).toLocaleDateString() : "-"}
                    </p>
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Create Platform Plan</h3>
              <div className="grid gap-2 md:grid-cols-5">
                <Input placeholder="Code (e.g. UMKM)" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
                <Input placeholder="Plan name" value={planName} onChange={(e) => setPlanName(e.target.value)} />
                <Input type="number" placeholder="Price" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} />
                <Select value={planBillingCycle} onValueChange={(value) => setPlanBillingCycle(value as "MONTHLY" | "YEARLY")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Billing cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  disabled={isPending || !planCode.trim() || !planName.trim()}
                  onClick={() =>
                    startTransition(async () => {
                      await createPlatformPlan({
                        code: planCode,
                        name: planName,
                        price: Number(planPrice) || 0,
                        currency: "IDR",
                        billingCycle: planBillingCycle,
                      });
                      setPlanCode("");
                      setPlanName("");
                      setPlanPrice("0");
                      setPlanBillingCycle("MONTHLY");
                      window.location.reload();
                    })
                  }
                >
                  Add Plan
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Plan Catalog</h3>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="text-sm font-medium">{plan.name} ({plan.code})</p>
                      <p className="text-xs text-muted-foreground">{plan.currency} {Number(plan.price || 0).toLocaleString()} / {plan.billingCycle}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={plan.isActive ? "destructive" : "default"}
                      onClick={() =>
                        startTransition(async () => {
                          await togglePlatformPlanStatus(plan.id, !plan.isActive);
                          window.location.reload();
                        })
                      }
                    >
                      {plan.isActive ? "Disable" : "Enable"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Subscription Payment Setting</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Bank name" value={billingBankName} onChange={(e) => setBillingBankName(e.target.value)} />
                <Input placeholder="Bank account number" value={billingBankNumber} onChange={(e) => setBillingBankNumber(e.target.value)} />
                <Input placeholder="Bank account holder name" value={billingAccountName} onChange={(e) => setBillingAccountName(e.target.value)} />
                <Input placeholder="WhatsApp confirmation number" value={billingWhatsapp} onChange={(e) => setBillingWhatsapp(e.target.value)} />
                <Input
                  className="md:col-span-2"
                  placeholder="Optional additional payment instruction"
                  value={billingInstruction}
                  onChange={(e) => setBillingInstruction(e.target.value)}
                />
              </div>
              <div className="mt-3">
                <Button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await savePlatformBillingSetting({
                        bankName: billingBankName,
                        bankAccountNumber: billingBankNumber,
                        bankAccountName: billingAccountName,
                        whatsappConfirmTo: billingWhatsapp,
                        paymentInstruction: billingInstruction,
                      });
                      window.location.reload();
                    })
                  }
                >
                  Save Payment Setting
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Assign Plan to Company</h3>
              <div className="grid gap-2 md:grid-cols-3">
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={isPending || !selectedCompanyId || !selectedPlanId}
                  onClick={() =>
                    startTransition(async () => {
                      await assignPlanToCompany({ companyId: selectedCompanyId, planId: selectedPlanId });
                      window.location.reload();
                    })
                  }
                >
                  Assign Plan
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Generate Subscription Invoice</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={isPending || !selectedCompanyId}
                  onClick={() =>
                    startTransition(async () => {
                      await generateSubscriptionInvoiceForCompany({ companyId: selectedCompanyId });
                      window.location.reload();
                    })
                  }
                >
                  Generate Invoice
                </Button>
              </div>
              <div className="mt-3">
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await runSubscriptionAutoBillingNow();
                      window.location.reload();
                    })
                  }
                >
                  Run Auto Billing Now
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Subscription Invoice List</h3>
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex flex-wrap items-center justify-between rounded border p-2 gap-2">
                    <div>
                      <p className="text-sm font-medium">{invoice.invoiceNumber} • {invoice.companyName}</p>
                      <p className="text-xs text-muted-foreground">{invoice.planName} • due {new Date(invoice.dueDate).toLocaleDateString()} • IDR {Number(invoice.totalAmount).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={invoice.status === "PAID" ? "default" : invoice.status === "ISSUED" ? "secondary" : "outline"}>{invoice.status}</Badge>
                      {invoice.status !== "PAID" ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            startTransition(async () => {
                              await markSubscriptionInvoicePaid(invoice.id);
                              window.location.reload();
                            })
                          }
                        >
                          Mark Paid
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {invoices.length === 0 ? <p className="text-sm text-muted-foreground">No subscription invoices yet.</p> : null}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PageListContent>
    </PageListLayout>
  );
}
