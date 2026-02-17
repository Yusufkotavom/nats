import { Suspense } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    PageListLayout,
    PageListHeader,
    PageListTitle,
    PageListActions,
    PageListContent,
    PageListFilter,
} from "@/components/layout/page/list-layout";
import { DataTable } from "@/components/ui/data-table";
import { getEmployees } from "./actions";
import { SuperJSON } from "@/lib/superjson";
import { columns, Employee } from "./columns";

export default async function EmployeesPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string }>;
}) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || "";

    const result = await getEmployees(page, 10, search);

    if (!result.success) {
        return (
            <div className="p-6">
                <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                    Error loading employees: {result.error}
                </div>
            </div>
        );
    }

    const { items: employees, totalPages, total } = (SuperJSON.deserialize(result.data) as { items: Employee[]; totalPages: number; total: number }) || { items: [], totalPages: 0, total: 0 };

    return (
        <PageListLayout>
            <PageListHeader>
                <PageListTitle title="Employees" />
                <PageListActions>
                    <Button asChild>
                        <Link href="/hr/employees/new">
                            <Plus className="mr-2 h-4 w-4" /> Add Employee
                        </Link>
                    </Button>
                </PageListActions>
            </PageListHeader>

            <PageListFilter>
                <div className="flex-1">
                    <form>
                        <Input
                            name="search"
                            placeholder="Search employees..."
                            defaultValue={search}
                            className="max-w-sm"
                        />
                    </form>
                </div>
            </PageListFilter>

            <PageListContent>
                <DataTable
                    columns={columns}
                    data={employees}
                    pagination={{
                        totalEntries: total,
                        pageSize: 10,
                        // Do not pass currentPage to use URL mode in CustomPagination
                    }}
                />
            </PageListContent>
        </PageListLayout>
    );
}
