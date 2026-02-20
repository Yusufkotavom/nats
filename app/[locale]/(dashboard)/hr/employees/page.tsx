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
import { getColumns, Employee } from "./columns";
import { getTranslations } from "next-intl/server";

export default async function EmployeesPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string }>;
}) {
    const t = await getTranslations("HR");
    const tCommon = await getTranslations("Common");
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || "";

    const result = await getEmployees(page, 10, search);

    if (!result.success) {
        return (
            <div className="p-6">
                <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                    {tCommon("error")}: {result.error}
                </div>
            </div>
        );
    }

    const { items: employees, totalPages, total } = (SuperJSON.deserialize(result.data) as { items: Employee[]; totalPages: number; total: number }) || { items: [], totalPages: 0, total: 0 };

    const columns = getColumns(t, tCommon);

    return (
        <PageListLayout>
            <PageListHeader>
                <PageListTitle title={t("employees")} />
                <PageListActions>
                    <Button asChild>
                        <Link href="/hr/employees/new">
                            <Plus className="mr-2 h-4 w-4" /> {t("add_employee")}
                        </Link>
                    </Button>
                </PageListActions>
            </PageListHeader>

            <PageListFilter>
                <div className="flex-1">
                    <form>
                        <Input
                            name="search"
                            placeholder={t("search_employees")}
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
                    emptyMessage={t("no_employees_found")}
                />
            </PageListContent>
        </PageListLayout>
    );
}
