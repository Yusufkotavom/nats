import { getPayrollPeriod } from "../actions";
import { verifySession } from "@/lib/auth/auth";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PayrollActions } from "./_components/payroll-actions";

export default async function PeriodDetailPage({
    params,
}: {
    params: { periodId: string };
}) {
    const { userId } = await verifySession();
    const { data: period } = await getPayrollPeriod(params.periodId);

    if (!period) {
        notFound();
    }

    // Calculate stats from slips for current status display
    // Use DB values if run is completed, otherwise sum current slips
    let totalEarnings = 0;
    let totalDeductions = 0;
    let netPay = 0;

    if (period.status === "COMPLETED" && period.payrollRuns.length > 0) {
        // Should get from latest run ideally
        const run = period.payrollRuns[period.payrollRuns.length - 1];
        totalEarnings = Number(run.totalEarnings);
        totalDeductions = Number(run.totalDeductions);
        netPay = Number(run.netPay);
    } else {
        // Sum from current draft slips
        period.salarySlips.forEach((slip) => {
            totalEarnings += Number(slip.grossSalary);
            totalDeductions += Number(slip.totalDeductions);
            netPay += Number(slip.netSalary);
        });
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{period.name}</h2>
                    <p className="text-muted-foreground">
                        {format(new Date(period.startDate), "PP")} -{" "}
                        {format(new Date(period.endDate), "PP")}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge variant={period.status === "COMPLETED" ? "default" : "secondary"} className="mr-2">
                        {period.status}
                    </Badge>
                    <PayrollActions periodId={period.id} status={period.status} userId={userId} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEarnings.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDeductions.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Pay</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{netPay.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Salary Slips</CardTitle>
                    <CardDescription>
                        {period.salarySlips.length} slips generated
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead className="text-right">Gross Salary</TableHead>
                                <TableHead className="text-right">Deductions</TableHead>
                                <TableHead className="text-right">Net Salary</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {period.salarySlips.map((slip) => (
                                <TableRow key={slip.id}>
                                    <TableCell>{slip.contact.name}</TableCell>
                                    <TableCell className="text-right">
                                        {Number(slip.grossSalary).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Number(slip.totalDeductions).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Number(slip.netSalary).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{slip.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!period.salarySlips.length && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        No salary slips generated yet. Run payroll to generate.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
