import { getSubscriptionData } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import Link from "next/link";

export default async function SubscriptionPage() {
    const data = await getSubscriptionData();

    const usagePercentage =
        data.monthlyLimit !== "Unlimited"
            ? Math.min((data.monthlyUsage / (data.monthlyLimit as number)) * 100, 100)
            : 0;

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Subscription Management</h1>
            </div>

            {data.isReadOnly ? (
                <Card className="border-amber-500">
                    <CardHeader>
                        <CardTitle className="text-amber-600">Read-only Mode</CardTitle>
                        <CardDescription>
                            Company ini read-only karena trial/subscription tidak aktif. Silakan lakukan pembayaran dan konfirmasi untuk aktivasi kembali.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                        <Badge variant={data.subscriptionStatus === "ACTIVE" || data.subscriptionStatus === "TRIAL" ? "default" : "secondary"}>
                            {data.subscriptionStatus}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.subscription}</div>
                        <p className="text-muted-foreground text-xs pt-1">
                            {data.subscriptionStart && data.subscriptionEnd ? (
                                `Active from ${format(new Date(data.subscriptionStart), "PPP")} to ${format(new Date(data.subscriptionEnd), "PPP")}`
                            ) : (
                                "Not configured yet"
                            )}
                        </p>
                        <p className="text-muted-foreground text-xs pt-1">
                            Next Billing: {data.nextBillingDate ? format(new Date(data.nextBillingDate), "PPP") : "-"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="md:col-span-1 lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Transactions Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.monthlyUsage} / {data.monthlyLimit}
                        </div>
                        {data.monthlyLimit !== "Unlimited" ? (
                            <div className="mt-4 flex flex-col gap-2">
                                <Progress value={usagePercentage} />
                                <p className="text-muted-foreground text-xs text-right">
                                    {usagePercentage.toFixed(1)}% used
                                </p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground mt-4 text-xs">
                                You have unlimited transactions.
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card className="md:col-span-1 lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Plan Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.planFeatures.length > 0 ? (
                            <ul className="list-disc space-y-1 pl-5 text-sm">
                                {data.planFeatures.map((feature: string) => (
                                    <li key={feature}>{feature}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No feature list configured for this plan.</p>
                        )}
                    </CardContent>
                </Card>
                <Card className="md:col-span-1 lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Subscription Payment Instruction</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p>Bank: {data.paymentInstruction.bankName || "-"}</p>
                        <p>Account Number: {data.paymentInstruction.bankAccountNumber || "-"}</p>
                        <p>Account Name: {data.paymentInstruction.bankAccountName || "-"}</p>
                        <p>WhatsApp Confirmation: {data.paymentInstruction.whatsappConfirmTo}</p>
                        {data.paymentInstruction.customInstruction ? (
                            <p className="text-muted-foreground">{data.paymentInstruction.customInstruction}</p>
                        ) : null}
                        <Link
                            href={`https://wa.me/${String(data.paymentInstruction.whatsappConfirmTo).replace(/\\D/g, "")}?text=${encodeURIComponent(`Halo, saya konfirmasi pembayaran subscription untuk ${data.tenantName}.`)}`}
                            target="_blank"
                            className="inline-flex rounded-md border px-3 py-2 text-sm"
                        >
                            Konfirmasi via WhatsApp
                        </Link>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Recent billing and payment transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.paymentHistory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No payment history found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.paymentHistory.map((payment: any) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(new Date(payment.paymentDate), "PPP")}</TableCell>
                                        <TableCell>{payment.description || "-"}</TableCell>
                                        <TableCell>{payment.reference || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={payment.status === "PAID" ? "default" : "outline"}>
                                                {payment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat("id-ID", {
                                                style: "currency",
                                                currency: "IDR",
                                            }).format(payment.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
