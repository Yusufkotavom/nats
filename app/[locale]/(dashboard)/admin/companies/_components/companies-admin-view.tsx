"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  assignPlanToCompany,
  createCompanyAsPlatformAdmin,
  createPlatformPlan,
  generateSubscriptionInvoiceForCompany,
  markSubscriptionInvoicePaid,
  runSubscriptionAutoBillingNow,
  saveCompanySubscriptionManual,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
    planId?: string | null;
    planName: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    nextBillingDate: Date | null;
    autoRenew?: boolean;
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
  monthlyTransactionLimit?: number | null;
  featureList?: string[];
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

type ActionResult = { success: boolean; error?: string; data?: unknown };

type ManualStatus = "PENDING_SETUP" | "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELED";

function fmtDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function readActionError(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const maybe = result as { success?: boolean; error?: string };
  if (maybe.success === false) return maybe.error || "Action failed";
  return null;
}

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
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("0");
  const [planBillingCycle, setPlanBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [planMonthlyLimit, setPlanMonthlyLimit] = useState("");
  const [planFeaturesText, setPlanFeaturesText] = useState("");
  const [billingBankName, setBillingBankName] = useState(billingSetting.bankName || "");
  const [billingBankNumber, setBillingBankNumber] = useState(billingSetting.bankAccountNumber || "");
  const [billingAccountName, setBillingAccountName] = useState(billingSetting.bankAccountName || "");
  const [billingWhatsapp, setBillingWhatsapp] = useState(billingSetting.whatsappConfirmTo || "085799520350");
  const [billingInstruction, setBillingInstruction] = useState(billingSetting.paymentInstruction || "");

  const [isPending, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [editCompanyId, setEditCompanyId] = useState("");
  const [manualPlanId, setManualPlanId] = useState("");
  const [manualStatus, setManualStatus] = useState<ManualStatus>("TRIAL");
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualEndDate, setManualEndDate] = useState("");
  const [manualNextBillingDate, setManualNextBillingDate] = useState("");
  const [manualAutoRenew, setManualAutoRenew] = useState(false);

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans]);
  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === editCompanyId) || null,
    [companies, editCompanyId],
  );
  const selectedCompanyInvoices = useMemo(
    () => invoices.filter((inv) => inv.companyCode === selectedCompany?.code),
    [invoices, selectedCompany?.code],
  );

  const runAction = (
    task: () => Promise<ActionResult | void>,
    options: {
      successTitle: string;
      successDescription?: string;
      onSuccess?: () => void;
      refresh?: boolean;
    },
  ) => {
    startTransition(async () => {
      try {
        const result = await task();
        const actionError = readActionError(result);
        if (actionError) {
          toast({
            title: "Action failed",
            description: actionError,
            variant: "destructive",
          });
          return;
        }

        if (options.onSuccess) options.onSuccess();
        toast({
          title: options.successTitle,
          description: options.successDescription,
        });
        if (options.refresh !== false) router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        toast({
          title: "Action failed",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const openEdit = (company: CompanyRow) => {
    setEditCompanyId(company.id);
    setManualPlanId(company.subscription?.planId || "");
    setManualStatus(company.subscription?.status || "TRIAL");
    setManualStartDate(company.subscription?.startDate ? new Date(company.subscription.startDate).toISOString().slice(0, 10) : "");
    setManualEndDate(company.subscription?.endDate ? new Date(company.subscription.endDate).toISOString().slice(0, 10) : "");
    setManualNextBillingDate(
      company.subscription?.nextBillingDate
        ? new Date(company.subscription.nextBillingDate).toISOString().slice(0, 10)
        : "",
    );
    setManualAutoRenew(Boolean(company.subscription?.autoRenew));
    setEditOpen(true);
  };

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
                runAction(stopCompanyImpersonation, {
                  successTitle: "Impersonation stopped",
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
                    runAction(() => createCompanyAsPlatformAdmin({ name, code }), {
                      successTitle: "Company created",
                      onSuccess: () => {
                        setName("");
                        setCode("");
                      },
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
                      runAction(() => switchMyActiveCompany(membership.companyId), {
                        successTitle: "Active company switched",
                      })
                    }
                  >
                    {membership.companyName}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Company + Subscription Table</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.code}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.status === "ACTIVE" ? "default" : company.status === "PENDING_SETUP" ? "secondary" : "destructive"}>
                          {company.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{company.subscription?.status || "NO_SUBSCRIPTION"}</Badge>
                      </TableCell>
                      <TableCell>{company.subscription?.planName || "-"}</TableCell>
                      <TableCell>{fmtDate(company.subscription?.nextBillingDate)}</TableCell>
                      <TableCell>{company.memberCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(company)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={company.status === "ACTIVE" ? "destructive" : "default"}
                            disabled={isPending}
                            onClick={() =>
                              runAction(
                                () =>
                                  setCompanyStatusAsPlatformAdmin(
                                    company.id,
                                    company.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                                  ),
                                {
                                  successTitle:
                                    company.status === "ACTIVE"
                                      ? "Company suspended"
                                      : "Company activated",
                                },
                              )
                            }
                          >
                            {company.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Create Platform Plan</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Code (e.g. UMKM)" value={planCode} onChange={(e) => setPlanCode(e.target.value)} />
                <Input placeholder="Plan name" value={planName} onChange={(e) => setPlanName(e.target.value)} />
                <Input type="number" placeholder="Price" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} />
                <Input
                  type="number"
                  placeholder="Monthly tx limit (empty = unlimited)"
                  value={planMonthlyLimit}
                  onChange={(e) => setPlanMonthlyLimit(e.target.value)}
                />
                <Select value={planBillingCycle} onValueChange={(value) => setPlanBillingCycle(value as "MONTHLY" | "YEARLY") }>
                  <SelectTrigger>
                    <SelectValue placeholder="Billing cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="md:col-span-2"
                  placeholder="Fitur plan (pisahkan dengan koma). Contoh: POS, Service, Multi Warehouse"
                  value={planFeaturesText}
                  onChange={(e) => setPlanFeaturesText(e.target.value)}
                />
                <Button
                  disabled={isPending || !planCode.trim() || !planName.trim()}
                  onClick={() =>
                    runAction(
                      () =>
                        createPlatformPlan({
                          code: planCode,
                          name: planName,
                          price: Number(planPrice) || 0,
                          currency: "IDR",
                          billingCycle: planBillingCycle,
                          monthlyTransactionLimit: planMonthlyLimit.trim() ? Number(planMonthlyLimit) : null,
                          featureList: planFeaturesText.split(",").map((x) => x.trim()).filter(Boolean),
                        }),
                      {
                        successTitle: "Plan created",
                        onSuccess: () => {
                          setPlanCode("");
                          setPlanName("");
                          setPlanPrice("0");
                          setPlanBillingCycle("MONTHLY");
                          setPlanMonthlyLimit("");
                          setPlanFeaturesText("");
                        },
                      },
                    )
                  }
                >
                  Add Plan
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Plan Catalog</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Tx Limit</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">{plan.code}</p>
                      </TableCell>
                      <TableCell>{plan.currency} {Number(plan.price || 0).toLocaleString()}</TableCell>
                      <TableCell>{plan.billingCycle}</TableCell>
                      <TableCell>{plan.monthlyTransactionLimit ? plan.monthlyTransactionLimit.toLocaleString() : "Unlimited"}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{(plan.featureList || []).join(", ") || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={plan.isActive ? "destructive" : "default"}
                          disabled={isPending}
                          onClick={() =>
                            runAction(() => togglePlatformPlanStatus(plan.id, !plan.isActive), {
                              successTitle: plan.isActive ? "Plan disabled" : "Plan enabled",
                            })
                          }
                        >
                          {plan.isActive ? "Disable" : "Enable"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <div className="mt-3 flex gap-2">
                <Button
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () =>
                        savePlatformBillingSetting({
                          bankName: billingBankName,
                          bankAccountNumber: billingBankNumber,
                          bankAccountName: billingAccountName,
                          whatsappConfirmTo: billingWhatsapp,
                          paymentInstruction: billingInstruction,
                        }),
                      { successTitle: "Billing setting saved" },
                    )
                  }
                >
                  Save Payment Setting
                </Button>
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    runAction(runSubscriptionAutoBillingNow, {
                      successTitle: "Auto billing executed",
                    })
                  }
                >
                  Run Auto Billing Now
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">All Subscription Invoices</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.companyName}</TableCell>
                      <TableCell>{invoice.planName}</TableCell>
                      <TableCell>{fmtDate(invoice.dueDate)}</TableCell>
                      <TableCell>IDR {Number(invoice.totalAmount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === "PAID" ? "default" : invoice.status === "ISSUED" ? "secondary" : "outline"}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.status !== "PAID" ? (
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                              runAction(() => markSubscriptionInvoicePaid(invoice.id), {
                                successTitle: "Invoice marked paid",
                              })
                            }
                          >
                            Mark Paid
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </PageListContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-5xl" title="Edit Company">
          <DialogHeader>
            <DialogTitle>Edit Company: {selectedCompany?.name || "-"}</DialogTitle>
            <DialogDescription>Semua action subscription + company action ada di panel ini.</DialogDescription>
          </DialogHeader>

          {selectedCompany ? (
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-4">
                <div className="rounded border p-2 text-xs">Code: {selectedCompany.code}</div>
                <div className="rounded border p-2 text-xs">Email: {selectedCompany.profileEmail || "-"}</div>
                <div className="rounded border p-2 text-xs">Phone: {selectedCompany.profilePhone || "-"}</div>
                <div className="rounded border p-2 text-xs">Created: {fmtDate(selectedCompany.createdAt)}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending || selectedCompany.status !== "ACTIVE"}
                  onClick={() =>
                    runAction(() => startCompanyImpersonation(selectedCompany.id), {
                      successTitle: "Impersonation started",
                    })
                  }
                >
                  Impersonate
                </Button>
                <Button
                  size="sm"
                  variant={selectedCompany.status === "ACTIVE" ? "destructive" : "default"}
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () =>
                        setCompanyStatusAsPlatformAdmin(
                          selectedCompany.id,
                          selectedCompany.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                        ),
                      {
                        successTitle:
                          selectedCompany.status === "ACTIVE"
                            ? "Company suspended"
                            : "Company activated",
                      },
                    )
                  }
                >
                  {selectedCompany.status === "ACTIVE" ? "Suspend Company" : "Activate Company"}
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/users">Manage Users / Reset Password</Link>
                </Button>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Assign Plan</h4>
                <div className="grid gap-2 md:grid-cols-3">
                  <Select value={manualPlanId || "__NONE__"} onValueChange={(value) => setManualPlanId(value === "__NONE__" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">No plan</SelectItem>
                      {activePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={isPending || !manualPlanId}
                    onClick={() =>
                      runAction(
                        () => assignPlanToCompany({ companyId: selectedCompany.id, planId: manualPlanId }),
                        { successTitle: "Plan assigned" },
                      )
                    }
                  >
                    Assign Plan
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Manual Subscription Override</h4>
                <div className="grid gap-2 md:grid-cols-4">
                  <Select value={manualStatus} onValueChange={(value) => setManualStatus(value as ManualStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Subscription status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING_SETUP">PENDING_SETUP</SelectItem>
                      <SelectItem value="TRIAL">TRIAL</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                      <SelectItem value="CANCELED">CANCELED</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={manualAutoRenew ? "YES" : "NO"} onValueChange={(value) => setManualAutoRenew(value === "YES")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto renew" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YES">Auto renew ON</SelectItem>
                      <SelectItem value="NO">Auto renew OFF</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={manualStartDate} onChange={(e) => setManualStartDate(e.target.value)} />
                  <Input type="date" value={manualEndDate} onChange={(e) => setManualEndDate(e.target.value)} />
                  <Input type="date" value={manualNextBillingDate} onChange={(e) => setManualNextBillingDate(e.target.value)} />
                  <Button
                    disabled={isPending}
                    onClick={() =>
                      runAction(
                        () =>
                          saveCompanySubscriptionManual({
                            companyId: selectedCompany.id,
                            planId: manualPlanId || null,
                            status: manualStatus,
                            startDate: manualStartDate || null,
                            endDate: manualEndDate || null,
                            nextBillingDate: manualNextBillingDate || null,
                            autoRenew: manualAutoRenew,
                          }),
                        { successTitle: "Subscription updated" },
                      )
                    }
                  >
                    Save Subscription
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Invoice Actions</h4>
                <div className="flex gap-2">
                  <Button
                    disabled={isPending}
                    onClick={() =>
                      runAction(
                        () => generateSubscriptionInvoiceForCompany({ companyId: selectedCompany.id }),
                        { successTitle: "Invoice generated" },
                      )
                    }
                  >
                    Generate Invoice
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      runAction(runSubscriptionAutoBillingNow, {
                        successTitle: "Auto billing executed",
                      })
                    }
                  >
                    Run Auto Billing
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCompanyInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.planName}</TableCell>
                        <TableCell>{fmtDate(invoice.dueDate)}</TableCell>
                        <TableCell>IDR {Number(invoice.totalAmount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === "PAID" ? "default" : invoice.status === "ISSUED" ? "secondary" : "outline"}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.status !== "PAID" ? (
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() =>
                                runAction(() => markSubscriptionInvoicePaid(invoice.id), {
                                  successTitle: "Invoice marked paid",
                                })
                              }
                            >
                              Mark Paid
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                    {selectedCompanyInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                          No invoices for this company.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageListLayout>
  );
}
