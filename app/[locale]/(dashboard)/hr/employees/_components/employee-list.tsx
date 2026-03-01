"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    PageListLayout,
    PageListHeader,
    PageListTitle,
    PageListActions,
    PageListContent,
    PageListFilter,
} from "@/components/layout/page/list-layout";
import { Column, DataTable } from "@/components/ui/data-table";
import { getEmployees } from "../actions";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { Contact, EmployeeDetail } from "@/prisma/generated/prisma/client";

const DEFAULT_PAGE_SIZE = 10;

type Employee = Contact & {
    employeeDetail: EmployeeDetail | null;
};

interface EmployeeListResponse {
    items: Employee[];
    totalPages: number;
    total: number;
}

export function EmployeeList() {
    const t = useTranslations("HR");
    const tCommon = useTranslations("Common");
    const searchParams = useSearchParams();
    const router = useRouter();

    const page = Number(searchParams.get("page")) || 1;
    const search = searchParams.get("search") || "";

    const { data, isLoading } = useQuery({
        queryKey: ["employees", page, search],
        queryFn: async () => {
            const result = await getEmployees(page, DEFAULT_PAGE_SIZE, search);
            if (!result.success) {
                throw new Error(result.error);
            }
            return SuperJSON.deserialize<EmployeeListResponse>(
                result.data as SuperJSONResult
            );
        },
        staleTime: 0,
        refetchOnMount: true,
    });

    const handleSearch = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set("search", value);
        } else {
            params.delete("search");
        }
        params.delete("page");
        router.push(`?${params.toString()}`);
    };

    const columns: Column<Employee>[] = [
        {
            header: t("name"),
            cell: (item) => (
                <Link
                    href={`/hr/employees/${item.id}`}
                    className="font-medium hover:underline"
                >
                    {item.name}
                </Link>
            ),
        },
        {
            header: t("department"),
            cell: (item) => item.employeeDetail?.department || "-",
        },
        {
            header: t("job_title"),
            cell: (item) => item.employeeDetail?.jobTitle || "-",
        },
        {
            header: tCommon("status"),
            cell: (item) => (
                <Badge variant={item.isActive ? "default" : "secondary"}>
                    {item.isActive ? t("active") : t("inactive")}
                </Badge>
            ),
        },
        {
            header: t("email"),
            accessorKey: "email",
            cell: (item) => item.email || "-",
        },
        {
            header: tCommon("actions"),
            className: "text-right",
            cell: (item) => (
                <div className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/hr/employees/${item.id}`}>
                            {tCommon("view")}
                        </Link>
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PageListLayout>
            <PageListHeader>
                <PageListTitle title={t("employees")} />
                <PageListActions>
                    <Button asChild>
                        <Link href="/hr/employees/new">
                            <Plus className="h-4 w-4" /> {t("add_employee")}
                        </Link>
                    </Button>
                </PageListActions>
            </PageListHeader>
            <PageListFilter>
                <Input
                    placeholder={t("search_employees")}
                    defaultValue={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-[250px] me-2"
                />
            </PageListFilter>
            <PageListContent>
                {isLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                ) : (
                    <DataTable
                        columns={columns}
                        data={data?.items || []}
                        pagination={{
                            totalEntries: data?.total || 0,
                            pageSize: DEFAULT_PAGE_SIZE,
                            currentPage: page,
                        }}
                        emptyMessage={t("no_employees_found")}
                    />
                )}
            </PageListContent>
        </PageListLayout>
    );
}
