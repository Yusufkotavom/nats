export const dynamic = "force-dynamic";

import Link from "next/link";
import { getEmployees } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    PageListLayout,
    PageListHeader,
    PageListTitle,
    PageListContent,
} from "@/components/layout/page/list-layout";
import { Settings } from "lucide-react";

export default async function SalaryStructuresPage() {
    const { data: employees } = await getEmployees();

    return (
        <PageListLayout>
            <PageListHeader>
                <PageListTitle title="Salary Structures" />
            </PageListHeader>

            <PageListContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Structure</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees?.map((employee: any) => {
                            const hasStructure = employee.salaryStructures?.length > 0;
                            return (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-medium">{employee.name}</TableCell>
                                    <TableCell>{employee.email || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={employee.isActive ? "default" : "secondary"}>
                                            {employee.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {hasStructure ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                                Configured
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                                                Not Configured
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/hr/payroll/salary-structures/${employee.id}`}>
                                            <Button variant="ghost" size="sm">
                                                <Settings className="mr-2 h-4 w-4" />
                                                Configure
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {!employees?.length && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    No employees found. Add employees in the Contacts module first.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PageListContent>
        </PageListLayout>
    );
}
